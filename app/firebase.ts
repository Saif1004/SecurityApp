import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyD30npyrMIe1LgD2T-_6mHE0DDtZ9gbTBI",
    authDomain: "aegis-expo.firebaseapp.com",
    projectId: "aegis-expo",
    storageBucket: "aegis-expo.appspot.com",
    messagingSenderId: "455327001497",
    appId: "1:455327001497:web:c4d06bd1ec25cd94604108",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);

export { auth };
