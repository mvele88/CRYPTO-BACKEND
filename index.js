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

  try {
    const response = await axios.get(`https://ipfs.io/ipfs/${cid}`);
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
  } catch (err) {
    res.status(500).send(`<h1>Error fetching IPFS content</h1><p>${err.message}</p>`);
  }
});

app.get("/api/analytics", (req, res) => res.json(analytics));

app.get("*", (req, res) => res.status(404).json({ message: "Not Found. Use /api/ipfs?cid=<CID>" }));

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

module.exports = app;
