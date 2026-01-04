// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBL6_ayjQp_p01otlmdmi2FDZXZDhUIi_g",
    authDomain: "kick-system.firebaseapp.com",
    projectId: "kick-system",
    storageBucket: "kick-system.firebasestorage.app",
    messagingSenderId: "829078366710",
    appId: "1:829078366710:web:ef61b61f84127daa0c7fd7",
    measurementId: "G-9CRNVD9X67"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);