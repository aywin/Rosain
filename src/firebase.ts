import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCj99tArHA2sYDrxg1-6_vMke1WWBMWJ_Q",
  authDomain: "rosaine-676f4.firebaseapp.com",
  projectId: "rosaine-676f4",
  storageBucket: "rosaine-676f4.firebasestorage.app",
  messagingSenderId: "985031607236",
  appId: "1:985031607236:web:705e4eadc86d8f476d1a91",
  measurementId: "G-S6QE66FTZ2"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
