export const PAYMENT_LEDGER_ADDRESS =
  (process.env.NEXT_PUBLIC_PAYMENT_LEDGER_ADDRESS as `0x${string}`) ||
  '0x0000000000000000000000000000000000000000';

export const AGENT_REGISTRY_ADDRESS =
  (process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS as `0x${string}`) ||
  '0x0000000000000000000000000000000000000000';

export const PAYMENT_LEDGER_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'agent', type: 'address' }],
    name: 'getPaymentsByAgent',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'agent', type: 'address' },
          { internalType: 'string', name: 'dataSource', type: 'string' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'string', name: 'queryType', type: 'string' },
          { internalType: 'bytes32', name: 'txHash', type: 'bytes32' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        internalType: 'struct PaymentLedger.Payment[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'agent', type: 'address' }],
    name: 'getAgentStats',
    outputs: [
      { internalType: 'uint256', name: 'totalSpent', type: 'uint256' },
      { internalType: 'uint256', name: 'totalQueries', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalPayments',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;
