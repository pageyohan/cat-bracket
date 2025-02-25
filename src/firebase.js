// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAgV9ud9-5kDs62Z7ELjExabdEu7nK_jr8",
    authDomain: "gif-51a33.firebaseapp.com",
    projectId: "gif-51a33",
    storageBucket: "gif-51a33.firebasestorage.app",
    messagingSenderId: "875853543599",
    appId: "1:875853543599:web:3e9aee69d31939b81e3c5a"
  };


// Initialiser Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
