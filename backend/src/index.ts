import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { config } from "./config.js";
import { analyzeToken } from "./agent/core.js";
import { getPaymentsByAgent, getAgentStats } from "./blockchain/ledger.js";
import { getAgentBalances, getAgentAddress } from "./blockchain/wallet.js";
import { x402App } from "./x402/server.js";

const app = new Hono();

// ─── Middleware ───

app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-402-Payment"],
  })
);

// Request logging
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.path} → ${c.res.status} (${ms}ms)`);
});

// ─── Health Check ───

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    service: "PayMind Agent Backend",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    agent: getAgentAddress(),
    config: {
      bscRpc: config.bsc.rpcUrl,
      chainId: config.bsc.chainId,
      hasWallet: !!config.wallet.privateKey,
      hasAnthropicKey: !!config.anthropic.apiKey,
      hasBscScanKey: !!config.apis.bscscanApiKey,
      paymentLedger: config.contracts.paymentLedger || "not deployed",
    },
  });
});

// ─── Main Analysis Endpoint ───

app.post("/api/analyze", async (c) => {
  try {
    const body = await c.req.json();
    const { tokenAddress } = body;

    if (!tokenAddress) {
      return c.json(
        { success: false, error: "tokenAddress is required in request body" },
        400
      );
    }

    console.log(`\n[Server] Received analysis request for: ${tokenAddress}`);

    const result = await analyzeToken(tokenAddress);

    if (!result.success) {
      return c.json(
        { success: false, error: result.error, timing: result.timing },
        422
      );
    }

    return c.json({
      success: true,
      report: result.report,
      timing: result.timing,
      payments: result.payments,
    });
  } catch (error: any) {
    console.error("[Server] Analysis error:", error);
    return c.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      500
    );
  }
});

// ─── Payment History ───

app.get("/api/payments", async (c) => {
  try {
    const agentAddr = c.req.query("agent") || getAgentAddress();
    const payments = await getPaymentsByAgent(agentAddr);
    return c.json({
      success: true,
      agent: agentAddr,
      count: payments.length,
      payments,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ─── Agent Stats ───

app.get("/api/stats", async (c) => {
  try {
    const agentAddr = getAgentAddress();
    const [stats, balances] = await Promise.all([
      getAgentStats(agentAddr),
      getAgentBalances(),
    ]);

    return c.json({
      success: true,
      agent: agentAddr,
      stats: {
        totalSpent: stats.totalSpent,
        queryCount: stats.queryCount,
        firstPayment: stats.firstPayment
          ? new Date(stats.firstPayment * 1000).toISOString()
          : null,
        lastPayment: stats.lastPayment
          ? new Date(stats.lastPayment * 1000).toISOString()
          : null,
      },
      balances,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ─── x402 Protected Endpoints ───

app.route("/api/x402", x402App);

// ─── 404 Handler ───

app.notFound((c) => {
  return c.json(
    {
      error: "Not Found",
      message: `Route ${c.req.method} ${c.req.path} not found`,
      availableEndpoints: [
        "POST /api/analyze",
        "GET /api/payments",
        "GET /api/stats",
        "GET /api/health",
        "GET /api/x402/security/:token",
        "GET /api/x402/price/:token",
        "GET /api/x402/whale/:token",
      ],
    },
    404
  );
});

// ─── Error Handler ───

app.onError((err, c) => {
  console.error("[Server] Unhandled error:", err);
  return c.json(
    {
      error: "Internal Server Error",
      message: err.message,
    },
    500
  );
});

// ─── Start Server ───

const port = config.server.port;

console.log(`
╔══════════════════════════════════════════════════════╗
║                  PayMind Agent Backend               ║
║          AI-Powered Blockchain Intelligence          ║
║              with x402 Micropayments                 ║
╠══════════════════════════════════════════════════════╣
║  Port:       ${String(port).padEnd(40)}║
║  Agent:      ${getAgentAddress().substring(0, 38).padEnd(40)}║
║  Chain:      BSC (Chain ID ${config.bsc.chainId})${" ".repeat(22)}║
║  Wallet:     ${config.wallet.privateKey ? "Configured" : "Not configured — limited mode".padEnd(40)}║
║  Claude AI:  ${config.anthropic.apiKey ? "Enabled" : "Disabled (rule-based analysis)".padEnd(40)}║
╚══════════════════════════════════════════════════════╝
`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`Server running at http://localhost:${port}`);
console.log("Endpoints:");
console.log("  POST /api/analyze         — Full token analysis");
console.log("  GET  /api/payments        — Payment history");
console.log("  GET  /api/stats           — Agent statistics");
console.log("  GET  /api/health          — Health check");
console.log("  GET  /api/x402/security/* — x402-protected security data");
console.log("  GET  /api/x402/price/*    — x402-protected price data");
console.log("  GET  /api/x402/whale/*    — x402-protected whale data");
console.log("");
