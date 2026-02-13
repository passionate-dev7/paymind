import { ethers } from "ethers";
import { config } from "../config.js";
import { getWallet, getProvider, getAgentAddress } from "./wallet.js";

// PaymentLedger ABI — matches the Solidity contract
const PAYMENT_LEDGER_ABI = [
  "event PaymentLogged(address indexed agent, address indexed provider, uint256 amount, string serviceType, bytes32 txHash, uint256 timestamp)",
  "function logPayment(address provider, uint256 amount, string serviceType, bytes32 txHash) external",
  "function getPaymentsByAgent(address agent) external view returns (tuple(address agent, address provider, uint256 amount, string serviceType, bytes32 txHash, uint256 timestamp)[])",
  "function getAgentStats(address agent) external view returns (uint256 totalSpent, uint256 queryCount, uint256 firstPayment, uint256 lastPayment)",
  "function paymentCount() external view returns (uint256)",
];

export interface PaymentRecord {
  agent: string;
  provider: string;
  amount: string;
  serviceType: string;
  txHash: string;
  timestamp: number;
}

export interface AgentStats {
  totalSpent: string;
  queryCount: number;
  firstPayment: number;
  lastPayment: number;
}

// In-memory fallback ledger when no contract is deployed
const inMemoryLedger: PaymentRecord[] = [];
let inMemoryStats = {
  totalSpent: BigInt(0),
  queryCount: 0,
  firstPayment: 0,
  lastPayment: 0,
};

function hasContract(): boolean {
  return (
    !!config.contracts.paymentLedger &&
    config.contracts.paymentLedger !== "" &&
    config.contracts.paymentLedger !== "deployed_contract_address"
  );
}

function getContract(): ethers.Contract | null {
  if (!hasContract()) return null;
  try {
    const wallet = getWallet();
    return new ethers.Contract(
      config.contracts.paymentLedger,
      PAYMENT_LEDGER_ABI,
      wallet
    );
  } catch {
    return null;
  }
}

function getReadOnlyContract(): ethers.Contract | null {
  if (!hasContract()) return null;
  try {
    const provider = getProvider();
    return new ethers.Contract(
      config.contracts.paymentLedger,
      PAYMENT_LEDGER_ABI,
      provider
    );
  } catch {
    return null;
  }
}

/**
 * Log a payment to the PaymentLedger contract.
 * Falls back to in-memory ledger if contract is not deployed.
 */
export async function logPayment(
  provider: string,
  amount: string,
  serviceType: string,
  txHash: string
): Promise<{ success: boolean; onChain: boolean; txReceipt?: string }> {
  const contract = getContract();

  if (contract) {
    try {
      const tx = await contract.logPayment(
        provider,
        amount,
        serviceType,
        ethers.id(txHash) // convert to bytes32
      );
      const receipt = await tx.wait();
      console.log(
        `[Ledger] Payment logged on-chain: ${receipt.hash} | ${serviceType} | ${amount}`
      );
      return { success: true, onChain: true, txReceipt: receipt.hash };
    } catch (error) {
      console.error("[Ledger] On-chain log failed, falling back to memory:", error);
    }
  }

  // In-memory fallback
  const now = Math.floor(Date.now() / 1000);
  const record: PaymentRecord = {
    agent: getAgentAddress(),
    provider,
    amount,
    serviceType,
    txHash,
    timestamp: now,
  };
  inMemoryLedger.push(record);

  const amtBig = BigInt(amount);
  inMemoryStats.totalSpent += amtBig;
  inMemoryStats.queryCount += 1;
  if (inMemoryStats.firstPayment === 0) inMemoryStats.firstPayment = now;
  inMemoryStats.lastPayment = now;

  console.log(
    `[Ledger] Payment logged in-memory: ${serviceType} | ${amount} wei`
  );
  return { success: true, onChain: false };
}

/**
 * Get all payments by the agent.
 */
export async function getPaymentsByAgent(
  agentAddress?: string
): Promise<PaymentRecord[]> {
  const addr = agentAddress || getAgentAddress();
  const contract = getReadOnlyContract();

  if (contract) {
    try {
      const payments = await contract.getPaymentsByAgent(addr);
      return payments.map((p: any) => ({
        agent: p.agent,
        provider: p.provider,
        amount: p.amount.toString(),
        serviceType: p.serviceType,
        txHash: p.txHash,
        timestamp: Number(p.timestamp),
      }));
    } catch (error) {
      console.error("[Ledger] On-chain read failed, using in-memory:", error);
    }
  }

  // Return in-memory records filtered by agent
  return inMemoryLedger.filter(
    (r) => r.agent.toLowerCase() === addr.toLowerCase()
  );
}

/**
 * Get aggregate stats for the agent.
 */
export async function getAgentStats(
  agentAddress?: string
): Promise<AgentStats> {
  const addr = agentAddress || getAgentAddress();
  const contract = getReadOnlyContract();

  if (contract) {
    try {
      const stats = await contract.getAgentStats(addr);
      return {
        totalSpent: stats.totalSpent.toString(),
        queryCount: Number(stats.queryCount),
        firstPayment: Number(stats.firstPayment),
        lastPayment: Number(stats.lastPayment),
      };
    } catch (error) {
      console.error("[Ledger] On-chain stats failed, using in-memory:", error);
    }
  }

  return {
    totalSpent: inMemoryStats.totalSpent.toString(),
    queryCount: inMemoryStats.queryCount,
    firstPayment: inMemoryStats.firstPayment,
    lastPayment: inMemoryStats.lastPayment,
  };
}
