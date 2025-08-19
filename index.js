// index.js
const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Root route
app.get('/', (req, res) => {
  res.send('<h1>Backend is running</h1><p>Welcome!</p>');
});

// Wallet connection endpoint
app.get('/api/wallet-connect', async (req, res) => {
  try {
    // Placeholder: Replace with your real wallet connection logic
    const walletStatus = { connected: true };
    res.json(walletStatus);
  } catch (err) {
    console.error('Wallet connection error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Local testing only
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running locally at http://localhost:${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
