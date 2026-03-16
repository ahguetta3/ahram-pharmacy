import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAhUn7gFecRoBkPhwVYkkshLCjByis_GMg",
  authDomain: "pharmacie-alahram.firebaseapp.com",
  projectId: "pharmacie-alahram",
  storageBucket: "pharmacie-alahram.firebasestorage.app",
  messagingSenderId: "864118139050",
  appId: "1:864118139050:web:760518a41223a73c4948d3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
