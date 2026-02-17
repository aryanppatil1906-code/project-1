/*****************************************************
 *  FIREBASE IMPORTS
 *****************************************************/
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

/*****************************************************
 * FIREBASE CONFIG
 *****************************************************/
const firebaseConfig = {
  apiKey: "AIzaSyBEJxGdXES3OUYoq8sVgpxbm9v0hIe1MPQ",
  authDomain: "crowdfunding-dapp-483f7.firebaseapp.com",
  projectId: "crowdfunding-dapp-483f7",
  storageBucket: "crowdfunding-dapp-483f7.firebasestorage.app",
  messagingSenderId: "510264782244",
  appId: "1:510264782244:web:3ebb91f3de6f3a05eda531"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const loginbtn=document.querySelector(".login-Btn");
const signupbtn=document.querySelector(".signup-Btn");
loginbtn.addEventListener("click",()=>{
  window.location.href="login.html";
})
signupbtn.addEventListener("click",()=>{
  window.location.href="signup.html";
})
/*****************************************************
 *  WALLET STATE
 *****************************************************/
let selectedWallet = null;

/*****************************************************
 *  METAMASK CONNECT (OPTIONAL)
 *****************************************************/
const connectBtn = document.getElementById("connectWalletBtn");
const walletInput = document.getElementById("walletInput");
const walletDisplay = document.getElementById("walletDisplay");

if (connectBtn) {
  connectBtn.addEventListener("click", async () => {

    if (!window.ethereum) {
      alert("MetaMask not installed");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts"
      });

      selectedWallet = accounts[0];
      walletInput.value = selectedWallet;

      walletDisplay.innerText =
        "Using MetaMask wallet: " +
        selectedWallet.slice(0, 6) +
        "..." +
        selectedWallet.slice(-4);

    } catch {
      alert("Wallet connection rejected");
    }
  });
}

/*****************************************************
 * SIGNUP
 *****************************************************/
const signupForm = document.querySelector(".signupcard");

if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    createUserWithEmailAndPassword(
      auth,
      signupForm.email.value,
      signupForm.password.value
    )
      .then(() => window.location.href = "login.html")
      .catch(err => alert(err.message));
  });
}

/*****************************************************
 * LOGIN
 *****************************************************/
const loginForm = document.querySelector(".loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    signInWithEmailAndPassword(
      auth,
      loginForm.email.value,
      loginForm.password.value
    )
      .then(() => window.location.href = "mainAfterLogin.html")
      .catch(err => alert(err.message));
  });
}

/*****************************************************
 * LOGOUT
 *****************************************************/
const logoutBtn = document.querySelector(".logoutBtn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth);
    window.location.href = "login.html";
  });
}
const profileBtn = document.querySelector(".profile");

if (profileBtn) {
  profileBtn.addEventListener("click", () => {
    window.location.href = "profile.html";
  });
}
const historyBtn = document.querySelector(".history");
if (historyBtn) {
  historyBtn.addEventListener("click", () => {
    window.location.href = "transactions.html";
  });
}
/*****************************************************
 * START CAMPAIGN
 *****************************************************/
const startCampaign = document.querySelector("#start-campaign");

if (startCampaign) {
  startCampaign.addEventListener("click", () => {
    auth.currentUser
      ? window.location.href = "form.html"
      : window.location.href = "login.html";
  });
}

/*****************************************************
 * CREATE CAMPAIGN
 *****************************************************/
const campaignForm = document.querySelector(".form");

if (campaignForm) {
  campaignForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!auth.currentUser) {
      alert("Please login first");
      return;
    }

    const finalWallet = document.querySelector("#walletAddress").value.trim();

    if (!finalWallet) {
      alert("Please enter or connect a wallet address");
      return;
    }

    // Ethereum address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(finalWallet)) {
      alert("Invalid Ethereum wallet address");
      return;
    }

    try {
      await addDoc(collection(db, "campaigns"), {
        title: campaignForm.title.value,
        description: campaignForm.description.value,
        goal: Number(campaignForm.goal.value),
        deadline: campaignForm.deadline.value,
        walletAddress: finalWallet,
        type: campaignForm.type.value,
        raised: 0,
        ownerId: auth.currentUser.uid,
        walletAddress: finalWallet,
        createdAt: Date.now(),
        status: "active"
      });

      alert("Campaign created successfully 🚀");
      campaignForm.reset();
      window.location.href = "campaignList.html";

    } catch (err) {
      alert(err.message);
    }
  });
}

/*****************************************************
 * MY CAMPAIGNS
 *****************************************************/
const myCampaignsDiv = document.querySelector("#myCampaigns");

onAuthStateChanged(auth, async (user) => {
  if (!user || !myCampaignsDiv) return;

  const q = query(
    collection(db, "campaigns"),
    where("ownerId", "==", user.uid)
  );

  const snapshot = await getDocs(q);
  myCampaignsDiv.innerHTML = "";

  snapshot.forEach((doc) => {
    const d = doc.data();
    myCampaignsDiv.innerHTML += `
      <div class="card">
        <h3>${d.title}</h3>
        <p>${d.description}</p>
        <p><b>Goal:</b> ₹${d.goal}</p>
        <p><b>Raised:</b> ₹${d.raised}</p>
        <p><b>Wallet:</b> ${d.walletAddress.slice(0,6)}...${d.walletAddress.slice(-4)}</p>
      </div>
    `;
  });
});

/*****************************************************
 * ALL CAMPAIGNS
 *****************************************************/
const campaignListDiv = document.querySelector("#campaignList");
const searchInput = document.querySelector("#searchInput");

let allCampaigns = [];

async function loadCampaigns() {
  if (!campaignListDiv) return;

  const snapshot = await getDocs(collection(db, "campaigns"));
  allCampaigns = [];

  snapshot.forEach(doc => {
    allCampaigns.push({ id: doc.id, ...doc.data() });
  });

  renderCampaigns(allCampaigns);
}

function renderCampaigns(campaigns) {
  campaignListDiv.innerHTML = "";

  campaigns.forEach(c => {
    campaignListDiv.innerHTML += `
      <a href="campaign.html?id=${c.id}" style="text-decoration:none;color:inherit">
        <div class="card">
          <h3>${c.title}</h3>
          <p>${c.description}</p>
          <p><b>Goal:</b> ₹${c.goal}</p>
        </div>
      </a>
    `;
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    const value = searchInput.value.toLowerCase();
    renderCampaigns(
      allCampaigns.filter(c =>
        c.title.toLowerCase().includes(value) ||
        c.description.toLowerCase().includes(value)
      )
    );
  });
}
loadCampaigns();