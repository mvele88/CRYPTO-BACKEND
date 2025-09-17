// /api/withdraw.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userProfit } = req.body;

    if (!userProfit || isNaN(userProfit) || userProfit <= 0) {
      return res.status(400).json({ error: 'Invalid profit amount' });
    }

    // Hard-coded fee wallet
    const feeWallet = '999KYSwjC2XmDD8cdXLoWj4EExZExvrsQxewzXRM1Drg';

    // Fee: 20% of profit
    const feeAmount = userProfit * 0.2;

    // Return to frontend
    res.status(200).json({
      address: feeWallet,
      feeAmount
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
