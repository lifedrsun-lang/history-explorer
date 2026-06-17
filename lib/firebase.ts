import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAX32w0bL2CQQ4mcuVeDO10Ws715rG1dT8",
  authDomain: "history-quest-b8e96.firebaseapp.com",
  projectId: "history-quest-b8e96",
  storageBucket: "history-quest-b8e96.firebasestorage.app",
  messagingSenderId: "381557322557",
  appId: "1:381557322557:web:25d19c2728bae485e10b54",
  measurementId: "G-5SYGFZ9XJY",
};

const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApp();

export const db = getFirestore(app);