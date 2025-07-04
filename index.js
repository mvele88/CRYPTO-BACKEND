require('dotenv').config();

const express = require('express');
const cron = require('node-cron');
const { Connection, Keypair, PublicKey } = require('@solana/web3.js');

const WalletManager = require('./walletManager');
const SniperEngine = require('./sniperEngine');
const ProfitTracker = require('./profitTracker');
const PayoutManager = require('./payoutManager');
const RiskManager = require('./riskManager');
const EventListener = require('./eventListener');

const app = express();
app.use(express.json());

// Load config from env
const {
  RPC_URL,
  BOT_WALLET_SECRET,
  SNIPING_WALLET_SECRET,
  PAYOUT_WALLET_ADDRESS,
  JUPITER_PRO_API_KEY, // Placeholder only
} = process.env;

// Validate required env variables
if (!RPC_URL || !BOT_WALLET_SECRET || !SNIPING_WALLET_SECRET || !PAYOUT_WALLET_ADDRESS) {
  console.error('Missing required environment variables!');
  process.exit(1);
}

// Validate Jupiter API key
if (!JUPITER_PRO_API_KEY || JUPITER_PRO_API_KEY.length < 10) {
  console.error('Jupiter API key is missing or looks invalid!');
  process.exit(1);
} else {
  console.log(`Jupiter API key loaded. Length: ${JUPITER_PRO_API_KEY.length}`);
}

// Initialize Solana connection
const connection = new Connection(RPC_URL, 'confirmed');

// Load wallets from secrets (assume base58-encoded JSON arrays)
const botWallet = Keypair.fromSecretKey(Buffer.from(JSON.parse(BOT_WALLET_SECRET)));
const snipingWallet = Keypair.fromSecretKey(Buffer.from(JSON.parse(SNIPING_WALLET_SECRET)));
const payoutWallet = new PublicKey(PAYOUT_WALLET_ADDRESS);

// Initialize modules
const walletManager = new WalletManager(connection, botWallet, snipingWallet);
const riskManager = new RiskManager();
const profitTracker = new ProfitTracker();
const payoutManager = new PayoutManager(connection, botWallet, payoutWallet, profitTracker);
const sniperEngine = new SniperEngine(connection, snipingWallet, JUPITER_PRO_API_KEY, riskManager, profitTracker);
const eventListener = new EventListener(connection);

// Start listening to liquidity events
eventListener.on('liquidityAdded', async (poolInfo) => {
  try {
    // Check risk limits and whitelist
    if (!riskManager.isPoolAllowed(poolInfo)) return;

    // Execute sniper trade
    await sniperEngine.snipe(poolInfo);

    // ✅ After snipe, ensure sniping wallet has enough SOL
    await walletManager.replenishSnipingWalletIfNeeded();

  } catch (error) {
    console.error('Error during sniping:', error);
  }
});
eventListener.start();

// Express API Endpoints
app.get('/', (req, res) => {
  res.send('Sniping bot backend running.');
});

app.post('/start', async (req, res) => {
  try {
    eventListener.start();
    res.json({ success: true, message: 'Sniper started.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/stop', async (req, res) => {
  try {
    eventListener.stop();
    res.json({ success: true, message: 'Sniper stopped.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/status', async (req, res) => {
  try {
    const balance = await walletManager.getSnipingWalletBalance();
    const profit = profitTracker.getCumulativeProfit();
    res.json({ success: true, balance, profit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/logs', async (req, res) => {
  try {
    const logs = profitTracker.getLogs();
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Weekly payout: every Thursday at 00:00 UTC
cron.schedule('0 0 * * 4', async () => {
  try {
    console.log('Starting weekly payout process...');
    await payoutManager.processWeeklyPayout();

    // ✅ After payout, ensure sniping wallet has enough SOL
    await walletManager.replenishSnipingWalletIfNeeded();

    console.log('Weekly payout completed.');
  } catch (error) {
    console.error('Error during weekly payout:', error);
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sniping bot backend listening on port ${PORT}`);
});
