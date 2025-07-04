import { json } from 'micro';

let state = {
  status: 'Awaiting Funding Drop',
  botsOnline: 0,
  fundingAmount: 0,
  fundingGoal: 4050,
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const body = await json(req);
    if (typeof body.botsOnline === 'number') {
      state.botsOnline = body.botsOnline;
      res.status(200).json({ message: 'Bot count updated', botsOnline: state.botsOnline });
    } else {
      res.status(400).json({ error: 'Invalid botsOnline' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
