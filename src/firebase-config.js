// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD_hCr0w3g04QXOmWKWVW0zaIpt6afoIqA",
  authDomain: "caseflow-a3e49.firebaseapp.com",
  projectId: "caseflow-a3e49",
  storageBucket: "caseflow-a3e49.firebasestorage.app",
  messagingSenderId: "64760007932",
  appId: "1:64760007932:web:d1a30e40c72a8989d8db79",
  measurementId: "G-MNVCMX9PYL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);