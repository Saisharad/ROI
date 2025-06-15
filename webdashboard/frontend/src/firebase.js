// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDtLybcl2mLCjcAFjxyqZ8dVT2fWz4QluA",
  authDomain: "roi-intrusion.firebaseapp.com",
  projectId: "roi-intrusion",
  storageBucket: "roi-intrusion.firebasestorage.app",
  messagingSenderId: "794529601931",
  appId: "1:794529601931:web:ed92e53b34e0532aee378e",
  measurementId: "G-V0BQ1N6KPE"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
