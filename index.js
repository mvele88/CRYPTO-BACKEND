// backend.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors()); // Allow cross-origin requests

// Environment variable for Solana fee receiver
const SOL_FEE_RECEIVER = process.env.SOL_FEE_RECEIVER || 'EnterYourSolReceiverHere';

// IPFS caching
const cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

// Analytics tracking
const analytics = {
  requests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  solFeesReceived: []
};

// IPFS gateways fallback
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://nftstorage.link/ipfs/"
];

// --- IPFS fetch endpoint ---
app.get('/api/ipfs/:cid', async (req, res) => {
  analytics.requests++;
  const { cid } = req.params;
  const now = Date.now();

  // Check cache
  if (cache[cid] && now - cache[cid].timestamp < CACHE_TTL) {
    analytics.cacheHits++;
    return res.send(cache[cid].data);
  }
  analytics.cacheMisses++;

  // Try gateways sequentially
  let lastError = null;
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await axios.get(`${gateway}${cid}`, { timeout: 5000 });
      if (response.data) {
        cache[cid] = { data: response.data, timestamp: now };
        return res.send(response.data);
      }
    } catch (err) {
      lastError = err;
      console.warn(`IPFS fetch failed from ${gateway}: ${err.message}`);
    }
  }

  res.status(500).send(`Failed to fetch IPFS content. Last error: ${lastError?.message}`);
});

// --- Solana withdrawal endpoint ---
app.post('/api/withdraw', (req, res) => {
  try {
    const { userProfit } = req.body;
    if (!userProfit || typeof userProfit !== 'number' || userProfit <= 0) {
      return res.status(400).json({ error: 'Invalid userProfit value' });
    }
    if (!SOL_FEE_RECEIVER) {
      return res.status(500).json({ error: 'SOL fee receiver not configured' });
    }

    const feeAmount = userProfit * 0.20; // 20% fee

    analytics.solFeesReceived.push({
      timestamp: new Date().toISOString(),
      userProfit,
      feeAmount
    });

    return res.json({ address: SOL_FEE_RECEIVER, feeAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during withdrawal' });
  }
});

// --- Analytics endpoint ---
app.get('/api/analytics', (req, res) => {
  res.json(analytics);
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
