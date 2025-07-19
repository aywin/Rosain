import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// Analytics est optionnel, tu peux l’enlever si tu ne t’en sers pas
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCj99tArHA2sYDrxg1-6_vMke1WWBMWJ_Q",
  authDomain: "rosaine-676f4.firebaseapp.com",
  projectId: "rosaine-676f4",
  storageBucket: "rosaine-676f4.appspot.com",
  messagingSenderId: "985031607236",
  appId: "1:985031607236:web:705e4eadc86d8f476d1a91",
  measurementId: "G-S6QE66FTZ2"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
// export const analytics = getAnalytics(app); // seulement si tu veux utiliser analytics
