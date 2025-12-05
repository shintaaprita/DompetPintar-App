💰 Dompet Pintar - Aplikasi Manajemen Keuangan Mahasiswa

👥 Kelompok 7

Kelas: 5.E
Anggota Tim:
- Naysyla Qurratu Aq'yuni Tanjung - 701230106 
 (Role: Desain ERD, Architecture Diagram, Desain PPT, coding modul login, penyusunan product backlog, testing, deployment)
- Sinta Aprita Sari - 701230307
 (Role: Backend, Membuat Desain UI, Penyusunan product backlog, coding modul beranda, testing, deployment)
- Susilawati - 701230103 
(Role: Desain Activity Diagram, Class Diagram, Penyusunan product backlog, testing, deployment)


📖 Deskripsi Singkat Dompetku
Dompet Pintar adalah aplikasi pencatatan keuangan sederhana yang dirancang khusus dengan pendekatan Agile untuk memenuhi kebutuhan mahasiswa. Aplikasi ini memungkinkan pengguna mencatat pemasukan (seperti kiriman orang tua, beasiswa) dan pengeluaran (makan, kos, transport) secara real-time, serta menyediakan fitur reminder untuk mengingatkan pembayaran tagihan rutin.

🎯 Tujuan & Solusi

Permasalahan:
- Mahasiswa sering kehabisan uang di akhir bulan tanpa tahu kemana uangnya pergi.
- Sering lupa membayar tagihan rutin (uang kas, iuran sampah, kosan).
- Kesulitan melakukan rekapitulasi keuangan manual.


Solusi Sistem:
- Pencatatan Digital : Menyimpan data transaksi di Cloud (Firebase) agar aman dan bisa diakses kapan saja.
- Kategori Custom: Pengguna bisa menambah kategori pengeluaran sendiri sesuai gaya hidup.
- Smart Reminder: Notifikasi alarm lokal untuk mengingatkan tanggal jatuh tempo tagihan.
- Visualisasi Data: Grafik ringkasan untuk membandingkan Pemasukan vs Pengeluaran.

 
🛠️ Teknologi yang Digunakan

Framework: React Native (Expo SDK 52)
Bahasa Pemrograman: TypeScript / JavaScript
Database: Cloud Firestore (NoSQL)


🚀 Cara Menjalankan Aplikasi (Local Development)

Ikuti langkah ini jika ingin menjalankan source code di laptop Anda:

1. Prasyarat
Pastikan sudah menginstal:
Node.js (LTS Version)
Git

2. Instalasi
Clone repository ini dan masuk ke folder project:
git clone [MASUKKAN LINK GITHUB KALIAN DI SINI]
cd FinalProject_DompetPintar
npm install

3. Konfigurasi Firebase (PENTING)
Buat file baru bernama firebaseConfig.js di root folder, lalu isi dengan kredensial Firebase Anda:

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "API_KEY_ANDA",
  authDomain: "PROJECT_ID.firebaseapp.com",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.firebasestorage.app",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

4. Menjalankan Project
Nyalakan server development:
npx expo start -c


Scan QR Code yang muncul menggunakan aplikasi Expo Go di Android/iOS.

📱 Link Deployment & Demo

Link Deployment: 

Link Download APK: https://expo.dev/accounts/shintaprita/projects/dompet-mahasiswa/builds/2b183b01-fef1-4e7a-9cf4-b0a5ca7fc7e2 atau https://drive.google.com/file/d/1cuO6t3hy8UHYDJAdViLIt7QXdVVo3kY0/view?usp=sharing
(Silakan download dan install di HP Android untuk pengujian penuh)

Link Video Demo Aplikasi: [MASUKKAN LINK YOUTUBE / DRIVE VIDEO DEMO DI SINI]


🔑 Akun Demo 

Anda dapat menggunakan akun ini untuk login tanpa harus registrasi ulang:

Email: testing@gmail.com
Password: 87654321

📸 Screenshots Tampilan Aplikasi 
Bisa dilihat pada link ini: https://drive.google.com/drive/folders/1FyJ3XTeez0LxAgO6GwgkE-f4woR70nbi?usp=sharing


📝 Catatan Tambahan

- Koneksi Internet: Aplikasi membutuhkan koneksi internet stabil untuk sinkronisasi data ke Firebase.
- Untuk menghapus daftar tagihan kamu cukup tekan lama pada daftar yang ingin dihapus kemudian daftar akan langsung terhapus.
- Untuk menghapus salah satu transaksi kamu cukup tekan lama pada data kemudian akan muncul notifikasi pop up tekan ya untuk hapus data.


Tugas Final Project Mata Kuliah Rekayasa Perangkat Lunak Dosen Pengampu: Dila Nurlaila, M.Kom
Universitas: UIN Sulthan Thaha Saifuddin Jambi