import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDwAw1NwlnBfrIuusHefT7OuJ-qFqzTMY4",
  authDomain: "vc-aplikasi.firebaseapp.com",
  databaseURL: "https://vc-aplikasi-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "vc-aplikasi",
  storageBucket: "vc-aplikasi.firebasestorage.app",
  messagingSenderId: "11654741663",
  appId: "1:11654741663:web:b90749d6be82da9866acaa",
  measurementId: "G-21HS5K64LV"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
