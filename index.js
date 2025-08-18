// api/index.js

const express = require('express');
const app = express();

// Your API routes go here
app.get('/api', (req, res) => {
  res.send('Hello from the Vercel API!');
});

// A simple root route
app.get('/', (req, res) => {
  res.send('This is the root route.');
});

// Export the app as a module
module.exports = app;