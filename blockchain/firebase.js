import { initializeApp } from
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import { getFirestore } from
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

import { getAuth } from
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBEJxGdXES3OUYoq8sVgpxbm9v0hIe1MPQ",
  authDomain: "crowdfunding-dapp-483f7.firebaseapp.com",
  projectId: "crowdfunding-dapp-483f7",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
