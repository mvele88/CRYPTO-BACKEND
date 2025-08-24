app.get('/api/ipfs/:cid', async (req, res) => {
  analytics.requests++;
  const cid = req.params.cid;
  const now = Date.now();

  if (cache[cid] && (now - cache[cid].timestamp < CACHE_TTL)) {
    analytics.cacheHits++;
    const contentType = cache[cid].headers?.['content-type'] || 'application/octet-stream';
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*"); // allow browser fetch
    return res.send(cache[cid].data);
  }

  analytics.cacheMisses++;

  let response;
  let lastError = null;

  for (const gateway of IPFS_GATEWAYS) {
    try {
      response = await axios.get(`${gateway}${cid}`, {
        timeout: 8000,
        responseType: "arraybuffer",  // preserve binary as-is
        validateStatus: status => status < 500 // treat 4xx as valid responses
      });
      if (response.status < 400) break;
    } catch (err) {
      console.error(`Failed to fetch from ${gateway}: ${err.message}`);
      lastError = err;
    }
  }

  if (response && response.data && response.status < 400) {
    cache[cid] = {
      timestamp: now,
      data: response.data,
      headers: response.headers
    };

    const contentType = response.headers['content-type'] || 'application/octet-stream';
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(response.data);
  } else {
    const errorMessage = lastError
      ? `Last error from gateway: ${lastError.message}`
      : 'No valid response received.';
    res.status(502).send(`<h1>Error fetching IPFS content</h1><p>All IPFS gateways failed.</p><p>${errorMessage}</p>`);
  }
});
