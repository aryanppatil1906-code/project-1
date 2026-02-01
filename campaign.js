/**********************************************************
 * 🔹 Firebase SDK imports (v9 modular)
 **********************************************************/
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getFirestore,
  doc,
  updateDoc,
  addDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

/**********************************************************
 * 🔹 Firebase configuration
 **********************************************************/
const firebaseConfig = {
  apiKey: "AIzaSyBEJxGdXES3OUYoq8sVgpxbm9v0hIe1MPQ",
  authDomain: "crowdfunding-dapp-483f7.firebaseapp.com",
  projectId: "crowdfunding-dapp-483f7",
};

/**********************************************************
 * 🔹 Initialize Firebase
 **********************************************************/
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/**********************************************************
 * 🔹 Get campaign ID from URL
 **********************************************************/
const params = new URLSearchParams(window.location.search);
const campaignId = params.get("id");

if (!campaignId) {
  alert("Invalid campaign");
  window.location.href = "mainAfterLogin.html";
}

/**********************************************************
 * 🔹 Load Campaign
 **********************************************************/
async function loadCampaign() {
  try {
    const campaignRef = doc(db, "campaigns", campaignId);
    const snap = await getDoc(campaignRef);

    if (!snap.exists()) {
      alert("Campaign not found");
      return;
    }

    const data = snap.data();

    // 🔐 verify blockchain for THIS campaign only
    const tampered = await verifyDonationsForCampaign(campaignId);

    if (tampered && data.status !== "flagged") {
      await updateDoc(campaignRef, { status: "flagged" });
      data.status = "flagged";
    }

    // 🚫 stop donation if flagged
    if (data.status === "flagged") {
      document.getElementById("donateBtn").disabled = true;
      document.getElementById("warning").innerText =
        "⚠️ Campaign flagged due to data tampering. Donations paused.";
    }

    // 📄 UI injection
    document.getElementById("title").innerText = data.title;
    document.getElementById("description").innerText = data.description;
    document.getElementById("goal").innerText = data.goal;
    document.getElementById("raised").innerText = data.raised;
    document.getElementById("deadline").innerText = data.deadline;

    updateProgress(data.raised, data.goal);

  } catch (err) {
    console.error("Load campaign error:", err);
    alert("Failed to load campaign");
  }
}

loadCampaign();

/**********************************************************
 * 🔍 Verify donations (PER CAMPAIGN CHAIN)
 **********************************************************/
async function verifyDonationsForCampaign(campaignId) {

  const q = query(
    collection(db, "donations"),
    where("campaignId", "==", campaignId)
  );

  const snapshot = await getDocs(q);

  // sort locally (index safe)
  const donations = snapshot.docs
    .map(d => d.data())
    .sort((a, b) => a.timestamp - b.timestamp);

  let prevHash = "GENESIS";

  for (const d of donations) {
    const text =
      d.campaignId +
      d.userId +
      d.amount +
      d.timestamp +
      d.prevHash;

    const calcHash = await generateHash(text);

    if (calcHash !== d.hash) return true;
    if (d.prevHash !== prevHash) return true;

    prevHash = d.hash;
  }

  return false;
}

/**********************************************************
 * 📊 Progress bar
 **********************************************************/
function updateProgress(raised, goal) {
  const percent = Math.min((raised / goal) * 100, 100);
  document.getElementById("progressBar").style.width = percent + "%";
  document.getElementById("percentage").innerText =
    Math.floor(percent) + "% funded";
}

/**********************************************************
 * 🔗 Get last donation hash (per campaign)
 **********************************************************/
async function getLastDonationHash(campaignId) {

  const q = query(
    collection(db, "donations"),
    where("campaignId", "==", campaignId)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) return "GENESIS";

  const donations = snapshot.docs
    .map(d => d.data())
    .sort((a, b) => a.timestamp - b.timestamp);

  return donations[donations.length - 1].hash;
}

// ------------------------
// MetaMask / Wallet logic
// ------------------------
const connectBtn = document.getElementById("connectWalletBtn");
let currentAccount = null;

if (connectBtn) {
  connectBtn.addEventListener("click", async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      currentAccount = accounts[0];
      // ensure user on Sepolia
      try { await switchToSepoliaIfNeeded(); } catch (e) { console.warn('Network switch failed', e); }
      connectBtn.textContent = `${currentAccount.slice(0,6)}...${currentAccount.slice(-4)}`;
    } catch (err) {
      console.error(err);
      alert("Wallet connection rejected");
    }
  });
}

if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      currentAccount = null;
      if (connectBtn) connectBtn.textContent = "Connect Wallet";
    } else {
      currentAccount = accounts[0];
      if (connectBtn) connectBtn.textContent = `${currentAccount.slice(0,6)}...${currentAccount.slice(-4)}`;
    }
  });
}

// wait for transaction receipt (simple polling)
async function waitForReceipt(txHash, attempts = 60, interval = 5000) {
  for (let i = 0; i < attempts; i++) {
    const receipt = await window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [txHash]
    }).catch(() => null);

    if (receipt) return receipt;
    await new Promise(r => setTimeout(r, interval));
  }
  return null;
}

// try to switch MetaMask to Sepolia (adds network if missing)
async function switchToSepoliaIfNeeded() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  const SEP_CHAIN_ID = '0xaa36a7'; // Sepolia
  const current = await window.ethereum.request({ method: 'eth_chainId' }).catch(() => null);
  if (current === SEP_CHAIN_ID) return;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEP_CHAIN_ID }]
    });
    return;
  } catch (err) {
    // 4902 -> unknown chain, try to add
    if (err.code === 4902 || err.code === -32603) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: SEP_CHAIN_ID,
          chainName: 'Sepolia Test Network',
          rpcUrls: ['https://rpc.sepolia.org'],
          nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
          blockExplorerUrls: ['https://sepolia.etherscan.io']
        }]
      });

      // try switching again
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEP_CHAIN_ID }]
      });
      return;
    }
    throw err;
  }
}

/**********************************************************
 * 💰 Donation logic
 **********************************************************/
const donateBtn = document.getElementById("donateBtn");
const donateAmountInput = document.getElementById("donateAmount");

donateBtn.addEventListener("click", async () => {

  const amount = Number(donateAmountInput.value);

  if (amount <= 0) {
    alert("Enter valid amount");
    return;
  }

  if (!auth.currentUser) {
    alert("Login required");
    window.location.href = "login.html";
    return;
  }

  const campaignRef = doc(db, "campaigns", campaignId);
  const snap = await getDoc(campaignRef);
  const campaign = snap.data();

  if (campaign.status === "flagged") {
    alert("Campaign is flagged");
    return;
  }

  // If campaign document has a wallet address, prefer on-chain donation
  const campaignWallet = campaign.walletAddress || campaign.recipientAddress || null;

  if (window.ethereum && campaignWallet) {
    // ensure wallet connected
    if (!currentAccount) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        currentAccount = accounts[0];
        if (connectBtn) connectBtn.textContent = `${currentAccount.slice(0,6)}...${currentAccount.slice(-4)}`;
      } catch (e) {
        alert("Connect wallet to donate via MetaMask");
        return;
      }
    }

    const wei = BigInt(Math.floor(amount * 1e18));
    const hexValue = "0x" + wei.toString(16);

    let txHash;
    try {
      txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from: currentAccount, to: campaignWallet, value: hexValue }]
      });
    } catch (err) {
      console.error("MetaMask send error:", err);
      alert("Transaction failed or rejected");
      return;
    }

    // ensure correct network and show pending UI
    try { await switchToSepoliaIfNeeded(); } catch (e) { console.warn('Network switch failed', e); }
    const warningEl = document.getElementById('warning');
    if (warningEl) warningEl.innerText = '⏳ Waiting for transaction confirmation...';

    // wait for receipt and check status
    const receipt = await waitForReceipt(txHash);
    if (!receipt || receipt.status === "0x0" || receipt.status === 0) {
      if (warningEl) warningEl.innerText = '';
      alert("Transaction failed on-chain");
      return;
    }

    // record donation after successful on-chain tx
    const newRaised = campaign.raised + amount;
    await updateDoc(campaignRef, { raised: newRaised });

    const timestamp = Date.now();
    const prevHash = await getLastDonationHash(campaignId);

    const text =
      campaignId +
      auth.currentUser.uid +
      amount +
      timestamp +
      prevHash;

    const hash = await generateHash(text);

    await addDoc(collection(db, "donations"), {
      campaignId,
      userId: auth.currentUser.uid,
      amount,
      timestamp,
      prevHash,
      hash,
      txHash
    });
    if (warningEl) warningEl.innerText = '';
    alert("Donation successful ❤️ (tx: " + txHash + ")");
    updateProgress(newRaised, campaign.goal);
    return;
  }

  // Fallback: record donation off-chain as before
  const newRaised = campaign.raised + amount;
  await updateDoc(campaignRef, { raised: newRaised });

  const timestamp = Date.now();
  const prevHash = await getLastDonationHash(campaignId);

  const text =
    campaignId +
    auth.currentUser.uid +
    amount +
    timestamp +
    prevHash;

  const hash = await generateHash(text);

  await addDoc(collection(db, "donations"), {
    campaignId,
    userId: auth.currentUser.uid,
    amount,
    timestamp,
    prevHash,
    hash
  });

  alert("Donation successful ❤️");
  updateProgress(newRaised, campaign.goal);
});

/**********************************************************
 * 🔑 SHA-256 Hash
 **********************************************************/
async function generateHash(text) {
  const data = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
