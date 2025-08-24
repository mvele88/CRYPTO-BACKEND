app.get('/api/ipfs/:cid', async (req, res) => {
  analytics.requests++;
  const cid = req.params.cid;
  const now = Date.now();

  if (cache[cid] && (now - cache[cid].timestamp < CACHE_TTL)) {
    analytics.cacheHits++;
    const contentType = cache[cid].headers?.['content-type'] || 'application/octet-stream';
    res.setHeader("Content-Type", contentType);
    return res.send(cache[cid].data);
  }

  analytics.cacheMisses++;

  let response;
  let lastError = null;

  for (const gateway of IPFS_GATEWAYS) {
    try {
      response = await axios.get(`${gateway}${cid}`, { 
        timeout: 5000,
        responseType: "arraybuffer"   // important to preserve binary/text
      });
      break;
    } catch (err) {
      console.error(`Failed to fetch from ${gateway}: ${err.message}`);
      lastError = err;
    }
  }

  if (response && response.data) {
    cache[cid] = { 
      timestamp: now, 
      data: response.data, 
      headers: response.headers 
    };

    const contentType = response.headers['content-type'] || 'application/octet-stream';
    res.setHeader("Content-Type", contentType);
    res.send(response.data);
  } else {
    const errorMessage = lastError ? 
      `Last error from gateway: ${lastError.message}` : 
      'An unknown error occurred.';
    res.status(500).send(`<h1>Error fetching IPFS content</h1><p>All IPFS gateways failed to retrieve the content.</p><p>${errorMessage}</p>`);
  }
});
