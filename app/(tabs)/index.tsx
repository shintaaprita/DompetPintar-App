import React, { useState, useEffect } from 'react';
// Import komponen UI bawaan React Native
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, Keyboard } from 'react-native';
// Import ikon dari Expo vector icons
import { Ionicons } from '@expo/vector-icons';
// Import modul notifikasi untuk fitur alarm
import * as Notifications from 'expo-notifications'; // Mengimpor modul notifikasi dari Expo untuk fitur alarm/pengingat

// Mengimpor konfigurasi database (db) dan autentikasi (auth) dari file config
import { auth, db } from '../../firebaseConfig'; 
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, query, onSnapshot, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

// --- KONFIGURASI NOTIFIKASI ---
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Data default untuk kategori agar user tidak perlu mengetik manual dari awal
const DEFAULT_PENGELUARAN = ['Makan', 'Transport', 'Kosan', 'Belanja', 'Tagihan'];
const DEFAULT_PEMASUKAN = ['Gaji', 'Kiriman', 'Bonus', 'Freelance'];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // useEffect ini dijalankan sekali saat aplikasi dibuka untuk meminta izin notifikasi
  useEffect(() => {
    async function registerForPushNotificationsAsync() {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
    }
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    // Fungsi listener ini memantau status login user secara real-time
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      // Jika user login, simpan data user ke state
      setUser(u);
      // Matikan loading indicator karena proses cek sudah selesai
      setLoading(false);
    });
    // Membersihkan listener saat komponen tidak digunakan lagi
    return unsubscribe;
  }, []);

  // Tampilkan loading spinner jika sedang memuat
  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4f46e5" /></View>;
  // Logika navigasi sederhana: Jika ada user -> Dashboard, Jika tidak -> Login Screen
  return user ? <DashboardScreen user={user} /> : <LoginScreen />;
}

// LOGIN SCREEN
function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Toggle untuk pindah mode antara Login dan Daftar
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fungsi menangani tombol Masuk/Daftar
  const handleAuth = async () => {
    // Validasi input (cegah form kosong/password pendek)
    if (!email || !password) return Alert.alert("Eits!", "Email dan Password wajib diisi ya.");
    if (password.length < 8) return Alert.alert("Password Pendek", "Password minimal 8 karakter.");

    setLoading(true);
    try {
      if (isRegister) {
        // Daftar: Buat akun di Firebase > Logout > Suruh login ulang
        await createUserWithEmailAndPassword(auth, email, password);
        await signOut(auth); 
        Alert.alert("Sukses", "Akun berhasil dibuat! Silakan login.");
        setIsRegister(false);
      } else {
        // Login: Cek kredensial ke firebase
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      // Error Handling: Menerjemahkan kode error mesin ke bahasa manusia
      let pesanError = "Terjadi kesalahan coba cek kembali";
      if (err.code === 'auth/email-already-in-use') pesanError = "Akun ini sudah terdaftar.";
      else if (err.code === 'auth/invalid-email') pesanError = "Format email salah.";
      else if (err.code === 'auth/user-not-found') pesanError = "Email belum terdaftar.";
      else if (err.code === 'auth/invalid-credential') pesanError = "Duh Password salah nih";
      Alert.alert("Gagal", pesanError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.loginContainer}>
      {/* Logo Aplikasi */}
      <View style={styles.iconBulat}><Ionicons name="wallet" size={40} color="#fff" /></View>
      <Text style={styles.judulLogin}>{isRegister ? 'Daftar Akun' : 'Login Dompet'}</Text>
      
      {/* Input Email */}
      <View style={styles.inputBox}>
        <Ionicons name="mail" size={20} color="#9ca3af" />
        <TextInput placeholder="Email..." style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address"/>
      </View>
      
      {/* Input Password */}
      <View style={styles.inputBox}>
        <Ionicons name="lock-closed" size={20} color="#9ca3af" />
        <TextInput placeholder="Password min-8 karakter" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
      </View>

      {/* Tombol Aksi */}
      <TouchableOpacity style={styles.tombolLogin} onPress={handleAuth} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.teksTombol}>{isRegister ? 'Daftar Sekarang' : 'Masuk Aplikasi'}</Text>}
      </TouchableOpacity>

      {/* Link ganti mode Login/Daftar */}
      <TouchableOpacity onPress={() => setIsRegister(!isRegister)} style={{marginTop: 20}}>
        <Text style={{color: '#4f46e5', fontWeight:'600'}}>{isRegister ? 'Sudah punya akun? Login di sini' : 'Belum punya akun? Daftar dulu'}</Text>
      </TouchableOpacity>
    </View>
  );
}

// DASHBOARD UTAMA (SETELAH LOGIN)
function DashboardScreen({ user }: any) {
  // State untuk menyimpan data transaksi dan reminder dari database
  const [transactions, setTransactions] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);

  // State untuk Modal Transaksi (Input Pemasukan/Pengeluaran)
  const [modalVisible, setModalVisible] = useState(false);
  const [tipe, setTipe] = useState('pemasukan'); 
  const [nominal, setNominal] = useState('');
  const [catatan, setCatatan] = useState(''); 
  const [kategori, setKategori] = useState(''); 

  // State untuk Kategori Dinamis
  const [listKatPengeluaran, setListKatPengeluaran] = useState<string[]>(DEFAULT_PENGELUARAN);
  const [listKatPemasukan, setListKatPemasukan] = useState<string[]>(DEFAULT_PEMASUKAN);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // State untuk Modal Reminder (Tagihan)
  const [modalReminderVisible, setModalReminderVisible] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderAmount, setReminderAmount] = useState(''); 
  const [reminderDate, setReminderDate] = useState(''); 

  // Tab aktif (Transaksi vs Ringkasan)
  const [activeTab, setActiveTab] = useState('transaksi');

  useEffect(() => {
    // Cek keamanan: Pastikan ada User ID sebelum mengambil data
    if (!user?.uid) return;
    // Membuat query untuk mengambil data dari koleksi 'transactions' milik user tersebut
    // orderBy('createdAt', 'desc') mengurutkan data dari yang paling baru
    const q = query(collection(db, 'users', user.uid, 'transactions'), orderBy('createdAt', 'desc'));
    // onSnapshot: Fitur Real-time Firebase.
    // Kode ini akan 'mendengarkan' database. Jika ada data baru masuk/dihapus,
    // aplikasi otomatis memperbarui tampilan tanpa perlu di-refresh.
    const unsub = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'users', user.uid, 'reminders'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setReminders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, [user.uid]);

  // Filter semua transaksi bertipe 'pemasukan', lalu jumlahkan totalnya
  const pemasukan = transactions.filter(t => t.type === 'pemasukan').reduce((acc, t) => acc + t.amount, 0);
  // Filter semua transaksi bertipe 'pengeluaran', lalu jumlahkan totalnya
  const pengeluaran = transactions.filter(t => t.type === 'pengeluaran').reduce((acc, t) => acc + t.amount, 0);
  // Hitung sisa saldo saat ini (Total Pemasukan dikurang Total Pengeluaran)
  const saldo = pemasukan - pengeluaran;

  // Fungsi grouping untuk Ringkasan/Chart (Mengelompokkan pengeluaran berdasarkan kategori)
  const groupByCategory = (type: string) => {
    const summary: any = {};
    transactions.filter(t => t.type === type).forEach(t => {
      const kat = t.category || 'Lainnya';
      summary[kat] = (summary[kat] || 0) + t.amount;
    });
    return summary;
  };
  const ringkasanPengeluaran = groupByCategory('pengeluaran');
  const ringkasanPemasukan = groupByCategory('pemasukan');

  // Fungsi Logout
  const handleLogout = () => {
    Alert.alert("Keluar", "Yakin mau logout?", [
      { text: "Batal", style: "cancel" },
      { text: "Ya, Keluar", style: "destructive", onPress: () => signOut(auth) }
    ]);
  };

  // Fungsi Buka Modal Transaksi
  const bukaModal = (tipeBaru: string) => {
    setTipe(tipeBaru); setNominal(''); setCatatan(''); setIsAddingCategory(false); setNewCategoryName('');
    setKategori(tipeBaru === 'pemasukan' ? listKatPemasukan[0] : listKatPengeluaran[0]);
    setModalVisible(true);
  };

  // Fungsi Tambah Kategori Baru (di dalam modal)
  const handleTambahKategori = () => {
    if(!newCategoryName) return;
    if(tipe === 'pemasukan') setListKatPemasukan([...listKatPemasukan, newCategoryName]);
    else setListKatPengeluaran([...listKatPengeluaran, newCategoryName]);
    setKategori(newCategoryName); setIsAddingCategory(false); setNewCategoryName('');
  };

  // Logika create data transaksi
  const handleSimpan = () => {
    if (!nominal) return Alert.alert("Eits!", "Nominal kosong.");
    let finalCategory = kategori;
    if (isAddingCategory && newCategoryName) finalCategory = newCategoryName;

    // Menyiapkan objek data yang akan dikirim ke database
    const dataBaru = { type: tipe, amount: parseInt(nominal), category: finalCategory, note: catatan || finalCategory, createdAt: serverTimestamp() };
    setModalVisible(false); Keyboard.dismiss();
    // Mengirim data ke Firestore pada path: users -> [UserID] -> transactions (simpan ke database)
    addDoc(collection(db, 'users', user.uid, 'transactions'), dataBaru);
  };

  // Logika hapus data
  const handleDelete = (id: string) => {
    Alert.alert("Hapus?", "Yakin hapus data ini?", [{ text: "Batal" }, { text: "Hapus", onPress: () => deleteDoc(doc(db, 'users', user.uid, 'transactions', id)) }]);
  };

  // --- LOGIKA ALARM REMINDER ---
  const jadwalkanNotifikasi = async (judul: string, nominal: string, tgl: number) => {
    const now = new Date();
    let triggerDate = new Date();
    
    // Set target ke tanggal yang user pilih
    triggerDate.setDate(tgl);
    triggerDate.setHours(9, 0, 0, 0); // ALARM BUNYI JAM 09:00 PAGI

    // Logika Pintar:
    // Jika tanggal yang dipilih SUDAH LEWAT hari ini (misal sekarang tgl 5, pilih tgl 2)
    // Maka alarm diset untuk BULAN DEPAN.
    if (triggerDate <= now) {
      triggerDate.setMonth(triggerDate.getMonth() + 1);
    }

    // Hitung durasi detik dari sekarang sampai waktu alarm
    const seconds = (triggerDate.getTime() - now.getTime()) / 1000;

    // Perintah ke sistem HP untuk menjadwalkan notifikasi lokal
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 WARNING!",
        body: `Jangan lupa bayar ${judul} sesuai jadwal sebesar Rp ${nominal} ya`,
      },
      trigger: { 
       // type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds, 
      },
    });

    const bulanIndo = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    Alert.alert("Alarm Diset ✅", `Akan bunyi tgl ${triggerDate.getDate()} ${bulanIndo[triggerDate.getMonth()]} jam 09:00 Pagi.`);
  };

  // Simpan Reminder ke Database & Jadwalkan Alarm
  const handleSimpanReminder = () => {
    if (!reminderTitle || !reminderDate || !reminderAmount) return Alert.alert("Eits", "Isi lengkap ya.");
    
    // TUTUP MODAL DULUAN (Biar Terasa Cepat)
    setModalReminderVisible(false);
    
    // Panggil fungsi penjadwalan notifikasi
    jadwalkanNotifikasi(reminderTitle, reminderAmount, parseInt(reminderDate));

    // Simpan data reminder ke database agar muncul di dashboard
    addDoc(collection(db, 'users', user.uid, 'reminders'), {
      title: reminderTitle, amount: parseInt(reminderAmount), date: parseInt(reminderDate), createdAt: serverTimestamp()
    });

    setReminderTitle(''); setReminderDate(''); setReminderAmount('');
  };

  const handleDeleteReminder = (id: string) => deleteDoc(doc(db, 'users', user.uid, 'reminders', id));

  // Helper function untuk format Rupiah
  const formatRupiah = (num: number) => 'Rp ' + (num || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Helper function untuk format Tanggal
  const formatTanggal = (timestamp: any) => {
    if (!timestamp) return 'Baru saja';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${date.getDate()}/${date.getMonth()+1} ${date.getHours()}:${date.getMinutes()}`;
  };

  const today = new Date().getDate();

  // === RENDER UI DASHBOARD ===
  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.salam}>Halo, {user.email.split('@')[0]}! 👋</Text>
            <Text style={styles.namaApp}>Dompet Pintar</Text>
          </View>
          <View style={{flexDirection:'row', gap:10}}>
             <TouchableOpacity onPress={() => setModalReminderVisible(true)} style={[styles.profilIcon, {backgroundColor:'#f59e0b'}]}><Ionicons name="notifications" size={20} color="#fff" /></TouchableOpacity>
             <TouchableOpacity onPress={handleLogout} style={styles.profilIcon}><Ionicons name="log-out" size={20} color="#fff" /></TouchableOpacity>
          </View>
        </View>

        {/* Kartu Saldo */}
        <View style={styles.cardSaldo}>
          <Text style={styles.labelSaldo}>Sisa Saldo Kamu</Text>
          <Text style={styles.angkaSaldo}>{formatRupiah(saldo)}</Text>
          <View style={styles.rowInfo}>
            <View style={styles.infoBox}>
              <View style={[styles.iconBox, { backgroundColor: '#dcfce7' }]}><Ionicons name="arrow-down" size={18} color="#16a34a" /></View>
              <View><Text style={styles.labelKecil}>Masuk</Text><Text style={styles.angkaKecil}>{formatRupiah(pemasukan)}</Text></View>
            </View>
            <View style={styles.infoBox}>
               <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}><Ionicons name="arrow-up" size={18} color="#dc2626" /></View>
              <View><Text style={styles.labelKecil}>Keluar</Text><Text style={styles.angkaKecil}>{formatRupiah(pengeluaran)}</Text></View>
            </View>
          </View>
        </View>

        {/* REMINDER SECTION */}
        {reminders.length > 0 && (
           <View style={{marginHorizontal:24, marginBottom:20}}>
             <Text style={styles.sectionTitle}>🔔 Pengingat & Alarm</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false}>
               {reminders.map((rem: any) => {
                 const isNear = rem.date - today <= 3 && rem.date - today >= 0;
                 return (
                   <TouchableOpacity key={rem.id} onLongPress={() => handleDeleteReminder(rem.id)} style={[styles.cardReminder, isNear && {borderColor:'#ef4444', borderWidth:1, backgroundColor:'#fef2f2'}]}>
                     <View>
                        <Text style={styles.tglReminder}>Tgl {rem.date}</Text>
                        <Text style={styles.judulReminder}>{rem.title}</Text>
                        <Text style={{fontSize:12, color:'#64748b', marginTop:2}}>{formatRupiah(rem.amount)}</Text>
                     </View>
                     {isNear && <Ionicons name="alert-circle" size={20} color="#ef4444"/>}
                   </TouchableOpacity>
                 )
               })}
             </ScrollView>
           </View>
        )}

        <View style={styles.tabContainer}>
           <TouchableOpacity onPress={() => setActiveTab('transaksi')} style={[styles.tabBtn, activeTab === 'transaksi' && styles.tabActive]}><Text style={[styles.tabText, activeTab === 'transaksi' && {color:'#fff'}]}>Transaksi</Text></TouchableOpacity>
           <TouchableOpacity onPress={() => setActiveTab('ringkasan')} style={[styles.tabBtn, activeTab === 'ringkasan' && styles.tabActive]}><Text style={[styles.tabText, activeTab === 'ringkasan' && {color:'#fff'}]}>Ringkasan</Text></TouchableOpacity>
        </View>

        {/* --- KONTEN UTAMA --- */}
        {activeTab === 'transaksi' ? (
          <>
            <View style={styles.menuRow}>
              <TouchableOpacity onPress={() => bukaModal('pemasukan')} style={{alignItems:'center'}}>
                <View style={[styles.btnBulat, {backgroundColor: '#dcfce7'}]}><Ionicons name="add" size={24} color="#16a34a"/></View>
                <Text style={styles.btnText}>Masuk</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => bukaModal('pengeluaran')} style={{alignItems:'center'}}>
                <View style={[styles.btnBulat, {backgroundColor: '#fee2e2'}]}><Ionicons name="remove" size={24} color="#dc2626"/></View>
                <Text style={styles.btnText}>Keluar</Text>
              </TouchableOpacity>
            </View>
            <View style={{paddingHorizontal: 24}}>
              {transactions.map((item: any) => (
                <TouchableOpacity key={item.id} onLongPress={() => handleDelete(item.id)} style={styles.transaksiItem}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: item.type === 'pemasukan' ? '#dcfce7' : '#fee2e2', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={item.type === 'pemasukan' ? "wallet" : "cart"} size={20} color={item.type === 'pemasukan' ? '#16a34a' : '#dc2626'} />
                    </View>
                    <View>
                      <Text style={{ fontWeight: 'bold', color: '#1f2937' }}>{item.category}</Text>
                      <Text style={{ fontSize: 12, color: '#64748b' }}>{item.note}</Text>
                      <Text style={{ fontSize: 10, color: '#9ca3af' }}>{formatTanggal(item.createdAt)}</Text>
                    </View>
                  </View>
                  <Text style={{ fontWeight: 'bold', color: item.type === 'pemasukan' ? '#16a34a' : '#dc2626' }}>
                    {item.type === 'pemasukan' ? '+' : '-'} {formatRupiah(item.amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          /* --- KONTEN RINGKASAN LENGKAP --- */
          <View style={{paddingHorizontal: 24}}>
            <View style={styles.healthCard}>
                <Text style={{fontWeight:'bold', marginBottom:10, color:'#1e293b'}}>Kesehatan Keuangan</Text>
                <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:5}}>
                    <Text style={{fontSize:12, color:'#16a34a'}}>Masuk: {formatRupiah(pemasukan)}</Text>
                    <Text style={{fontSize:12, color:'#dc2626'}}>Keluar: {formatRupiah(pengeluaran)}</Text>
                </View>
                <View style={{height:10, backgroundColor:'#f1f5f9', borderRadius:5, flexDirection:'row', overflow:'hidden'}}>
                    <View style={{flex: pemasukan, backgroundColor:'#16a34a'}} />
                    <View style={{flex: pengeluaran, backgroundColor:'#dc2626'}} />
                </View>
                <Text style={{marginTop:10, fontSize:12, fontStyle:'italic', color:'#64748b'}}>
                    {pemasukan > pengeluaran ? "✅ Aman! Pemasukan lebih besar." : "⚠️ Bahaya! Pengeluaran lebih besar."}
                </Text>
            </View>

            {/* RINCIAN PENGELUARAN */}
            <Text style={styles.subTitle}>📉 Rincian Pengeluaran</Text>
            {Object.keys(ringkasanPengeluaran).length === 0 ? <Text style={styles.emptyText}>Belum ada data.</Text> : 
             Object.entries(ringkasanPengeluaran).map(([kat, total]: any) => (
              <View key={kat} style={styles.barItem}>
                 <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:5}}>
                    <Text style={{fontWeight:'bold', color:'#334155'}}>{kat}</Text>
                    <Text style={{fontWeight:'bold', color:'#334155'}}>{formatRupiah(total)}</Text>
                 </View>
                 <View style={{height:8, backgroundColor:'#e2e8f0', borderRadius:4}}>
                    <View style={{height:8, backgroundColor:'#e11d48', borderRadius:4, width: `${(total/pengeluaran)*100}%`}} />
                 </View>
              </View>
            ))}

            {/* RINCIAN PEMASUKAN */}
            <Text style={[styles.subTitle, {marginTop:20}]}>📈 Rincian Pemasukan</Text>
            {Object.keys(ringkasanPemasukan).length === 0 ? <Text style={styles.emptyText}>Belum ada data.</Text> : 
             Object.entries(ringkasanPemasukan).map(([kat, total]: any) => (
              <View key={kat} style={styles.barItem}>
                 <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:5}}>
                    <Text style={{fontWeight:'bold', color:'#334155'}}>{kat}</Text>
                    <Text style={{fontWeight:'bold', color:'#334155'}}>{formatRupiah(total)}</Text>
                 </View>
                 <View style={{height:8, backgroundColor:'#e2e8f0', borderRadius:4}}>
                    <View style={{height:8, backgroundColor:'#16a34a', borderRadius:4, width: `${(total/pemasukan)*100}%`}} />
                 </View>
              </View>
            ))}
          </View>
        )}
        <View style={{height: 100}}/>
      </ScrollView>

      {/* MODAL TRANSAKSI */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Catat {tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}</Text>
            <Text style={styles.labelInput}>Nominal (Rp)</Text>
            <TextInput placeholder="0" keyboardType="numeric" style={styles.inputModal} value={nominal} onChangeText={setNominal} autoFocus={true} />
            <Text style={styles.labelInput}>Pilih Kategori</Text>
            {isAddingCategory ? (
                <View style={{flexDirection:'row', gap:5, marginBottom:10}}>
                    <TextInput placeholder="Kategori Baru..." style={[styles.inputModal, {flex:1, marginTop:0}]} value={newCategoryName} onChangeText={setNewCategoryName}/>
                    <TouchableOpacity onPress={handleTambahKategori} style={{backgroundColor:'#4f46e5', justifyContent:'center', padding:10, borderRadius:12}}><Ionicons name="checkmark" size={24} color="#fff" /></TouchableOpacity>
                </View>
            ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}}>
                {(tipe === 'pemasukan' ? listKatPemasukan : listKatPengeluaran).map(kat => (
                    <TouchableOpacity key={kat} onPress={() => setKategori(kat)} style={[styles.chip, kategori === kat && styles.chipActive]}><Text style={[styles.chipText, kategori === kat && {color:'#fff'}]}>{kat}</Text></TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => setIsAddingCategory(true)} style={[styles.chip, {backgroundColor:'#cbd5e1'}]}><Text style={styles.chipText}>+ Tambah</Text></TouchableOpacity>
                </ScrollView>
            )}
            <Text style={styles.labelInput}>Detail Catatan (Opsional)</Text>
            <TextInput placeholder="Contoh: Geprek..." style={styles.inputModal} value={catatan} onChangeText={setCatatan} />
            <View style={styles.rowBtn}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={[styles.btnModal, {backgroundColor: '#f1f5f9'}]}><Text style={{color: '#64748b'}}>Batal</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSimpan} style={[styles.btnModal, {backgroundColor: '#4f46e5'}]}><Text style={{color: '#fff', fontWeight:'bold'}}>Simpan</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL REMINDER */}
      <Modal animationType="fade" transparent={true} visible={modalReminderVisible} onRequestClose={() => setModalReminderVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔔 Buat Pengingat</Text>
            <Text style={styles.labelInput}>Nama Tagihan</Text>
            <TextInput placeholder="Misal: Uang Sampah..." style={styles.inputModal} value={reminderTitle} onChangeText={setReminderTitle} />
            <Text style={styles.labelInput}>Nominal Tagihan (Rp)</Text>
            <TextInput placeholder="0" keyboardType="numeric" style={styles.inputModal} value={reminderAmount} onChangeText={setReminderAmount} />
            <Text style={styles.labelInput}>Tanggal (1-31)</Text>
            <TextInput placeholder="Angka tgl..." keyboardType="numeric" style={styles.inputModal} value={reminderDate} onChangeText={setReminderDate} maxLength={2} />
            <View style={styles.rowBtn}>
              <TouchableOpacity onPress={() => setModalReminderVisible(false)} style={[styles.btnModal, {backgroundColor: '#f1f5f9'}]}><Text style={{color: '#64748b'}}>Batal</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSimpanReminder} style={[styles.btnModal, {backgroundColor: '#f59e0b'}]}><Text style={{color: '#fff', fontWeight:'bold'}}>Ingatkan</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// === STYLESHEET (Desain Tampilan) ===
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loginContainer: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#fff' },
  iconBulat: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4f46e5', justifyContent: 'center', alignItems: 'center', marginBottom: 20, alignSelf: 'center' },
  judulLogin: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', textAlign: 'center', marginBottom: 30 },
  tombolLogin: { backgroundColor: '#4f46e5', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  teksTombol: { color: '#fff', fontWeight: 'bold' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  salam: { color: '#64748b', fontSize: 12 },
  namaApp: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  profilIcon: { width: 35, height: 35, borderRadius: 20, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  cardSaldo: { backgroundColor: '#4f46e5', margin: 24, borderRadius: 24, padding: 24, shadowColor:'#4f46e5', elevation:10 },
  labelSaldo: { color: '#e0e7ff', fontSize: 12, marginBottom: 5 },
  angkaSaldo: { color: '#ffffff', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  rowInfo: { flexDirection: 'row', gap: 10 },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 12, flex: 1 },
  iconBox: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  labelKecil: { color: '#e0e7ff', fontSize: 10 },
  angkaKecil: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 10 },
  menuRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 20, marginBottom: 20, justifyContent: 'center' },
  btnBulat: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  btnText: { fontSize: 12, color: '#64748b', fontWeight:'600' },
  transaksiItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', marginBottom: 10, padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  labelInput: { fontSize: 12, color: '#64748b', marginBottom: 5, marginTop: 10 },
  inputModal: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  rowBtn: { flexDirection: 'row', gap: 10, marginTop: 20 },
  btnModal: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  chip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8 },
  chipActive: { backgroundColor: '#4f46e5' },
  chipText: { fontSize: 12, color: '#64748b', fontWeight:'600' },
  tabContainer: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 20, backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#4f46e5' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  barItem: { marginBottom: 15 },
  subTitle: { fontWeight:'bold', marginBottom:10, color:'#64748b' },
  emptyText: { textAlign:'center', color:'#94a3b8', fontStyle:'italic', marginBottom:20 },
  healthCard: { backgroundColor:'#fff', padding:15, borderRadius:16, marginBottom:20, borderWidth:1, borderColor:'#e2e8f0' },
  cardReminder: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginRight: 10, minWidth: 140, borderLeftWidth: 4, borderLeftColor: '#f59e0b', flexDirection: 'row', justifyContent:'space-between', alignItems:'center', gap:5 },
  tglReminder: { fontSize: 10, color: '#94a3b8', fontWeight: 'bold', marginBottom: 2 },
  judulReminder: { fontSize: 14, color: '#1e293b', fontWeight: 'bold' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 12, paddingHorizontal: 15, marginBottom: 15, height: 50 },
  input: { flex: 1, marginLeft: 10 },
});
