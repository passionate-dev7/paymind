# PayMind

> **AI that pays for its own intelligence — autonomously, on-chain, every query.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![BNB Smart Chain](https://img.shields.io/badge/chain-BNB%20Smart%20Chain-F0B90B?logo=binance&logoColor=white)
![Solidity](https://img.shields.io/badge/solidity-0.8.24-363636?logo=solidity)
![TypeScript](https://img.shields.io/badge/backend-TypeScript-3178C6?logo=typescript)
![Next.js](https://img.shields.io/badge/frontend-Next.js-000000?logo=nextdotjs)
![Built with AI](https://img.shields.io/badge/built%20with-Claude%20Code%20%28Opus%204.6%29-8A2BE2)
![Good Vibes Only](https://img.shields.io/badge/Good%20Vibes%20Only-OpenClaw%20Edition-FF6B6B)

---

## Problem

Blockchain intelligence — token security scans, live price feeds, whale movement detection - is fragmented across a dozen APIs, each requiring manual billing, API keys, and human oversight. AI agents that need this data in real time cannot independently pay for it; they depend on human-managed subscriptions that break, expire, and leak costs silently.

There is no native way for an AI agent to autonomously discover, pay for, and consume on-chain data services in a trust-minimized, auditable, budget-enforced manner.

## Solution

PayMind is an AI agent that uses AEON's x402 payment protocol on BNB Smart Chain to autonomously purchase blockchain intelligence with per-query micropayments. Every data fetch — a GoPlus security scan, a DexScreener price check, a whale alert - costs a precise micro-amount of USDT, signed by the agent's wallet, logged immutably on-chain, and governed by a smart-contract daily budget that the agent cannot exceed without the owner's intervention.

The agent thinks, decides what data it needs, pays for it, verifies the receipt hash on-chain, and returns a structured intelligence report all without a human in the loop.

---

## Architecture

```
 User / Frontend (Next.js)
        |
        | HTTP POST /analyze?token=0x...
        v
 +--------------------------+
 |   PayMind Backend        |
 |   (Hono + TypeScript)    |
 |                          |
 |  [Claude AI Agent]       |
 |   - Decides which APIs   |
 |     to query             |
 |   - Builds tool calls    |
 +---+----------+-----------+
     |          |
     |  x402    |  x402
     v          v
 +--------+  +-------------+
 | GoPlus |  | DexScreener |
 | (BSC   |  | (Price +    |
 |  sec.) |  |  liquidity) |
 +--------+  +-------------+
     |          |
     +----+-----+
          |
          | logPayment()
          v
 +------------------------------+
 |  PaymentLedger.sol  (BSC)    |
 |  - Records every payment     |
 |  - Verifies data hash        |
 |  - Calls AgentRegistry for   |
 |    budget enforcement        |
 +------------------------------+
          |
          | canSpend() / recordSpend()
          v
 +------------------------------+
 |  AgentRegistry.sol  (BSC)   |
 |  - Stores agent daily budget |
 |  - Auto-resets each UTC day  |
 |  - Active / inactive toggle  |
 +------------------------------+
```

---

## Screenshots

> _Screenshots will be added after the live demo is recorded._

| Dashboard | Payment Feed | Agent Stats |
|-----------|-------------|-------------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Payments](docs/screenshots/payments.png) | ![Stats](docs/screenshots/stats.png) |

---

## How It Works

1. **User submits a token address** via the frontend or REST API (`POST /analyze`).
2. **Claude (Opus 4.6) decides** which data sources to query based on the request — GoPlus for security, DexScreener for price and liquidity, BSCScan for contract metadata.
3. **Before each API call**, the agent signs an EIP-712 payment authorization for the exact micro-amount defined by the x402 cost schedule (e.g., 0.0001 USDT for a security scan).
4. **The x402 payment header** is attached to the outgoing API request. The data provider verifies the signed payment and returns the intelligence payload.
5. **Upon receiving the response**, the backend computes a `keccak256` hash of the returned data for integrity verification.
6. **`logPayment()` is called** on the `PaymentLedger` smart contract on BSC, recording the agent address, data source, amount, data hash, and query type immutably on-chain.
7. **`PaymentLedger` calls `AgentRegistry.canSpend()`** before recording — if the agent has hit its daily budget, the transaction reverts and no payment is logged.
8. **Claude synthesizes** all fetched data into a structured intelligence report with risk ratings, price analysis, and recommendations.
9. **The frontend displays** the report alongside a live on-chain payment feed showing every micropayment the agent made to produce it.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| AI Agent | Claude Opus 4.6 (`@anthropic-ai/sdk`) | Autonomous decision-making, tool use, report synthesis |
| Payment Protocol | AEON x402 | Per-query micropayment authorization on BNB Smart Chain |
| Smart Contracts | Solidity 0.8.24, Hardhat 3 | PaymentLedger + AgentRegistry on BSC |
| Backend | Hono + TypeScript, Node.js | REST API, agent orchestration |
| Blockchain Client | ethers.js v6 | Wallet signing, contract calls, EIP-712 typed data |
| Frontend | Next.js 15, Tailwind CSS | Dashboard, real-time payment feed |
| Security Data | GoPlus Security API | Honeypot detection, tax analysis, ownership risk |
| Price Data | DexScreener API | Live price, volume, liquidity across BSC DEXes |
| On-chain Data | BSCScan API | Contract verification, transaction history |
| Chain | BNB Smart Chain (chainId 56) | Low-fee, high-throughput EVM settlement layer |
| Package Manager | Bun / npm | Fast installs across monorepo workspaces |

---

## Quick Start

### Prerequisites

- Node.js 20+ or Bun 1.1+
- A BSC wallet with a small amount of BNB (for gas) and USDT (for micropayments)
- API keys: Anthropic, BSCScan

### 1. Install Dependencies

```bash
# Root (Hardhat contracts)
npm install

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

Or with Bun:

```bash
bun install && cd backend && bun install && cd ../frontend && bun install && cd ..
```

### 2. Configure Environment

Create `.env` in the project root (for contract deployment):

```env
PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org/
BSCSCAN_API_KEY=your_bscscan_api_key
```

Create `backend/.env` for the agent:

```env
# BSC
PRIVATE_KEY=0xYOUR_WALLET_PRIVATE_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org/

# Contracts (fill after deployment)
PAYMENT_LEDGER_ADDRESS=
AGENT_REGISTRY_ADDRESS=

# APIs
BSCSCAN_API_KEY=your_bscscan_api_key
ANTHROPIC_API_KEY=sk-ant-your_key_here

# Server
PORT=4021
```

### 3. Deploy Smart Contracts to BSC

```bash
# Deploy to BSC Mainnet
npx hardhat run scripts/deploy.js --network bscMainnet

# Or testnet first
npx hardhat run scripts/deploy.js --network bscTestnet
```

Deployed addresses are saved to `deployed-addresses.json`. Copy `agentRegistry` and `paymentLedger` values into `backend/.env`.

### 4. Register Your Agent

After deployment, register the agent wallet with a daily budget:

```bash
# Example: register with a 0.01 USDT daily budget
# Call AgentRegistry.registerAgent("PayMind-Agent-v1", 10000000000000000)
# via BSCScan write tab or a helper script
```

### 5. Run the Backend

```bash
cd backend
npm run dev
# Server starts at http://localhost:4021
```

### 6. Run the Frontend

```bash
cd frontend
npm run dev
# Dashboard at http://localhost:3000
```

---

## Smart Contract Addresses

See [`bsc.address`](./bsc.address) for the latest deployed addresses.

| Contract | BSC Mainnet | BSCScan |
|----------|-------------|---------|
| `AgentRegistry` | TBD | [View](https://bscscan.com/address/TBD) |
| `PaymentLedger` | TBD | [View](https://bscscan.com/address/TBD) |
| Agent Wallet | TBD | [View](https://bscscan.com/address/TBD) |

---

## x402 Payment Flow

The x402 protocol is a proposed HTTP extension (analogous to HTTP 402 "Payment Required") that allows AI agents and machines to attach cryptographic micropayment authorizations to API requests.

```
Agent                         Data Provider (GoPlus / DexScreener)
  |                                    |
  |-- GET /token_security/56?addr=0x.. |
  |                                    |
  |<-- 402 Payment Required -----------|
  |    x402-price: 100000000000000     |
  |    x402-token: USDT (BSC)          |
  |    x402-recipient: 0xProvider...   |
  |                                    |
  |  [Agent signs EIP-712 payment]     |
  |                                    |
  |-- GET /token_security/56?addr=0x.. |
  |   x402-payment: <signed-auth>      |
  |                                    |
  |<-- 200 OK + data payload ----------|
  |                                    |
  |  [Agent hashes payload]            |
  |  [Calls PaymentLedger.logPayment]  |
  |                                    |
  v                                    v
  BSC: PaymentLogged event emitted
```

**Payment amounts (USDT wei, 18 decimals):**

| Query Type | Cost |
|-----------|------|
| Security scan (GoPlus) | 100,000,000,000,000 (0.0001 USDT) |
| Price feed (DexScreener) | 50,000,000,000,000 (0.00005 USDT) |
| Whale / tx alert | 200,000,000,000,000 (0.0002 USDT) |
| Sentiment query | 50,000,000,000,000 (0.00005 USDT) |

---

## API Endpoints

All endpoints served at `http://localhost:4021`.

### `POST /analyze`

Run a full AI-powered token analysis with automatic micropayments.

**Request:**
```json
{
  "tokenAddress": "0x55d398326f99059fF775485246999027B3197955",
  "queryTypes": ["security", "price", "liquidity"]
}
```

**Response:**
```json
{
  "token": "0x55d398326f99059fF775485246999027B3197955",
  "report": {
    "riskLevel": "low",
    "summary": "...",
    "security": { ... },
    "price": { ... }
  },
  "payments": [
    {
      "dataSource": "goplus",
      "amount": "100000000000000",
      "queryType": "security",
      "onChain": true,
      "txHash": "0x..."
    }
  ],
  "totalCost": "150000000000000"
}
```

### `GET /payments`

Retrieve on-chain payment history for the agent wallet.

**Query params:** `?agent=0x...` (optional, defaults to configured agent)

**Response:**
```json
{
  "payments": [ ... ],
  "stats": {
    "totalSpent": "450000000000000",
    "queryCount": 9,
    "firstPayment": 1708300000,
    "lastPayment": 1708386400
  }
}
```

### `GET /agent`

Get current agent wallet address, BNB balance, and USDT balance.

**Response:**
```json
{
  "address": "0xAgent...",
  "bnb": "0.05",
  "usdt": "1.25",
  "registered": true,
  "dailyBudget": "10000000000000000",
  "spentToday": "450000000000000"
}
```

### `GET /health`

Service health check.

**Response:**
```json
{
  "status": "ok",
  "chain": "BNB Smart Chain",
  "chainId": 56,
  "contracts": {
    "paymentLedger": "0x...",
    "agentRegistry": "0x..."
  }
}
```

---

## Project Structure

```
paymind/
├── contracts/
│   ├── AgentRegistry.sol          # Agent registration + daily budget enforcement
│   └── PaymentLedger.sol          # Immutable on-chain payment log
├── scripts/
│   └── deploy.js                  # Hardhat deploy: AgentRegistry -> PaymentLedger -> link
├── test/                          # Hardhat contract tests
├── hardhat.config.js              # BSC Mainnet + Testnet config
├── backend/
│   ├── src/
│   │   ├── config.ts              # Env vars, contract addresses, x402 cost schedule
│   │   ├── blockchain/
│   │   │   ├── wallet.ts          # ethers.js wallet, EIP-712 signing, balance queries
│   │   │   └── ledger.ts          # PaymentLedger contract interactions + in-memory fallback
│   │   └── services/
│   │       ├── price.ts           # DexScreener price + liquidity service
│   │       └── security.ts        # GoPlus token security analysis service
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx           # Main dashboard
│   │       ├── layout.tsx         # App shell
│   │       └── globals.css        # Tailwind base styles
│   ├── next.config.ts
│   └── package.json
├── docs/
│   ├── AI_BUILD_LOG.md            # Hackathon AI build log (bonus points)
│   └── TECHNICAL.md               # Architecture deep-dive
├── bsc.address                    # Deployed contract addresses
├── package.json                   # Root: Hardhat workspace
└── README.md
```

---

## Team

| Name | Role | GitHub |
|------|------|--------|
| TBD | Full-stack / Smart Contracts | @TBD |
| TBD | AI Agent / Backend | @TBD |

---

## License

MIT License. See [LICENSE](./LICENSE) for details.

---

![Built with AI](https://img.shields.io/badge/built%20with-Claude%20Code%20%28Opus%204.6%29-8A2BE2?style=for-the-badge)
![Good Vibes Only](https://img.shields.io/badge/Good%20Vibes%20Only-OpenClaw%20Edition-FF6B6B?style=for-the-badge)

> Built for **OpenClaw Edition** — where AI agents pay their own way.
