import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { robinhoodTestnet, robinhoodMainnet } from "./chain";

// walletConnectProjectId: WalletConnect Cloud'dan ücretsiz alınır (cloud.walletconnect.com)
// Şimdilik testnet aşamasında olduğumuz için sadece testnet ağı listelendi.
export const wagmiConfig = getDefaultConfig({
  appName: "ZARD Stake",
  projectId: "REPLACE_WITH_WALLETCONNECT_PROJECT_ID",
  chains: [robinhoodTestnet, robinhoodMainnet],
  ssr: false,
});
