import { ethers } from "ethers";
import { config } from "../config.js";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

let providerInstance: ethers.JsonRpcProvider | null = null;
let walletInstance: ethers.Wallet | null = null;

/**
 * Get BSC JSON-RPC provider (singleton).
 */
export function getProvider(): ethers.JsonRpcProvider {
  if (!providerInstance) {
    providerInstance = new ethers.JsonRpcProvider(config.bsc.rpcUrl, {
      name: config.bsc.chainName,
      chainId: config.bsc.chainId,
    });
  }
  return providerInstance;
}

/**
 * Get agent wallet connected to BSC provider.
 */
export function getWallet(): ethers.Wallet {
  if (!walletInstance) {
    if (!config.wallet.privateKey) {
      throw new Error(
        "PRIVATE_KEY not set in environment. Agent wallet unavailable."
      );
    }
    const provider = getProvider();
    walletInstance = new ethers.Wallet(config.wallet.privateKey, provider);
  }
  return walletInstance;
}

/**
 * Get the agent wallet address (returns zero address if no key configured).
 */
export function getAgentAddress(): string {
  if (!config.wallet.privateKey) {
    return ethers.ZeroAddress;
  }
  return getWallet().address;
}

/**
 * Get BNB balance of the agent wallet.
 */
export async function getBnbBalance(): Promise<string> {
  try {
    const wallet = getWallet();
    const balance = await wallet.provider!.getBalance(wallet.address);
    return ethers.formatEther(balance);
  } catch (error) {
    console.error("Failed to get BNB balance:", error);
    return "0";
  }
}

/**
 * Get USDT balance of the agent wallet on BSC.
 */
export async function getUsdtBalance(): Promise<string> {
  try {
    const wallet = getWallet();
    const usdt = new ethers.Contract(config.contracts.usdt, ERC20_ABI, wallet);
    const balance = await usdt.balanceOf(wallet.address);
    const decimals = await usdt.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    console.error("Failed to get USDT balance:", error);
    return "0";
  }
}

/**
 * Get all balances for the agent wallet.
 */
export async function getAgentBalances(): Promise<{
  address: string;
  bnb: string;
  usdt: string;
}> {
  const address = getAgentAddress();
  if (address === ethers.ZeroAddress) {
    return { address, bnb: "0", usdt: "0" };
  }

  const [bnb, usdt] = await Promise.all([getBnbBalance(), getUsdtBalance()]);
  return { address, bnb, usdt };
}

/**
 * Sign an arbitrary message with the agent wallet.
 */
export async function signMessage(message: string): Promise<string> {
  const wallet = getWallet();
  return wallet.signMessage(message);
}

/**
 * Sign typed data for x402 payment authorization.
 */
export async function signPaymentAuthorization(params: {
  to: string;
  amount: string;
  resource: string;
  nonce: number;
  expiry: number;
}): Promise<string> {
  const wallet = getWallet();

  const domain = {
    name: "PayMind-x402",
    version: "1",
    chainId: config.bsc.chainId,
  };

  const types = {
    PaymentAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "resource", type: "string" },
      { name: "nonce", type: "uint256" },
      { name: "expiry", type: "uint256" },
    ],
  };

  const value = {
    from: wallet.address,
    to: params.to,
    amount: params.amount,
    resource: params.resource,
    nonce: params.nonce,
    expiry: params.expiry,
  };

  return wallet.signTypedData(domain, types, value);
}
