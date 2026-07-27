// Kontrat derlendikten sonra Remix/Hardhat çıktısındaki tam ABI ile değiştirilmeli.
// Burada frontend'in ihtiyaç duyduğu temel fonksiyonlar/eventler listelendi.
export const ZARD_STAKING_POOL_ABI = [
  {
    type: "function",
    name: "stake",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "tierId", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "unstake",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "claimReward",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "pendingReward",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "stakes",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "tierId", type: "uint8" },
      { name: "stakedAt", type: "uint256" },
      { name: "unlockAt", type: "uint256" },
      { name: "lastCheckpoint", type: "uint256" },
      { name: "accruedRewards", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getTiers",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { name: "lockPeriod", type: "uint256" },
          { name: "multiplierBps", type: "uint256" },
          { name: "earlyPenaltyBps", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "totalStaked",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ZARD deploy edildikten sonra buraya adres girilecek
export const ZARD_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
export const STAKING_POOL_ADDRESS = "0x0000000000000000000000000000000000000000" as const;
