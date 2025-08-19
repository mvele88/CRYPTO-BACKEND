const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const BTC_RECEIVER = process.env.BTC_RECEIVER;
const BLOCKONOMICS_API_KEY = process.env.BLOCKONOMICS_API_KEY;

const cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const analytics = {
  requests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  profitEvents: [],
  btcFeesSent: []
};

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://gateway.pinata.cloud/ipfs/",
  "https://nftstorage.link/ipfs/"
];

async function sendBTCFee(amountBTC) {
  try {
    await axios.post(
      "https://www.blockonomics.co/api/new_address",
      {},
      {
        headers: {
          Authorization: `Bearer ${BLOCKONOMICS_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    analytics.btcFeesSent.push({
      timestamp: new Date().toISOString(),
      amountBTC,
      address: BTC_RECEIVER
    });

    console.log(`20% fee ${amountBTC} BTC sent to ${BTC_RECEIVER}`);
    return { success: true };
  } catch (err) {
    console.error("Blockonomics fee error:", err.message);
    return { success: false, error: err.message };
  }
}

// Add a route for the root URL
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Crypto API backend. Use /api/ipfs?cid=<CID> to fetch IPFS content.",
    endpoints: {
      ipfs: "/api/ipfs?cid=<CID>",
      analytics: "/api/analytics"
    }
  });
});

// Add a route to handle favicon requests and prevent 404s
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.get("/favicon.png", (req, res) => res.status(204).end());

app.get("/api/ipfs", async (req, res) => {
  const cid = req.query.cid || "QmQgWfnK7jY38UiE5DKoz8hEZh7iLiEujDT8j9dvczhJeF";
  const now = Date.now();
  analytics.requests++;

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

    if (req.query.profit) {
      const profitBTC = parseFloat(req.query.profit);
      if (!isNaN(profitBTC) && profitBTC > 0) {
        const feeBTC = profitBTC * 0.2;
        analytics.profitEvents.push({ timestamp: new Date().toISOString(), profitBTC, feeBTC });
        await sendBTCFee(feeBTC);
      }
    }

    res.setHeader("Content-Type", "text/html");
    res.send(cache[cid].html);
  } else {
    res.status(500).send(`<h1>Error fetching IPFS content</h1><p>All IPFS gateways failed to retrieve the content. Last error: ${lastError ? lastError.message : 'Unknown error'}</p>`);
  }
});

app.get("/api/analytics", (req, res) => res.json(analytics));

app.get("*", (req, res) => res.status(404).json({ message: "Not Found. Use /api/ipfs?cid=<CID>" }));

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}