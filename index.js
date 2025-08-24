const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// Optional: Solana fee receiver (from your previous setup)
const SOL_FEE_RECEIVER = process.env.SOL_FEE_RECEIVER;

const cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://nftstorage.link/ipfs/"
];

// IPFS proxy endpoint
app.get('/api/ipfs/:cid', async (req, res) => {
  const { cid } = req.params;
  const now = Date.now();

  // Serve from cache if fresh
  if (cache[cid] && now - cache[cid].timestamp < CACHE_TTL) {
    console.log(`Cache hit for CID: ${cid}`);
    res.setHeader("Content-Type", cache[cid].contentType || "text/plain");
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send(cache[cid].data);
  }

  let lastError = null;

  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await axios.get(`${gateway}${cid}`, {
        timeout: 15000,       // 15-second timeout for reliability
        responseType: 'arraybuffer' // preserves binary files if needed
      });

      const contentType = response.headers["content-type"] || "text/plain";

      // Cache the result
      cache[cid] = {
        timestamp: now,
        data: response.data,
        contentType
      };

      res.setHeader("Content-Type", contentType);
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(response.data);

    } catch (err) {
      console.error(`Failed to fetch from ${gateway}: ${err.message}`);
      lastError = err;
    }
  }

  // All gateways failed
  res.status(500).send(`
    <h1>Failed to fetch IPFS content</h1>
    <p>All IPFS gateways failed to retrieve CID: ${cid}</p>
    <p>Last error: ${lastError ? lastError.message : "Unknown error"}</p>
  `);
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
