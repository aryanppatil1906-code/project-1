/*****************************************************
 *  FIREBASE IMPORTS
 *****************************************************/

// Firebase app initialize karne ke liye
import { initializeApp } from 
"https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

// Firestore database ke required functions
import {
  getFirestore,   // Firestore instance
  collection,    // collection reference
  getDocs,        // documents fetch karne ke liye
  query,          // query banane ke liye
  where,          // query condition ke liye
  doc,            // specific document reference
  getDoc          // single document fetch karne ke liye
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase Authentication
import { 
  getAuth, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";


/*****************************************************
 * FIREBASE CONFIGURATION
 *****************************************************/

// Firebase project ka config (Firebase Console se milta hai)
const firebaseConfig = {
  apiKey: "AIzaSyBEJxGdXES3OUYoq8sVgpxbm9v0hIe1MPQ",
  authDomain: "crowdfunding-dapp-483f7.firebaseapp.com",
  projectId: "crowdfunding-dapp-483f7",
};

// Firebase app initialize
const app = initializeApp(firebaseConfig);

// Firestore & Auth instances
const db = getFirestore(app);
const auth = getAuth(app);


/*****************************************************
 *  HTML ELEMENTS
 *****************************************************/

// User ke campaigns dikhane ke liye div
const myCampaignsDiv = document.getElementById("myCampaigns");

// User ke donations dikhane ke liye div
const myDonationsDiv = document.getElementById("myDonations");


/*****************************************************
 *  AUTH STATE CHECK
 *****************************************************/

// Ye function automatically chalta hai jab:
// user login kare / logout kare / page refresh ho
onAuthStateChanged(auth, async (user) => {

  // Agar user login nahi hai
  if (!user) {
    alert("Please login first");
    window.location.href = "login.html";
    return;
  }

  // Agar user login hai → uske campaigns & donations load karo
  loadMyCampaigns(user.uid);
  loadMyDonations(user.uid);
});


/*****************************************************
 *  LOAD USER'S CAMPAIGNS
 *****************************************************/

async function loadMyCampaigns(uid) {

  // Query: sirf wahi campaigns lao jinke ownerId = user uid ho
  const q = query(
    collection(db, "campaigns"),
    where("ownerId", "==", uid)
  );

  // Firestore se data fetch
  const snapshot = await getDocs(q);

  // Agar user ne koi campaign nahi banaya
  if (snapshot.empty) {
    myCampaignsDiv.innerHTML =
      "<p class='muted'>No campaigns created yet.</p>";
    return;
  }

  // Har campaign ko UI pe show karo
  snapshot.forEach((docSnap) => {
    const c = docSnap.data();

    myCampaignsDiv.innerHTML += `
      <div class="card">
        <h3>${c.title}</h3>
        <p>${c.description}</p>
        <p><b>Goal:</b> ₹${c.goal}</p>
        <p><b>Raised:</b> ₹${c.raised}</p>
        <p><b>Status:</b> ${c.status}</p>
      </div>
    `;
  });
}


/*****************************************************
 * LOAD USER'S DONATIONS
 *****************************************************/

async function loadMyDonations(uid) {

  // Query: sirf wahi donations lao jo current user ne kiye ho
  const q = query(
    collection(db, "donations"),
    where("userId", "==", uid)
  );

  const snapshot = await getDocs(q);

  // Agar koi donation nahi hai
  if (snapshot.empty) {
    myDonationsDiv.innerHTML =
      "<p class='muted'>No donations yet.</p>";
    return;
  }

  // Har donation ke liye
  for (const docSnap of snapshot.docs) {
    const d = docSnap.data();

    // Donation ke campaign ka title laana
    const campSnap = await getDoc(
      doc(db, "campaigns", d.campaignId)
    );

    // Agar campaign exist karta hai =>title, warna "Deleted Campaign"
    const campTitle = campSnap.exists()
      ? campSnap.data().title
      : "Deleted Campaign";

    // Donation UI me show karo
    myDonationsDiv.innerHTML += `
      <div class="card">
        <h3>${campTitle}</h3>
        <p><b>Amount:</b> ₹${d.amount}</p>
        <p class="muted">
          ${new Date(d.timestamp).toLocaleString()}
        </p>
      </div>
    `;
  }
}
