// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors()); // Allow cross-origin requests from frontend

// Environment variable for Solana fee receiver
const SOL_FEE_RECEIVER = process.env.SOL_FEE_RECEIVER || 'EnterYourSolReceiverHere';

// IPFS cache
const cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Analytics
const analytics = {
  requests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  solFeesReceived: []
};

// IPFS gateways
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://nftstorage.link/ipfs/"
];

// --- IPFS content endpoint ---
app.get('/api/ipfs/:cid', async (req, res) => {
  const { cid } = req.params;
  const now = Date.now();
  analytics.requests++;

  if (cache[cid] && (now - cache[cid].timestamp < CACHE_TTL)) {
    analytics.cacheHits++;
    return res.send(cache[cid].data);
  }
  analytics.cacheMisses++;

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
  const { userProfit } = req.body;
  if (!userProfit || typeof userProfit !== 'number' || userProfit <= 0) {
    return res.status(400).json({ error: 'Invalid userProfit value' });
  }
  if (!SOL_FEE_RECEIVER) {
    return res.status(500).json({ error: 'SOL fee receiver not configured' });
  }

  const feeAmount = userProfit * 0.2; // 20% fee

  analytics.solFeesReceived.push({
    timestamp: new Date().toISOString(),
    userProfit,
    feeAmount
  });

  res.json({ address: SOL_FEE_RECEIVER, feeAmount });
});

// --- Analytics endpoint ---
app.get('/api/analytics', (req, res) => res.json(analytics));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
