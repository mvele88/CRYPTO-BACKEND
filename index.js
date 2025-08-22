// index.js
const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// In-memory caches for data.
// NOTE: For a production application, user profit data should be
// stored in a persistent database (e.g., Firestore, MongoDB)
// as Vercel functions are stateless and this data would be lost.
const ipfsCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Your specific Solana wallet address for fee collection.
const SOLANA_RECEIVER_ADDRESS = "A9HqQcJDzuUejcFaGacgySdxXag2YmdLGuSypwCnRnLC";

// IPFS gateway list for content retrieval
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://nftstorage.link/ipfs/"
];

/**
 * Main endpoint to fetch content.
 * This is now a simple, open endpoint as there is no fee on access.
 */
app.get('/api/ipfs/:cid', async (req, res) => {
  const { cid } = req.params;

  // Check cache first
  const now = Date.now();
  if (ipfsCache[cid] && now - ipfsCache[cid].timestamp < CACHE_TTL) {
    console.log(`Cache hit for CID: ${cid}`);
    res.setHeader("Content-Type", "text/html");
    return res.send(ipfsCache[cid].html);
  }

  // Cache miss, try fetching from gateways
  let response;
  let lastError = null;

  for (const gateway of IPFS_GATEWAYS) {
    try {
      response = await axios.get(`${gateway}${cid}`);
      break; // Success, exit loop
    } catch (err) {
      console.error(`Failed to fetch from ${gateway}: ${err.message}`);
      lastError = err;
    }
  }

  if (response && response.data) {
    // Store in cache
    ipfsCache[cid] = { timestamp: now, data: response.data, html: response.data };
    res.setHeader("Content-Type", "text/html");
    res.send(ipfsCache[cid].html);
  } else {
    // All gateways failed
    res.status(500).send(`<h1>Error fetching IPFS content</h1><p>All IPFS gateways failed to retrieve the content. Last error: ${lastError ? lastError.message : 'Unknown error'}</p>`);
  }
});

/**
 * New endpoint to handle user withdrawal requests and calculate the fee.
 * This endpoint will return your Solana address and the calculated fee.
 */
app.post('/api/withdraw', async (req, res) => {
  const { userProfit } = req.body; // Expecting the user's profit amount in SOL
  
  if (typeof userProfit !== 'number' || userProfit <= 0) {
    return res.status(400).json({ error: 'Invalid or missing profit amount.' });
  }

  // Calculate the 20% performance fee.
  const feeAmount = userProfit * 0.20;

  console.log(`Withdrawal request received. User profit: ${userProfit}, calculated fee: ${feeAmount}`);
  
  res.status(200).json({
    message: `Please pay the 20% performance fee of ${feeAmount} SOL to the address to complete your withdrawal.`,
    address: SOLANA_RECEIVER_ADDRESS,
    feeAmount: feeAmount
  });
});

app.get("/", (req, res) => {
  res.status(200).send("Welcome to the IPFS + Payment Backend!");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server is running on port 3000");
});
