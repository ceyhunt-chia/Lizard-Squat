import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Allocation {
  label: string;
  percent: number;
  amount: string;
  lock: string;
  color: string;
}

const TOTAL_SUPPLY_LABEL = "201.420.142.014 ZARD";

const ALLOCATIONS: Allocation[] = [
  { label: "Staking Ödül Havuzu", percent: 30, amount: "~60,4 milyar", lock: "Kontrat içinde kilitli", color: "#10b981" },
  { label: "Likidite (DEX)", percent: 20, amount: "~40,3 milyar", lock: "LP kilidi, min. 12 ay", color: "#34d399" },
  { label: "Ekip & Kurucular", percent: 15, amount: "~30,2 milyar", lock: "6 ay cliff + 18 ay vesting", color: "#6ee7b7" },
  { label: "Ekosistem / Hazine", percent: 15, amount: "~30,2 milyar", lock: "Timelock'lu multisig", color: "#a7f3d0" },
  { label: "Pazarlama & Ortaklıklar", percent: 10, amount: "~20,1 milyar", lock: "Kademeli, KPI bağlı", color: "#facc15" },
  { label: "Topluluk / Airdrop", percent: 10, amount: "~20,1 milyar", lock: "Lansman teşviki", color: "#fbbf24" },
];

export function TokenomicsSection() {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Tokenomics</h2>
        <p className="text-sm text-neutral-400 mt-1">
          Toplam arz: <span className="text-white font-medium">{TOTAL_SUPPLY_LABEL}</span> · ek mint yapılmayacak
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-center">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ALLOCATIONS}
                dataKey="percent"
                nameKey="label"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                stroke="none"
              >
                {ALLOCATIONS.map((a) => (
                  <Cell key={a.label} fill={a.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#171717",
                  border: "1px solid #404040",
                  borderRadius: "8px",
                  color: "#fff",
                }}
                formatter={(value: number, _name: string, entry) => [
                  `${value}% · ${(entry.payload as Allocation).amount}`,
                  (entry.payload as Allocation).label,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {ALLOCATIONS.map((a) => (
            <div key={a.label} className="flex items-start gap-3">
              <span
                className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: a.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-sm">
                  <span className="text-white">{a.label}</span>
                  <span className="text-neutral-400">{a.percent}%</span>
                </div>
                <p className="text-xs text-neutral-500">{a.amount} · {a.lock}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
