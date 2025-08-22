const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// IMPORTANT: This should be set in your Vercel environment variables.
const SOL_FEE_RECEIVER = process.env.SOL_FEE_RECEIVER;

const cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const analytics = {
  requests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  profitEvents: [],
  solFeesReceived: [] // Updated to track Solana fees
};

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://nftstorage.link/ipfs/"
];

// Endpoint to fetch IPFS content
app.get('/api/ipfs/:cid', async (req, res) => {
  analytics.requests++;
  const cid = req.params.cid;
  const now = Date.now();

  // Check cache first
  if (cache[cid] && now - cache[cid].timestamp < CACHE_TTL) {
    analytics.cacheHits++;
    res.setHeader("Content-Type", "text/html");
    return res.send(cache[cid].html);
  }

  analytics.cacheMisses++;

  let response;
  let lastError = null;

  for (const gateway of IPFS_GATEWAYS) {
    try {
      response = await axios.get(`${gateway}${cid}`);
      break;
    } catch (err) {
      console.error(`Failed to fetch from ${gateway}: ${err.message}`);
      lastError = err;
    }
  }

  if (response && response.data) {
    cache[cid] = { timestamp: now, data: response.data, html: response.data };
    res.setHeader("Content-Type", "text/html");
    res.send(cache[cid].html);
  } else {
    res.status(500).send(`<h1>Error fetching IPFS content</h1><p>All IPFS gateways failed to retrieve the content. Last error: ${lastError ? lastError.message : 'Unknown error'}</p>`);
  }
});

// NEW: Endpoint to handle Solana withdrawal request and calculate fees
app.post('/api/withdraw', (req, res) => {
  const { userProfit } = req.body;

  // Basic validation
  if (typeof userProfit !== 'number' || isNaN(userProfit) || userProfit <= 0) {
    return res.status(400).json({ error: 'Invalid or missing userProfit value.' });
  }

  // Calculate 20% fee
  const feeAmount = userProfit * 0.20;

  // Record the fee event (for your analytics)
  analytics.solFeesReceived.push({
    timestamp: new Date().toISOString(),
    userProfit,
    feeAmount
  });

  // Respond with the calculated fee and the destination address
  res.status(200).json({
    address: SOL_FEE_RECEIVER,
    feeAmount: feeAmount
  });
});

// Endpoint for analytics
app.get('/api/analytics', (req, res) => {
  res.json(analytics);
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
