import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Original FireForce Project (For Authentication ONLY)
const fireForceConfig = {
  apiKey: "AIzaSyBqKPS-7zfSiKCZONwV-NCAJ82qzOmKobs",
  authDomain: "fireforce-392c3.firebaseapp.com",
  projectId: "fireforce-392c3",
  storageBucket: "fireforce-392c3.firebasestorage.app",
  messagingSenderId: "311404571330",
  appId: "1:311404571330:web:931f17302f8c242f09e95b",
  measurementId: "G-ZNNXCJB63D"
};

// AegisAir Project (For Data: Firestore & RTDB)
const aegisAirConfig = {
  apiKey: "AIzaSyCAtiqO3kdpV8SgMJ61uUbifJC467g-kTw",
  authDomain: "aegisair-72ebd.firebaseapp.com",
  databaseURL: "https://aegisair-72ebd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aegisair-72ebd",
  storageBucket: "aegisair-72ebd.firebasestorage.app",
  messagingSenderId: "927680457563",
  appId: "1:927680457563:web:0f991af68c6c760f1b087e",
  measurementId: "G-736H36FLB7"
};

// Initialize FireForce (Default App - Auth)
const fireForceApp = getApps().length === 0 ? initializeApp(fireForceConfig) : getApp();

// Initialize AegisAir (Secondary App - Data)
const aegisAirApp = getApps().find(app => app.name === "AegisAir") || initializeApp(aegisAirConfig, "AegisAir");

const auth = getAuth(fireForceApp);
const db = getFirestore(aegisAirApp);
const rtdb = getDatabase(aegisAirApp);

export { auth, db, rtdb };
