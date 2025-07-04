let state = {
  status: 'Awaiting Funding Drop',
  botsOnline: 0,
  fundingAmount: 0,
  fundingGoal: 4050,
};

export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json(state);
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
