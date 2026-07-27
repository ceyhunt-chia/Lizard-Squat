import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { ZARD_STAKING_POOL_ABI, STAKING_POOL_ADDRESS } from "../abi/ZardStakingPool";

export function StakeDashboard() {
  const { address, isConnected } = useAccount();

  const { data: stakeInfo, refetch: refetchStake } = useReadContract({
    address: STAKING_POOL_ADDRESS,
    abi: ZARD_STAKING_POOL_ABI,
    functionName: "stakes",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: pending, refetch: refetchPending } = useReadContract({
    address: STAKING_POOL_ADDRESS,
    abi: ZARD_STAKING_POOL_ABI,
    functionName: "pendingReward",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 }, // 15sn'de bir güncelle
  });

  const { writeContract: claim, data: claimHash, isPending: isClaiming } = useWriteContract();
  const { writeContract: unstake, data: unstakeHash, isPending: isUnstaking } = useWriteContract();

  const { isSuccess: claimConfirmed } = useWaitForTransactionReceipt({ hash: claimHash });
  const { isSuccess: unstakeConfirmed } = useWaitForTransactionReceipt({ hash: unstakeHash });

  if (claimConfirmed) { refetchPending(); }
  if (unstakeConfirmed) { refetchStake(); refetchPending(); }

  if (!isConnected) return null;

  const info = stakeInfo as
    | readonly [bigint, number, bigint, bigint, bigint, bigint]
    | undefined;
  const hasStake = info && info[0] > 0n;

  if (!hasStake) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-neutral-400 text-sm">
        Henüz aktif bir stake pozisyonun yok.
      </div>
    );
  }

  const [amount, , , unlockAt] = info!;
  const unlockDate = new Date(Number(unlockAt) * 1000);
  const isUnlocked = Date.now() >= unlockDate.getTime();

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-neutral-400 text-sm">Stake Edilen</span>
        <span className="text-white font-medium">{formatUnits(amount, 18)} ZARD</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-neutral-400 text-sm">Kilit Bitiş</span>
        <span className={isUnlocked ? "text-emerald-400" : "text-white"}>
          {unlockDate.toLocaleDateString("tr-TR")} {isUnlocked && "· açık"}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-neutral-400 text-sm">Biriken Ödül</span>
        <span className="text-emerald-400 font-medium">
          {pending !== undefined ? formatUnits(pending as bigint, 18) : "..."} ZARD
        </span>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={() =>
            claim({
              address: STAKING_POOL_ADDRESS,
              abi: ZARD_STAKING_POOL_ABI,
              functionName: "claimReward",
            })
          }
          disabled={isClaiming}
          className="flex-1 rounded-lg bg-emerald-500 text-black font-medium py-2.5 disabled:opacity-40"
        >
          {isClaiming ? "Claim ediliyor..." : "Ödülü Claim Et"}
        </button>
        <button
          onClick={() =>
            unstake({
              address: STAKING_POOL_ADDRESS,
              abi: ZARD_STAKING_POOL_ABI,
              functionName: "unstake",
            })
          }
          disabled={isUnstaking}
          className="flex-1 rounded-lg border border-neutral-700 text-white font-medium py-2.5 disabled:opacity-40"
        >
          {isUnstaking
            ? "İşleniyor..."
            : isUnlocked
            ? "Unstake Et"
            : "Erken Unstake (cezalı)"}
        </button>
      </div>
      {!isUnlocked && (
        <p className="text-xs text-amber-500/80 text-center">
          Kilit süresi dolmadan çıkarsan biriken ödülünden ceza kesilir. Anaparan her zaman güvende.
        </p>
      )}
    </div>
  );
}
