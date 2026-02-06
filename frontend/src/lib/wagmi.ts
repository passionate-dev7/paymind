import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bsc } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'PayMind',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'paymind-dev',
  chains: [bsc],
  ssr: true,
});
