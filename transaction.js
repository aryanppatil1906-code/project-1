/************************************************************
 * Firebase Initialization
 ************************************************************/
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/************************************************************
 * Firebase Config
 ************************************************************/
const firebaseConfig = {
  apiKey: "AIzaSyBEJxGdXES3OUYoq8sVgpxbm9v0hIe1MPQ",
  authDomain: "crowdfunding-dapp-483f7.firebaseapp.com",
  projectId: "crowdfunding-dapp-483f7",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const table = document.getElementById("txTable");

/************************************************************
 * Load Transactions (Blockchain Correct)
 ************************************************************/
async function loadTransactions() {

  const q = query(
    collection(db, "donations"),
    orderBy("timestamp", "asc")
  );

  const snapshot = await getDocs(q);

  // 🔐 Maintain chain PER campaign
  const campaignChains = {};

  table.innerHTML = "";

  for (const docSnap of snapshot.docs) {
    const d = docSnap.data();

    // Initialize chain for campaign
    if (!campaignChains[d.campaignId]) {
      campaignChains[d.campaignId] = {
        prevHash: "GENESIS",
        broken: false
      };
    }

    const chain = campaignChains[d.campaignId];

    const text =
      d.campaignId +
      d.userId +
      d.amount +
      d.timestamp +
      d.prevHash;

    const calculatedHash = await generateHash(text);

    // 🔍 self integrity
    if (calculatedHash !== d.hash) {
      chain.broken = true;
    }

    // 🔗 chain integrity
    if (d.prevHash !== chain.prevHash) {
      chain.broken = true;
    }

    const status = chain.broken ? "❌ Tampered" : "✅ Valid";
    chain.prevHash = d.hash;

    const campSnap = await getDoc(doc(db, "campaigns", d.campaignId));
    const campTitle = campSnap.exists()
      ? campSnap.data().title
      : "Deleted";

    table.innerHTML += `
      <tr>
        <td>${campTitle}</td>
        <td>${d.userId.slice(0, 6)}***</td>
        <td>₹${d.amount}</td>
        <td>${new Date(d.timestamp).toLocaleString()}</td>
        <td>${status}</td>
      </tr>
    `;
  }
}

loadTransactions();

/************************************************************
 * SHA-256 Hash Generator
 ************************************************************/
async function generateHash(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
