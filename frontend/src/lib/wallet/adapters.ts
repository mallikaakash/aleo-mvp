import {
  LeoWalletAdapter,
  LeoWalletName,
  PuzzleWalletAdapter,
  PuzzleWalletName,
} from "aleo-adapters";
import { WalletAdapterNetwork } from "aleo-hooks";

export const SUPPORTED_WALLETS = [
  { name: PuzzleWalletName, label: "Puzzle Wallet" },
  { name: LeoWalletName, label: "Leo Wallet" },
] as const;

export const WALLET_NETWORK = WalletAdapterNetwork.Testnet;

export const createWalletAdapters = () => [
  new PuzzleWalletAdapter({
    appName: "Aleo Flash Markets",
    appDescription: "Private flash prediction rounds on Aleo",
    appIconUrl: "/favicon.ico",
    programIdPermissions: {
      testnetbeta: ["flash_markets.aleo"],
      mainnetbeta: [],
    },
  }),
  new LeoWalletAdapter({
    appName: "Aleo Flash Markets",
  }),
];
