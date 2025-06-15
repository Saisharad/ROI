import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeApp } from "firebase/app";

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
const auth = getAuth(app);

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser: user, login, logout }}>

      {!loading && children}
    </AuthContext.Provider>
  );
};
