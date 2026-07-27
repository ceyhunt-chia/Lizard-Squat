// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title ZardStakingPool
/// @notice Kilit süresine göre kademeli ödül veren, sabit havuzdan beslenen staking kontratı.
/// @dev Güvenlik prensipleri:
///      - Checks-Effects-Interactions: state her zaman external call'dan önce güncellenir
///      - ReentrancyGuard: tüm para hareketi içeren fonksiyonlarda
///      - SafeERC20: transfer/transferFrom yerine safe varyantlar
///      - Pausable: SADECE stake ve claim durdurulabilir, unstake ASLA durdurulamaz
///      - Ownable2Step + Timelock: kritik parametre değişiklikleri 2 adımlı ve gecikmeli
///      - Ayrı ödül havuzu: anapara ile ödül havuzu aynı bakiyede karışmaz (accounting ayrı tutulur)
contract ZardStakingPool is ReentrancyGuard, Pausable, Ownable2Step {
    using SafeERC20 for IERC20;

    IERC20 public immutable stakingToken; // ZARD

    uint256 public constant PRECISION = 1e18;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant RATE_CHANGE_DELAY = 48 hours;
    uint256 public constant MAX_BASE_RATE = 5_000; // yıllık %50 taban APY tavanı (güvenlik limiti)

    struct Tier {
        uint256 lockPeriod;       // saniye
        uint256 multiplierBps;    // 10000 = 1x
        uint256 earlyPenaltyBps;  // erken çıkış cezası, ödül üzerinden
        bool active;
    }

    struct StakeInfo {
        uint256 amount;
        uint8 tierId;
        uint256 stakedAt;
        uint256 unlockAt;
        uint256 lastCheckpoint;
        uint256 accruedRewards;
    }

    Tier[] public tiers;
    mapping(address => StakeInfo) public stakes;

    uint256 public baseRewardRateBps; // yıllık, bps cinsinden (örn. 1000 = %10 baz APY)
    uint256 public totalStaked;
    uint256 public rewardPoolBalance;  // sadece dağıtılabilir ödül bakiyesi (anaparadan ayrı sayaç)

    // Timelock ile parametre değişimi
    uint256 public pendingBaseRate;
    uint256 public pendingRateEffectiveAt;

    // Global maksimum kilitli tutar (lansman sonrası kaldırılabilir)
    uint256 public maxTotalStaked;

    event Staked(address indexed user, uint256 amount, uint8 tierId, uint256 unlockAt);
    event Unstaked(address indexed user, uint256 amount, uint256 rewardPaid, uint256 penaltyApplied, bool early);
    event RewardClaimed(address indexed user, uint256 amount);
    event RewardPoolFunded(address indexed from, uint256 amount);
    event RateChangeProposed(uint256 newRate, uint256 effectiveAt);
    event RateChangeApplied(uint256 newRate);
    event TierAdded(uint8 tierId, uint256 lockPeriod, uint256 multiplierBps, uint256 penaltyBps);
    event MaxTotalStakedUpdated(uint256 newMax);

    constructor(address _stakingToken, uint256 _baseRewardRateBps, uint256 _maxTotalStaked)
        Ownable2Step()
    {
        require(_stakingToken != address(0), "invalid token");
        require(_baseRewardRateBps <= MAX_BASE_RATE, "rate too high");
        stakingToken = IERC20(_stakingToken);
        baseRewardRateBps = _baseRewardRateBps;
        maxTotalStaked = _maxTotalStaked;

        // Varsayılan tier'lar: 30 / 90 / 180 / 365 gün
        tiers.push(Tier(30 days, 10_000, 1_000, true));  // 1.0x, %10 ceza
        tiers.push(Tier(90 days, 15_000, 1_500, true));  // 1.5x, %15 ceza
        tiers.push(Tier(180 days, 22_500, 2_000, true)); // 2.25x, %20 ceza
        tiers.push(Tier(365 days, 35_000, 2_500, true)); // 3.5x, %25 ceza
    }

    // ---------------------------------------------------------------------
    // KULLANICI FONKSİYONLARI
    // ---------------------------------------------------------------------

    function stake(uint256 amount, uint8 tierId) external nonReentrant whenNotPaused {
        require(amount > 0, "amount=0");
        require(tierId < tiers.length && tiers[tierId].active, "invalid tier");
        require(stakes[msg.sender].amount == 0, "already staking: unstake first");
        require(totalStaked + amount <= maxTotalStaked, "pool cap reached");

        Tier memory t = tiers[tierId];

        // Effects (state güncellemesi transfer'den önce)
        stakes[msg.sender] = StakeInfo({
            amount: amount,
            tierId: tierId,
            stakedAt: block.timestamp,
            unlockAt: block.timestamp + t.lockPeriod,
            lastCheckpoint: block.timestamp,
            accruedRewards: 0
        });
        totalStaked += amount;

        // Interaction
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(msg.sender, amount, tierId, block.timestamp + t.lockPeriod);
    }

    function claimReward() external nonReentrant whenNotPaused {
        _updateReward(msg.sender);
        StakeInfo storage s = stakes[msg.sender];
        uint256 reward = s.accruedRewards;
        require(reward > 0, "no reward");
        require(reward <= rewardPoolBalance, "reward pool insufficient");

        // Effects
        s.accruedRewards = 0;
        rewardPoolBalance -= reward;

        // Interaction
        stakingToken.safeTransfer(msg.sender, reward);

        emit RewardClaimed(msg.sender, reward);
    }

    /// @notice Unstake ASLA pause'lanamaz — kullanıcının anaparasına erişimi her zaman garanti.
    function unstake() external nonReentrant {
        StakeInfo storage s = stakes[msg.sender];
        require(s.amount > 0, "no active stake");

        _updateReward(msg.sender);

        uint256 principal = s.amount;
        uint256 reward = s.accruedRewards;
        bool early = block.timestamp < s.unlockAt;
        uint256 penalty = 0;

        if (early) {
            Tier memory t = tiers[s.tierId];
            penalty = (reward * t.earlyPenaltyBps) / BPS_DENOMINATOR;
            reward -= penalty;
        }

        // Effects
        totalStaked -= principal;
        delete stakes[msg.sender];
        if (reward > rewardPoolBalance) {
            reward = rewardPoolBalance; // güvenlik: havuzda yetersiz bakiye varsa taşırma yapma
        }
        rewardPoolBalance -= reward;
        // Ceza tutarı havuzda kalır (diğer stakerlara pay edilir), ekstra muhasebe gerekmez.

        // Interactions
        stakingToken.safeTransfer(msg.sender, principal);
        if (reward > 0) {
            stakingToken.safeTransfer(msg.sender, reward);
        }

        emit Unstaked(msg.sender, principal, reward, penalty, early);
    }

    // ---------------------------------------------------------------------
    // GÖRÜNTÜLEME (VIEW) FONKSİYONLARI
    // ---------------------------------------------------------------------

    function pendingReward(address user) external view returns (uint256) {
        StakeInfo memory s = stakes[user];
        if (s.amount == 0) return s.accruedRewards;

        Tier memory t = tiers[s.tierId];
        uint256 timeElapsed = block.timestamp - s.lastCheckpoint;
        uint256 reward = (s.amount * baseRewardRateBps * timeElapsed * t.multiplierBps)
            / (365 days * BPS_DENOMINATOR * BPS_DENOMINATOR);

        return s.accruedRewards + reward;
    }

    function getTiers() external view returns (Tier[] memory) {
        return tiers;
    }

    // ---------------------------------------------------------------------
    // İÇ FONKSİYONLAR
    // ---------------------------------------------------------------------

    function _updateReward(address user) internal {
        StakeInfo storage s = stakes[user];
        if (s.amount == 0) return;

        Tier memory t = tiers[s.tierId];
        uint256 timeElapsed = block.timestamp - s.lastCheckpoint;
        uint256 reward = (s.amount * baseRewardRateBps * timeElapsed * t.multiplierBps)
            / (365 days * BPS_DENOMINATOR * BPS_DENOMINATOR);

        s.accruedRewards += reward;
        s.lastCheckpoint = block.timestamp;
    }

    // ---------------------------------------------------------------------
    // ADMİN FONKSİYONLARI (owner -> önerilen: Gnosis Safe multisig)
    // ---------------------------------------------------------------------

    /// @notice Ödül havuzunu besler. Anapara muhasebesinden tamamen ayrı tutulur.
    function fundRewardPool(uint256 amount) external {
        require(amount > 0, "amount=0");
        rewardPoolBalance += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardPoolFunded(msg.sender, amount);
    }

    /// @notice Yeni oran talebi — hemen uygulanmaz, RATE_CHANGE_DELAY sonra applyRateChange ile aktif olur.
    function proposeRateChange(uint256 newRateBps) external onlyOwner {
        require(newRateBps <= MAX_BASE_RATE, "rate too high");
        pendingBaseRate = newRateBps;
        pendingRateEffectiveAt = block.timestamp + RATE_CHANGE_DELAY;
        emit RateChangeProposed(newRateBps, pendingRateEffectiveAt);
    }

    function applyRateChange() external {
        require(pendingRateEffectiveAt != 0 && block.timestamp >= pendingRateEffectiveAt, "not ready");
        baseRewardRateBps = pendingBaseRate;
        pendingRateEffectiveAt = 0;
        emit RateChangeApplied(baseRewardRateBps);
    }

    function addTier(uint256 lockPeriod, uint256 multiplierBps, uint256 penaltyBps) external onlyOwner {
        require(penaltyBps <= BPS_DENOMINATOR, "penalty>100%");
        tiers.push(Tier(lockPeriod, multiplierBps, penaltyBps, true));
        emit TierAdded(uint8(tiers.length - 1), lockPeriod, multiplierBps, penaltyBps);
    }

    function setTierActive(uint8 tierId, bool active) external onlyOwner {
        require(tierId < tiers.length, "invalid tier");
        tiers[tierId].active = active;
    }

    function setMaxTotalStaked(uint256 newMax) external onlyOwner {
        maxTotalStaked = newMax;
        emit MaxTotalStakedUpdated(newMax);
    }

    /// @notice Sadece stake ve claim durur. Kullanıcılar her zaman unstake edebilir.
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
