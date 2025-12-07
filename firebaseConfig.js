import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Konfigurasi ini menghubungkan aplikasi React Native dengan layanan Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCclhy4OPHyUGm3hjgGXmcA_js7sHT1-co",
  authDomain: "dompetmahasiswa-10cba.firebaseapp.com",
  projectId: "dompetmahasiswa-10cba",
  storageBucket: "dompetmahasiswa-10cba.firebasestorage.app",
  messagingSenderId: "663387829892",
  appId: "1:663387829892:web:683938b01b00147f4774d1",
};

// Inisialisasi aplikasi Firebase
const app = initializeApp(firebaseConfig);
// Ekspor modul Auth (Login) dan Firestore (Database) agar bisa dipakai di file lain
export const auth = getAuth(app);
export const db = getFirestore(app);
