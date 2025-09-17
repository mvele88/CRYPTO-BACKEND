require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Connection, PublicKey } = require('@solana/web3.js');

const app = express();
const PORT = process.env.PORT || 4000;
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const FEE_WALLET = process.env.FEE_WALLET;

const connection = new Connection(SOLANA_RPC, 'confirmed');

app.use(cors());
app.use(bodyParser.json());

// In-memory cache for IPFS content (optional)
const ipfsCache = new Map();

// ---------------- Logger ----------------
function logEvent(type, data) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}]`, JSON.stringify(data));
}

// ---------------- Mock Bot DB ----------------
const bots = {
  "QmTWm6xa4yXTP8TUgWstqoKn5aGhfzoa5ejntuUyhFbHVn": {
    botParams: {
      strategy: "Leverage Trading Bot",
      maxSlippage: 2,
      targetSOL: 4
    }
  }
};

// ---------------- Middleware: Validate Wallet ----------------
function validateWallet(req, res, next) {
  const wallet = req.body.userWallet || req.params.wallet;
  if (!wallet) return res.status(400).json({ error: 'Wallet address is required' });
  try { new PublicKey(wallet); } catch { return res.status(400).json({ error: 'Invalid wallet address' }); }
  next();
}

// ---------------- Bot Info Endpoint ----------------
app.get('/bot/:cid', async (req, res) => {
  try {
    const bot = bots[req.params.cid];
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    res.json(bot);
  } catch (err) {
    logEvent('ERROR', { endpoint: '/bot/:cid', error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------- IPFS Fetch Endpoint ----------------
app.get('/ipfs/:cid', async (req, res) => {
  const { cid } = req.params;
  try {
    if (ipfsCache.has(cid)) return res.send(ipfsCache.get(cid));
    const response = await axios.get(`https://ipfs.io/ipfs/${cid}`, { timeout: 10000 });
    ipfsCache.set(cid, response.data); // Cache for future
    res.send(response.data);
  } catch (err) {
    logEvent('ERROR', { endpoint: '/ipfs/:cid', cid, error: err.message });
    res.status(500).json({ error: 'Failed to fetch IPFS content' });
  }
});

// ---------------- Bot Activation Log ----------------
app.post('/bot/log', validateWallet, async (req, res) => {
  try {
    const { botId, txSignature, status, userWallet } = req.body;
    logEvent('BOT_LOG', { botId, status, userWallet, txSignature });
    res.json({ success: true });
  } catch (err) {
    logEvent('ERROR', { endpoint: '/bot/log', error: err.message });
    res.status(500).json({ error: 'Failed to log bot activity' });
  }
});

// ---------------- Withdrawal Endpoint ----------------
app.post('/withdraw', validateWallet, async (req, res) => {
  try {
    const { userProfit } = req.body;
    if (!userProfit || userProfit <= 0) return res.status(400).json({ error: 'Invalid profit amount' });

    // Fee 20%
    const feeAmount = userProfit * 0.2;

    logEvent('WITHDRAWAL_REQUEST', { userWallet: req.body.userWallet, userProfit, feeAmount });

    res.json({
      address: FEE_WALLET,
      feeAmount
    });
  } catch (err) {
    logEvent('ERROR', { endpoint: '/withdraw', error: err.message });
    res.status(500).json({ error: 'Withdrawal processing failed' });
  }
});

// ---------------- User Balance Endpoint ----------------
app.get('/bot/balance/:wallet', validateWallet, async (req, res) => {
  try {
    // In production: fetch real balances from DB / chain
    const balance = 200.0;
    const totalProfits = 50.0;
    res.json({ balance, totalProfits });
  } catch (err) {
    logEvent('ERROR', { endpoint: '/bot/balance', error: err.message });
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// ---------------- 404 Handler ----------------
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ---------------- Start Server ----------------
app.listen(PORT, () => {
  console.log(`Production-ready Node.js backend running on port ${PORT}`);
});
