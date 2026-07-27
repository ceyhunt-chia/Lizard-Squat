import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, ConnectButton, darkTheme } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "./lib/wagmi";
import { StakeCard } from "./components/StakeCard";
import { StakeDashboard } from "./components/StakeDashboard";
import { TokenomicsSection } from "./components/TokenomicsSection";
import { LiveSupplyStats } from "./components/LiveSupplyStats";

const queryClient = new QueryClient();

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "#10b981" })}>
          <div className="min-h-screen bg-neutral-950 text-white">
            <header className="flex justify-between items-center px-6 py-5 border-b border-neutral-900">
              <h1 className="text-lg font-semibold tracking-tight">ZARD Stake</h1>
              <ConnectButton />
            </header>

            <main className="max-w-md mx-auto px-6 py-10 space-y-6">
              <LiveSupplyStats />
              <StakeDashboard />
              <StakeCard />
              <TokenomicsSection />
            </main>
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
