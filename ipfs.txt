import axios from "axios";

const DEFAULT_CID = "QmQgWfnK7jY38UiE5DKoz8hEZh7iLiEujDT8j9dvczhJeF";
const BTC_RECEIVER = process.env.BTC_RECEIVER;
const BLOCKONOMICS_API_KEY = process.env.BLOCKONOMICS_API_KEY;

const cache = {};
const CACHE_TTL = 60 * 5 * 1000; // 5 minutes

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
  } catch (error) {
    console.error("Blockonomics fee error:", error.message);
    return { success: false, error: error.message };
  }
}

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
    console.error(`Failed to refresh cache for CID ${cid}:`, error.message);
  }
}

export default async function handler(req, res) {
  const { cid, format, profit, analyticsView } = req.query;
  const fetchCid = cid || DEFAULT_CID;
  const responseFormat = (format || "html").toLowerCase();
  const now = Date.now();

  analytics.requests++;

  if (analyticsView === "true") {
    return res.status(200).json(analytics);
  }

  if (cache[fetchCid]) {
    analytics.cacheHits++;
    const cached = cache[fetchCid];
    if (now - cached.timestamp > CACHE_TTL) {
      fetchAndCacheCID(fetchCid);
    }
    if (responseFormat === "json") return res.status(200).json(cached.data);
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(cached.html);
  }

  analytics.cacheMisses++;

  try {
    const ipfsUrl = `https://ipfs.io/ipfs/${fetchCid}`;
    const response = await axios.get(ipfsUrl);

    const cacheEntry = {
      timestamp: now,
      data: { cid: fetchCid, data: response.data },
      html: response.data
    };
    cache[fetchCid] = cacheEntry;

    if (profit) {
      const profitBTC = parseFloat(profit);
      if (!isNaN(profitBTC) && profitBTC > 0) {
        const feeBTC = profitBTC * 0.2;
        analytics.profitEvents.push({
          timestamp: new Date().toISOString(),
          profitBTC,
          feeBTC
        });
        await sendBTCFee(feeBTC);
      }
    }

    if (responseFormat === "json") {
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json(cacheEntry.data);
    }
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(cacheEntry.html);

  } catch (error) {
    if (responseFormat === "json") {
      return res.status(500).json({ error: "Failed to fetch IPFS content", details: error.message });
    }
    res.status(500).send(`<h1>Failed to fetch IPFS content</h1><p>${error.message}</p>`);
  }
}
