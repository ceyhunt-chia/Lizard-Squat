import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { ERC20_ABI } from "../abi/ERC20";
import { ZARD_STAKING_POOL_ABI, ZARD_TOKEN_ADDRESS, STAKING_POOL_ADDRESS } from "../abi/ZardStakingPool";

function formatCompact(value: bigint, decimals = 18) {
  const num = Number(formatUnits(value, decimals));
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  return num.toLocaleString("tr-TR");
}

export function LiveSupplyStats() {
  const { data: totalSupply } = useReadContract({
    address: ZARD_TOKEN_ADDRESS,
    abi: ERC20_ABI,
    functionName: "totalSupply",
    query: { refetchInterval: 30_000 },
  });

  const { data: totalStaked } = useReadContract({
    address: STAKING_POOL_ADDRESS,
    abi: ZARD_STAKING_POOL_ABI,
    functionName: "totalStaked",
    query: { refetchInterval: 30_000 },
  });

  const supply = totalSupply as bigint | undefined;
  const staked = totalStaked as bigint | undefined;
  const stakedPercent = supply && staked && supply > 0n
    ? Number((staked * 10000n) / supply) / 100
    : null;

  const stats = [
    { label: "Toplam Arz", value: supply !== undefined ? formatCompact(supply) : "..." },
    { label: "Stake'te Kilitli", value: staked !== undefined ? formatCompact(staked) : "..." },
    { label: "Kilitli Arz Oranı", value: stakedPercent !== null ? `%${stakedPercent.toFixed(1)}` : "..." },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-center">
          <p className="text-xs text-neutral-500 mb-1">{s.label}</p>
          <p className="text-lg font-semibold text-emerald-400">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
