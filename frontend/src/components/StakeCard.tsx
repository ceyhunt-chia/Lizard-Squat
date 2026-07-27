import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { ZARD_STAKING_POOL_ABI, ZARD_TOKEN_ADDRESS, STAKING_POOL_ADDRESS } from "../abi/ZardStakingPool";
import { ERC20_ABI } from "../abi/ERC20";

const TIER_LABELS = ["30 gün · 1.0x", "90 gün · 1.5x", "180 gün · 2.25x", "365 gün · 3.5x"];

export function StakeCard() {
  const { address, isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [tierId, setTierId] = useState(0);

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: ZARD_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, STAKING_POOL_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const { data: balance } = useReadContract({
    address: ZARD_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract();
  const { writeContract: stake, data: stakeHash, isPending: isStaking } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: stakeConfirmed } = useWaitForTransactionReceipt({ hash: stakeHash });

  useEffect(() => {
    if (approveConfirmed) refetchAllowance();
  }, [approveConfirmed, refetchAllowance]);

  const parsedAmount = amount ? parseUnits(amount, 18) : 0n;
  const needsApproval = allowance !== undefined && parsedAmount > 0n && (allowance as bigint) < parsedAmount;

  function handleApprove() {
    approve({
      address: ZARD_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [STAKING_POOL_ADDRESS, parsedAmount],
    });
  }

  function handleStake() {
    stake({
      address: STAKING_POOL_ADDRESS,
      abi: ZARD_STAKING_POOL_ABI,
      functionName: "stake",
      args: [parsedAmount, tierId],
    });
  }

  if (!isConnected) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-center text-neutral-400">
        Devam etmek için cüzdanını bağla.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-5">
      <div>
        <div className="flex justify-between text-sm text-neutral-400 mb-1">
          <span>Miktar (ZARD)</span>
          {balance !== undefined && (
            <span>Bakiye: {formatUnits(balance as bigint, 18)}</span>
          )}
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-4 py-3 text-white outline-none focus:border-emerald-500"
        />
      </div>

      <div>
        <div className="text-sm text-neutral-400 mb-2">Kilit süresi</div>
        <div className="grid grid-cols-2 gap-2">
          {TIER_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => setTierId(i)}
              className={`rounded-lg border px-3 py-2 text-sm transition ${
                tierId === i
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-neutral-700 text-neutral-300 hover:border-neutral-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {needsApproval ? (
        <button
          onClick={handleApprove}
          disabled={isApproving || parsedAmount === 0n}
          className="w-full rounded-lg bg-white text-black font-medium py-3 disabled:opacity-40"
        >
          {isApproving ? "Onaylanıyor..." : "Approve"}
        </button>
      ) : (
        <button
          onClick={handleStake}
          disabled={isStaking || parsedAmount === 0n}
          className="w-full rounded-lg bg-emerald-500 text-black font-medium py-3 disabled:opacity-40"
        >
          {isStaking ? "Stake ediliyor..." : "Stake Et"}
        </button>
      )}

      {stakeConfirmed && (
        <p className="text-sm text-emerald-400 text-center">Stake işlemi onaylandı ✓</p>
      )}
    </div>
  );
}
