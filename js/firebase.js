// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBcoBuhRhda3kpH-M2_3ndTQNPrKcJE4Cw",
  authDomain: "family-finance-9c759.firebaseapp.com",
  projectId: "family-finance-9c759",
  storageBucket: "family-finance-9c759.firebasestorage.app",
  messagingSenderId: "35164479230",
  appId: "1:35164479230:web:b7aba61867e697367a0faf",
  measurementId: "G-QGPYC2H2DZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

