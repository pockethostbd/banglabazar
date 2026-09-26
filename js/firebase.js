import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCa3miuF5YPQEKbai0Y-IK0IpTXWki7Bjk",
  authDomain: "banglabazarbd.firebaseapp.com",
  projectId: "banglabazarbd",
  storageBucket: "banglabazarbd.firebasestorage.app",
  messagingSenderId: "857609771799",
  appId: "1:857609771799:web:db2e86b6c23f43a0c5b552",
  measurementId: "G-YMCJLZT913"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, doc, setDoc, getDoc, collection, getDocs, deleteDoc, serverTimestamp };
