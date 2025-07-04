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
    if (typeof body.amount === 'number') {
      state.fundingAmount = body.amount;
      if (state.fundingAmount >= state.fundingGoal) {
        state.status = 'Funding Complete - Awaiting API Key';
      }
      res.status(200).json({ message: 'Funding updated', fundingAmount: state.fundingAmount });
    } else {
      res.status(400).json({ error: 'Invalid amount' });
    }
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}
