import { initializeApp, getApps, getApp } from "firebase/app";
import {
  browserSessionPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
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
export const auth = getAuth(app);

// Teacher authentication must not remain signed in indefinitely on shared
// school computers. Keep the Firebase Auth session only for the lifetime of
// the current browser session. Refreshing the page stays signed in, while
// closing the browser requires a fresh teacher sign-in next time.
if (typeof window !== "undefined") {
  void setPersistence(auth, browserSessionPersistence).catch((error) => {
    console.error("Failed to configure Firebase Auth session persistence:", error);
  });
}
