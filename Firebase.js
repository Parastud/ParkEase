import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDpTGLuctyb6DMwYqxQTBW-9kPP20d_fu4",
  authDomain: "parkease-parastud.firebaseapp.com",
  projectId: "parkease-parastud",
  storageBucket: "parkease-parastud.appspot.com",
  messagingSenderId: "444176514449",
  appId: "1:444176514449:web:8fbe1fb7dc168cf775ee30",
  measurementId: "G-PLBX6LZFEC"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Function to check if user is logged in
const checkAuthState = () => {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        AsyncStorage.setItem('userSession', JSON.stringify({
          uid: user.uid,
          email: user.email,
          lastLogin: new Date().toISOString()
        }));
      } else {
        // User is signed out
        AsyncStorage.removeItem('userSession');
      }
      resolve(user);
    });
  });
};

export { auth, db, checkAuthState };