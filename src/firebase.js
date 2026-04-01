import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBjair0AemU8GGbGN8V3OEIBZo35bs1O9Y",
  authDomain: "alianza-b7y88v.firebaseapp.com",
  projectId: "alianza-b7y88v",
  storageBucket: "alianza-b7y88v.appspot.com",
  messagingSenderId: "1021628575366",
  appId: "1:1021628575366:web:62dd3343b5369415b7eb07"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "europe-central2");
export default app;