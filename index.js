// File: api/index.js
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// In-memory cache
const cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Analytics tracking
const analytics = {
  requests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  profitEvents: [],
  btcInvoicesCreated: []
};

// Environment variables
const BTC_RECEIVER = process.env.BTC_RECEIVER;
const BLOCKONOMICS_API_KEY = process.env.BLOCKONOMICS_API_KEY;

// Function to create a Blockonomics invoice
async function createBTCInvoice(amountBTC, label) {
  try {
    const satoshis = Math.round(amountBTC * 1e8); // Convert BTC to satoshis
    const response = await axios.post(
      "https://www.blockonomics.co/api/merchant/invoice",
      {
        value: satoshis,
        address: BTC_RECEIVER,
        label: label,
        callback_url: "https://your-backend.vercel.app/api/callback"
      },
      {
        headers: {
          Authorization: `Bearer ${BLOCKONOMICS_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    analytics.btcInvoicesCreated.push({
      timestamp: new Date().toISOString(),
      amountBTC,
      invoice: response.data
    });

    console.log(`[BTC INVOICE] ${amountBTC} BTC invoice created:`, response.data);
    return response.data;
  } catch (error) {
    console.error("[BTC INVOICE] Failed to create invoice:", error.message);
    return { error: error.message };
  }
}

// Function to fetch IPFS content and cache it
async function fetchAndCacheCID(cid) {
  try {
    const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
    const response = await axios.get(ipfsUrl);
    cache[cid] = {
      timestamp: Date.now(),
      data: { cid, data: response.data },
      html: response.data
    };
  } catch (error) {
    console.error(`Failed to fetch IPFS CID ${cid}:`, error.message);
  }
}

// Main API endpoint
app.get("/api/ipfs", async (req, res) => {
  const { cid, format, profit } = req.query;
  const fetchCid = cid || "QmQgWfnK7jY38UiE5DKoz8hEZh7iLiEujDT8j9dvczhJeF";
  const responseFormat = (format || "html").toLowerCase();
  const now = Date.now();

  analytics.requests++;

  // Serve cached content if available
  if (cache[fetchCid]) {
    analytics.cacheHits++;
    const cached = cache[fetchCid];
    if (now - cached.timestamp > CACHE_TTL) fetchAndCacheCID(fetchCid); // background refresh

    if (responseFormat === "json") return res.status(200).json(cached.data);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(cached.html);
  }

  analytics.cacheMisses++;

  // Fetch IPFS content if not cached
  try {
    const ipfsUrl = `https://ipfs.io/ipfs/${fetchCid}`;
    const response = await axios.get(ipfsUrl);
    const cacheEntry = {
      timestamp: now,
      data: { cid: fetchCid, data: response.data },
      html: response.data
    };
    cache[fetchCid] = cacheEntry;

    // Trigger 20% BTC invoice if profit provided
    if (profit) {
      const profitBTC = parseFloat(profit);
      if (!isNaN(profitBTC) && profitBTC > 0) {
        const feeBTC = profitBTC * 0.2;
        analytics.profitEvents.push({
          timestamp: new Date().toISOString(),
          profitBTC,
          feeBTC
        });

        // Create invoice
        await createBTCInvoice(feeBTC, `profit_fee_${Date.now()}`);
      }
    }

    if (responseFormat === "json") {
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json(cacheEntry.data);
    }
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(cacheEntry.html);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch IPFS content: ${error.message}` });
  }
});

// Catch-all
app.get("*", (req, res) => {
  res.status(404).json({ message: "Not Found. Use /api/ipfs?cid=<your-cid>" });
});

export default app;
