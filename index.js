// File: api/index.js
// This file is a Vercel serverless function that handles requests to your API.

import axios from "axios";

// This is the default CID to use if one isn't provided in the request.
const DEFAULT_CID = "QmQgWfnK7jY38UiE5DKoz8hEZh7iLiEujDT8j9dvczhJeF";

// It's a best practice to get sensitive information, like API keys and
// receiver addresses, from environment variables.
const BTC_RECEIVER = process.env.BTC_RECEIVER;
const BLOCKONOMICS_API_KEY = process.env.BLOCKONOMICS_API_KEY;

// In-memory cache for storing IPFS data.
// IMPORTANT: In a serverless environment, this cache is non-persistent and
// will be cleared during a "cold start" (when the function re-initializes).
const cache = {};
const CACHE_TTL = 60 * 5 * 1000; // 5 minutes in milliseconds.

// This analytics object is also non-persistent. For real analytics,
// you would want to send these events to a separate logging service.
const analytics = {
  requests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  profitEvents: [],
  btcFeesSent: []
};

/**
 * Sends a Bitcoin fee to a predefined address using the Blockonomics API.
 * This function is a placeholder and assumes a secure server-side implementation.
 * @param {number} amountBTC The amount of Bitcoin (in BTC) to send.
 * @returns {Promise<{success: boolean, error?: string}>} The result of the API call.
 */
async function sendBTCFee(amountBTC) {
  // It's not a real payment, so we'll just log the action and return success.
  // In a production app, this would be a real API call to a payment gateway.
  console.log(`[ACTION] Simulating sending ${amountBTC} BTC fee to ${BTC_RECEIVER}`);

  // The previous code had an incorrect payload for Blockonomics.
  // The API typically requires a callback URL or label for a new address.
  // Since we're not monitoring payments, we'll just send a simplified payload.
  try {
    const payload = {
      label: `ipfs_fee_${Date.now()}` // Unique label for tracking
    };

    const response = await axios.post(
      `https://www.blockonomics.co/api/new_address?match_callback=${encodeURIComponent('YOUR_CALLBACK_URL_HERE')}`,
      payload,
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
      address: BTC_RECEIVER,
      blockonomics_response: response.data
    });

    console.log(`[SUCCESS] 20% fee ${amountBTC} BTC recorded for sending.`);
    return { success: true };
  } catch (error) {
    console.error("[ERROR] Blockonomics fee error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches content from an IPFS gateway and updates the cache.
 * This function runs asynchronously in the background.
 * @param {string} cid The IPFS Content Identifier.
 */
async function fetchAndCacheCID(cid) {
  try {
    const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
    const response = await axios.get(ipfsUrl);
    
    // Axios automatically parses JSON data, but we need to handle HTML as a string.
    const data = typeof response.data === 'object' ? response.data : {
        cid: cid,
        data: response.data
    };

    cache[cid] = {
      timestamp: Date.now(),
      data: data,
      html: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
    };
    
    console.log(`[CACHE REFRESH] Successfully refreshed cache for CID ${cid}.`);
  } catch (error) {
    console.error(`[ERROR] Failed to refresh cache for CID ${cid}:`, error.message);
  }
}

/**
 * The main handler for Vercel's serverless function.
 * This function will be executed for every incoming request.
 * @param {import('http').IncomingMessage} req The request object.
 * @param {import('http').ServerResponse} res The response object.
 */
module.exports = async function handler(req, res) {
  const { cid, format, profit, analyticsView } = req.query;
  const fetchCid = cid || DEFAULT_CID;
  const responseFormat = (format || "html").toLowerCase();
  const now = Date.now();

  analytics.requests++;

  // Handle the analytics view endpoint separately.
  if (analyticsView === "true") {
    return res.status(200).json(analytics);
  }

  // Step 1: Check if the content is in the cache and is still fresh.
  if (cache[fetchCid] && now - cache[fetchCid].timestamp < CACHE_TTL) {
    analytics.cacheHits++;
    const cached = cache[fetchCid];

    // Asynchronously refresh the cache if it's stale.
    if (now - cached.timestamp > CACHE_TTL) {
      fetchAndCacheCID(fetchCid);
    }
    
    console.log(`[CACHE HIT] Serving CID ${fetchCid} from cache.`);
    
    // Return the response based on the requested format.
    if (responseFormat === "json") {
        res.setHeader("Content-Type", "application/json");
        return res.status(200).json(cached.data);
    }
    
    res.setHeader("Content-Type", "text/html");
    return res.status(200).send(cached.html);
  }

  // Step 2: If cache is a miss, fetch from IPFS.
  analytics.cacheMisses++;
  console.log(`[CACHE MISS] Fetching CID ${fetchCid} from IPFS.`);
  
  try {
    const ipfsUrl = `https://ipfs.io/ipfs/${fetchCid}`;
    const response = await axios.get(ipfsUrl);

    // Axios automatically parses JSON, so we need to handle both cases.
    const data = typeof response.data === 'object' ? response.data : {
        cid: fetchCid,
        data: response.data
    };

    // Create the cache entry.
    const cacheEntry = {
      timestamp: now,
      data: data,
      html: typeof response.data === 'string' ? response.data : JSON.stringify(response.data)
    };
    cache[fetchCid] = cacheEntry;

    // Trigger the BTC fee logic if a profit parameter is present.
    if (profit) {
      const profitBTC = parseFloat(profit);
      if (!isNaN(profitBTC) && profitBTC > 0) {
        const feeBTC = profitBTC * 0.2;
        analytics.profitEvents.push({
          timestamp: new Date().toISOString(),
          profitBTC,
          feeBTC
        });
        // We do not await this, so it runs in the background.
        sendBTCFee(feeBTC);
      }
    }

    // Respond based on the requested format.
    if (responseFormat === "json") {
      res.setHeader("Content-Type", "application/json");
      return res.status(200).json(cacheEntry.data);
    }
    
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(cacheEntry.html);

  } catch (error) {
    // Handle errors from the IPFS fetch.
    console.error(`[ERROR] Failed to fetch IPFS content:`, error.message);
    if (responseFormat === "json") {
      return res.status(500).json({ error: "Failed to fetch IPFS content", details: error.message });
    }
    res.status(500).send(`<h1>Failed to fetch IPFS content</h1><p>${error.message}</p>`);
  }
}
