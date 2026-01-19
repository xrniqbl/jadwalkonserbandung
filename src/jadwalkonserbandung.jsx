import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, MapPin, Calendar, Ticket, ChevronRight, Plus, Trash2, 
  Edit2, Upload, ChevronLeft, Lock, Instagram, Facebook, Mail, CheckCircle, Database, Loader 
} from "lucide-react";

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, onSnapshot, addDoc, deleteDoc, updateDoc, doc 
} from "firebase/firestore";

// CATATAN: Kita TIDAK LAGI menggunakan firebase/storage. Gambar disimpan langsung di database (Base64).

/* ======================================================
   CONFIG FIREBASE (GANTI DENGAN PUNYA ANDA)
   Cukup salin apiKey, authDomain, dan projectId dari Console.
====================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyDBeG-GM36bniBHaybNJKSdX-Catjw8Nfs",
  authDomain: "jadwalkonserbandung-3ddef.firebaseapp.com",
  databaseURL: "https://jadwalkonserbandung-3ddef-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "jadwalkonserbandung-3ddef",
  storageBucket: "jadwalkonserbandung-3ddef.firebasestorage.app",
  messagingSenderId: "977324195866",
  appId: "1:977324195866:web:503aed7af5083ad2f591a3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ======================================================
   APP CONFIG
====================================================== */
const ADMIN_PASSWORD = "admin123";

/* ======================================================
   UTIL
====================================================== */
const slugify = (t = "") =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Fungsi Pembaca Gambar ke Base64 (Lokal)
const readFileBase64 = (file) => {
  return new Promise((resolve, reject) => {
    // Validasi Ukuran: Maksimal 950KB (Biar aman masuk Firestore limit 1MB)
    const limit = 950 * 1024; 
    if (file.size > limit) {
      alert("File terlalu besar! Maksimal 1 MB untuk versi Gratis. Silakan kompres gambar dulu.");
      resolve(null);
      return;
    }

    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
};

/* ======================================================
   MAIN COMPONENT
====================================================== */
export default function JadwalKonserBandung() {
  /* ================= STATE ================= */
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false); // State processing gambar

  const [events, setEvents] = useState([]);
  const [banners, setBanners] = useState([]);
  const [partners, setPartners] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Partnership State
  const [showPartnershipModal, setShowPartnershipModal] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    konserName: "",
    date: "",
    wa: "",
    offer: "opt1",
    customOfferText: "",
    cameraAccess: false
  });
  
  // Banner State
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Admin State
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminTab, setAdminTab] = useState("event");
  const [clickCount, setClickCount] = useState(0); 
  
  // CRUD State
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: "", date: "", location: "", price: "", ticket: "", map: "", description: "", image: ""
  });
  const [newPartner, setNewPartner] = useState({ name: "", url: "" });

  /* ================= EFFECTS (FIREBASE LISTENERS) ================= */
  
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2500); 
    return () => clearTimeout(timer);
  }, []);

  // Fetch EVENTS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "events"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setEvents(data);
    });
    return () => unsubscribe();
  }, []);

  // Fetch BANNERS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "banners"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setBanners(data);
    });
    return () => unsubscribe();
  }, []);

  // Fetch PARTNERS
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "partners"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setPartners(data);
    });
    return () => unsubscribe();
  }, []);

  // Auto Slide
  useEffect(() => {
    if (isDragging) return;
    const t = setInterval(() => {
      if (banners.length > 0) {
        setBannerIndex((prev) => (prev + 1) % banners.length);
      }
    }, 5000);
    return () => clearInterval(t);
  }, [banners, isDragging]);

  /* ================= HANDLERS ================= */
  const filteredEvents = useMemo(() => {
    return events.filter((e) =>
      e.title.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => b.id - a.id);
  }, [events, search]);

  const handleSecretTrigger = () => {
    setClickCount(prev => {
      const count = prev + 1;
      if (count === 5) {
        setShowAdminLogin(true);
        return 0;
      }
      return count;
    });
  };

  const onDragEnd = (event, info) => {
    setIsDragging(false);
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    const DRAG_BUFFER = 50;

    if (offset < -DRAG_BUFFER || velocity < -500) {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    } else if (offset > DRAG_BUFFER || velocity > 500) {
      setBannerIndex((prev) => (prev - 1 + banners.length) % banners.length);
    }
  };

  const handleSubmitPartnership = () => {
    if (!partnerForm.konserName || !partnerForm.date || !partnerForm.wa) {
      alert("Mohon lengkapi Nama Konser, Tanggal, dan WhatsApp!");
      return;
    }

    const offerText = {
      opt1: "Bundling 2/3 Tiket Konser + Akses Mudah Media Partner",
      opt2: "Fee Posting (Tiket mandiri, Akses Media Partner saat acara)",
      opt3: "Bundling 2/3 Tiket Konser + Akses Biasa",
      opt4: `Custom: ${partnerForm.customOfferText}`
    };

    const cameraText = partnerForm.cameraAccess 
      ? "YA. Media Partner diizinkan membawa kamera profesional." 
      : "TIDAK / Belum ditentukan.";

    const subject = `Partnership - ${partnerForm.konserName}`;
    const body = `Halo Tim Jadwal Konser Bandung,\n\nNama Konser: ${partnerForm.konserName}\nTanggal: ${partnerForm.date}\nWhatsApp: ${partnerForm.wa}\n\nKerjasama: ${offerText[partnerForm.offer]}\nKamera: ${cameraText}\n\n(Mohon lampirkan Logo & Poster)`;

    window.open(`mailto:jadwalkonserbandung@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  // --- CRUD FIREBASE (BASE64 VERSION) ---

  const handleAddEvent = async () => {
    if (!newEvent.title) return alert("Judul wajib diisi!");
    setProcessing(true);
    try {
      await addDoc(collection(db, "events"), {
        ...newEvent,
        slug: slugify(newEvent.title),
        createdAt: new Date()
      });
      setNewEvent({ title: "", date: "", location: "", price: "", ticket: "", map: "", description: "", image: "" });
      alert("Event berhasil ditambahkan!");
    } catch (e) {
      console.error(e);
      alert("Gagal menambahkan event. Cek ukuran gambar (Harus < 1MB).");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (confirm("Yakin hapus event ini?")) {
      await deleteDoc(doc(db, "events", id));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;
    setProcessing(true);
    try {
      const eventRef = doc(db, "events", editingEvent.id);
      await updateDoc(eventRef, editingEvent);
      setEditingEvent(null);
      alert("Event berhasil diupdate!");
    } catch (e) {
      alert("Gagal update. Cek ukuran gambar.");
    } finally {
      setProcessing(false);
    }
  };

  // Helper untuk membaca file gambar jadi Base64
  const handleFileSelect = async (e, type) => {
    const file = e.target.files[0];
    if(!file) return;
    
    setProcessing(true);
    const base64 = await readFileBase64(file);
    setProcessing(false);

    if (base64) {
      if (type === 'event') {
        setNewEvent({ ...newEvent, image: base64 });
      } else if (type === 'banner') {
        // Langsung simpan banner
        try {
          await addDoc(collection(db, "banners"), { url: base64 });
        } catch (err) {
          alert("Gagal simpan banner. Gambar terlalu besar? (Max 1MB)");
        }
      }
    }
  };

  const handleDeleteBanner = async (id) => {
    if(confirm("Hapus banner ini?")) {
      await deleteDoc(doc(db, "banners", id));
    }
  };

  const handleAddPartner = async () => {
    if(newPartner.name) {
      await addDoc(collection(db, "partners"), newPartner);
      setNewPartner({name:'', url:''});
    }
  };

  const handleDeletePartner = async (id) => {
    await deleteDoc(doc(db, "partners", id));
  };


  /* ======================================================
     RENDER
  ====================================================== */
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999]">
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="text-8xl mb-4"
        >
          🎵
        </motion.div>
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "200px" }}
          transition={{ duration: 2.5 }}
          className="h-2 bg-[#a6b5cf] rounded-full" 
        />
        <p className="text-white mt-4 font-bold tracking-widest text-sm animate-pulse">MEMUAT KONSER...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans selection:bg-[#a6b5cf] selection:text-black overflow-x-hidden flex flex-col">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b-2 border-black">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div 
            className="flex items-center gap-2 cursor-pointer select-none group"
            onClick={handleSecretTrigger}
          >
            <div className="w-8 h-8 bg-[#a6b5cf] border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-active:translate-y-1 group-active:shadow-none transition-all">
              🎵
            </div>
            <h1 className="text-xl font-bold tracking-tighter">
              JDWL<span className="text-[#31528b]">KNSRBDG</span>
            </h1>
          </div>
          
          <div className="flex gap-4 text-sm font-bold">
            <a href="#" className="hover:text-[#31528b] transition-colors">HOME</a>
            <a href="#partners" className="hover:text-[#31528b] transition-colors">PARTNERS</a>
          </div>
        </div>
      </nav>

      <main className="w-full flex-grow">
        
        {/* HERO BANNER - CAROUSEL */}
        <div className="mt-8 relative w-full overflow-hidden py-4">
          
          {banners.length === 0 ? (
             <div className="w-full text-center py-10 bg-slate-200 border-2 border-black mx-auto max-w-[630px] rounded-2xl">
               <p className="font-bold text-slate-500">Belum ada banner. Upload via Admin (Klik Logo 5x)</p>
             </div>
          ) : (
            <>
              {/* Track Carousel */}
              <motion.div 
                className="flex gap-4 items-center"
                style={{ 
                  "--slide-width": "min(630px, 85vw)", 
                  "--gap": "16px" 
                }}
                animate={{ 
                  x: `calc(50% - (var(--slide-width) / 2) - (${bannerIndex} * (var(--slide-width) + var(--gap))))` 
                }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }} 
                dragElastic={0.1}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={(e, i) => {
                  setIsDragging(false);
                  const off = i.offset.x;
                  const vel = i.velocity.x;
                  if (off < -50 || vel < -500) {
                    setBannerIndex((p) => (p + 1) % banners.length);
                  } else if (off > 50 || vel > 500) {
                    setBannerIndex((p) => (p - 1 + banners.length) % banners.length);
                  }
                }}
              >
                {banners.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    className={`relative shrink-0 rounded-2xl border-2 border-black bg-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300`}
                    style={{ 
                      width: "var(--slide-width)",
                      aspectRatio: "630/140"
                    }}
                    animate={{
                      scale: index === bannerIndex ? 1 : 0.9,
                      opacity: index === bannerIndex ? 1 : 0.5,
                      filter: index === bannerIndex ? "grayscale(0%)" : "grayscale(100%)"
                    }}
                  >
                    <img 
                      src={item.url} 
                      className="w-full h-full object-cover opacity-90"
                      draggable="false"
                    />
                    
                    {index === bannerIndex && (
                      <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center p-2">
                        <h2 className="text-lg md:text-2xl font-black text-white tracking-tighter drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] text-center leading-none">
                          JELAJAHI MUSIK <span className="text-[#a6b5cf]">BANDUNG</span>
                        </h2>
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>

              {/* Navigation Dots */}
              <div className="flex justify-center gap-2 mt-6">
                {banners.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setBannerIndex(idx)}
                    className={`w-3 h-3 rounded-full border border-black shadow-sm transition-all ${idx === bannerIndex ? 'bg-[#a6b5cf] scale-125' : 'bg-white'}`}
                  />
                ))}
              </div>

              {/* Side Buttons */}
              <div className="hidden md:block">
                <button 
                  onClick={() => setBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)}
                  className="absolute left-10 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full border-2 border-black hover:bg-[#a6b5cf] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[-40%] active:shadow-none transition-all z-10"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={() => setBannerIndex((prev) => (prev + 1) % banners.length)}
                  className="absolute right-10 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full border-2 border-black hover:bg-[#a6b5cf] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all z-10"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* CONTAINER FOR CONTENT */}
        <div className="max-w-6xl mx-auto px-6">
          
          {/* SEARCH */}
          <div className="mt-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full">
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari konser favoritmu..." 
                className="w-full bg-white border-2 border-black rounded-xl px-5 py-4 text-lg font-medium focus:outline-none focus:ring-4 focus:ring-[#a6b5cf] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </div>
            </div>
          </div>

          {/* EVENT GRID */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.length === 0 && !loading && (
               <div className="col-span-full text-center py-20 opacity-50">
                  <Database size={48} className="mx-auto mb-2"/>
                  <p className="font-bold">Belum ada event / tidak ditemukan.</p>
               </div>
            )}

            {filteredEvents.map((event) => (
              <motion.div
                layoutId={`card-${event.id}`}
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                whileHover={{ y: -8 }}
                className="bg-white rounded-2xl border-2 border-black overflow-hidden cursor-pointer shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_#31528b] transition-all group"
              >
                <div className="relative h-48 overflow-hidden border-b-2 border-black">
                  <motion.img 
                    layoutId={`img-${event.id}`}
                    src={event.image} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-white border-2 border-black px-3 py-1 text-sm font-bold rounded-full shadow-sm">
                    {event.price}
                  </div>
                </div>
                <div className="p-5">
                  <motion.h3 layoutId={`title-${event.id}`} className="text-xl font-black mb-2 leading-tight">
                    {event.title}
                  </motion.h3>
                  <div className="space-y-2 text-sm font-medium text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#31528b]" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t-2 border-dashed border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded">GENRE: POP/INDIE</span>
                    <div className="bg-black text-white p-2 rounded-full">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* PARTNERSHIP SECTION */}
          <div id="partners" className="mt-24 border-t-4 border-black pt-10 pb-20">
            <motion.div 
              whileHover={{ scale: 1.02, rotate: 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPartnershipModal(true)}
              className="cursor-pointer border-4 border-black bg-[#a6b5cf] p-6 md:p-8 mb-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] transition-all rounded-2xl"
            >
               <h2 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase mb-2">
                 ✨ Ayo Jadikan <span className="text-[#31528b] bg-white px-2">JDWLKNSRBDG</span> Media Partner! ✨
               </h2>
               <p className="font-bold text-lg underline decoration-wavy decoration-black">Klik di sini untuk kerjasama & boost eventmu!</p>
            </motion.div>

            <div className="flex flex-col md:flex-row items-center justify-between mb-8">
              <h3 className="text-3xl font-black uppercase italic tracking-tighter">Official Partners</h3>
              <p className="text-slate-500 font-medium">Didukung oleh brand terbaik</p>
            </div>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              {partners.map((p) => (
                <a 
                  key={p.id} 
                  href={p.url} 
                  target="_blank"
                  className="bg-white px-6 py-3 rounded-xl border-2 border-black font-bold hover:bg-[#a6b5cf] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none"
                >
                  {p.name} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-black text-white pt-16 pb-8 border-t-4 border-[#a6b5cf] mt-auto">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#a6b5cf] text-black rounded-full flex items-center justify-center text-xl font-bold border-2 border-white">
                🎵
              </div>
              <h2 className="text-3xl font-black tracking-tighter">
                JDWL<span className="text-[#31528b]">KNSRBDG</span>
              </h2>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed">
              Platform informasi jadwal konser paling update di Bandung. Temukan gig favoritmu, beli tiket, dan rasakan atmosfer musik kota kembang.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 text-[#a6b5cf] uppercase tracking-widest">Menu</h3>
            <ul className="space-y-2 text-slate-300">
              <li><a href="#" className="hover:text-white hover:underline">Home</a></li>
              <li><a href="#partners" className="hover:text-white hover:underline">Partnership</a></li>
              <li><a href="#" className="hover:text-white hover:underline">Tentang Kami</a></li>
              <li><a href="#" className="hover:text-white hover:underline">Kontak</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4 text-[#a6b5cf] uppercase tracking-widest">Connect</h3>
            <div className="flex gap-4">
              
              <a 
                href="https://www.instagram.com/jadwalkonserbandung/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white text-black p-2 rounded-full hover:bg-[#a6b5cf] hover:scale-110 transition-all"
              >
                <Instagram size={20} />
              </a>
              
              <a 
                href="https://www.tiktok.com/@jadwalkonserbandung" 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-black p-2 rounded-full hover:bg-[#a6b5cf] hover:scale-110 transition-all flex items-center justify-center"
              >
                 <svg 
                   xmlns="http://www.w3.org/2000/svg" 
                   width="20" 
                   height="20" 
                   viewBox="0 0 24 24" 
                   fill="none" 
                   stroke="currentColor" 
                   strokeWidth="2" 
                   strokeLinecap="round" 
                   strokeLinejoin="round" 
                   className="lucide lucide-music"
                 >
                   <path d="M9 18V5l12-2v13" />
                   <circle cx="6" cy="18" r="3" />
                   <circle cx="18" cy="16" r="3" />
                 </svg>
              </a>

              <a href="#" className="bg-white text-black p-2 rounded-full hover:bg-[#a6b5cf] hover:scale-110 transition-all"><Facebook size={20} /></a>
              <a href="#" className="bg-white text-black p-2 rounded-full hover:bg-[#a6b5cf] hover:scale-110 transition-all"><Mail size={20} /></a>
            </div>
            <div className="mt-6">
              <p className="text-xs text-slate-500">© 2026 JDWLKNSRBDG.</p>
              <p className="text-xs text-slate-500">All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      {/* PARTNERSHIP MODAL - FIXED SCROLLING */}
      <AnimatePresence>
        {showPartnershipModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md overflow-y-auto">
             <div className="flex min-h-full items-center justify-center p-4">
               <motion.div 
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 0.9, opacity: 0 }}
                 className="bg-[#FDFBF7] w-full max-w-4xl rounded-3xl border-4 border-[#a6b5cf] shadow-[10px_10px_0px_0px_rgba(255,255,255,0.2)] flex flex-col my-8"
               >
                  {/* Header */}
                  <div className="bg-black text-white p-6 md:p-8 flex justify-between items-start border-b-4 border-[#a6b5cf] rounded-t-2xl">
                     <div>
                        <h2 className="text-3xl font-black italic tracking-tighter text-[#a6b5cf] mb-2">KERJASAMA MEDIA PARTNER</h2>
                        <p className="text-slate-300 font-medium">Isi form di bawah untuk kolaborasi epik bareng JDWLKNSRBDG!</p>
                     </div>
                     <button onClick={() => setShowPartnershipModal(false)} className="bg-white text-black p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors">
                       <X size={24} />
                     </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                     
                     {/* Left: Info */}
                     <div className="md:w-1/3 space-y-6">
                        <div className="bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                           <h3 className="font-black text-xl mb-3 flex items-center gap-2">🚀 KEUNTUNGAN</h3>
                           <ul className="space-y-3 text-sm font-bold text-slate-700">
                              <li className="flex items-start gap-2"><CheckCircle size={18} className="text-[#31528b] shrink-0" /> Engagement Tinggi dari komunitas konser aktif.</li>
                              <li className="flex items-start gap-2"><CheckCircle size={18} className="text-[#31528b] shrink-0" /> Target pasar spesifik: Anak muda Bandung & Sekitarnya.</li>
                              <li className="flex items-start gap-2"><CheckCircle size={18} className="text-[#31528b] shrink-0" /> Membantu boost penjualan tiket secara organik.</li>
                           </ul>
                        </div>
                        
                        <div className="bg-blue-50 p-5 rounded-2xl border-2 border-[#31528b] border-dashed">
                           <h3 className="font-bold text-[#31528b] text-sm mb-2">📸 UPLOAD FILES</h3>
                           <p className="text-xs text-blue-600 mb-4">Karena keterbatasan sistem email otomatis, mohon siapkan file berikut untuk dilampirkan nanti di aplikasi email Anda:</p>
                           <ul className="text-xs font-bold text-[#31528b] list-disc list-inside">
                             <li>Logo Acara (PNG/JPG)</li>
                             <li>Poster Konser (Feed Instagram)</li>
                           </ul>
                           <button className="mt-4 w-full bg-[#31528b] text-white py-2 rounded-lg font-bold text-xs hover:bg-[#26406e] cursor-not-allowed opacity-70">Upload via Email (Otomatis)</button>
                        </div>
                     </div>

                     {/* Right: Form */}
                     <div className="md:w-2/3 space-y-5">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="font-bold text-sm">Nama Konser</label>
                            <input value={partnerForm.konserName} onChange={(e) => setPartnerForm({...partnerForm, konserName: e.target.value})} className="w-full border-2 border-black p-3 rounded-xl font-medium focus:ring-4 focus:ring-[#a6b5cf] outline-none" placeholder="Contoh: Bandung Berisik 2026" />
                          </div>
                          <div className="space-y-1">
                            <label className="font-bold text-sm">Hari / Tanggal / Tahun</label>
                            <input type="date" value={partnerForm.date} onChange={(e) => setPartnerForm({...partnerForm, date: e.target.value})} className="w-full border-2 border-black p-3 rounded-xl font-medium focus:ring-4 focus:ring-[#a6b5cf] outline-none" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-sm">WhatsApp PIC</label>
                          <input value={partnerForm.wa} onChange={(e) => setPartnerForm({...partnerForm, wa: e.target.value})} className="w-full border-2 border-black p-3 rounded-xl font-medium focus:ring-4 focus:ring-[#a6b5cf] outline-none" placeholder="0812xxxx" />
                        </div>

                        <div className="space-y-2">
                          <label className="font-bold text-sm block border-b-2 border-slate-200 pb-2 mb-2">Pilih Skema Kerjasama (Wajib Pilih Satu)</label>
                          {[
                            {val: 'opt1', label: 'Bundling 2/3 Tiket Konser + Akses Mudah Media Partner'},
                            {val: 'opt2', label: 'Fee Posting (Beli tiket mandiri, Akses MP saat acara)'},
                            {val: 'opt3', label: 'Bundling 2/3 Tiket Konser + Akses Biasa'},
                            {val: 'opt4', label: 'Isi Penawaran Sendiri...'}
                          ].map((opt) => (
                            <label key={opt.val} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${partnerForm.offer === opt.val ? 'border-[#31528b] bg-blue-50' : 'border-slate-200 hover:border-slate-400'}`}>
                               <input type="radio" name="offer" value={opt.val} checked={partnerForm.offer === opt.val} onChange={(e) => setPartnerForm({...partnerForm, offer: e.target.value})} className="w-5 h-5 accent-[#31528b]" />
                               <span className="font-bold text-sm">{opt.label}</span>
                            </label>
                          ))}
                          {partnerForm.offer === 'opt4' && (
                            <motion.textarea initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} className="w-full border-2 border-black p-3 rounded-xl mt-2 text-sm font-medium focus:ring-4 focus:ring-[#a6b5cf] outline-none" placeholder="Tuliskan penawaran kerjasama Anda di sini..." rows="3" value={partnerForm.customOfferText} onChange={(e) => setPartnerForm({...partnerForm, customOfferText: e.target.value})} />
                          )}
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-300">
                           <label className="flex items-start gap-3 cursor-pointer">
                              <input type="checkbox" checked={partnerForm.cameraAccess} onChange={(e) => setPartnerForm({...partnerForm, cameraAccess: e.target.checked})} className="w-6 h-6 mt-1 accent-[#31528b] rounded" />
                              <div className="text-sm">
                                 <p className="font-bold">Izin Membawa Kamera Profesional?</p>
                                 <p className="text-slate-500 text-xs mt-1">Jika dicentang, Media Partner boleh membawa kamera profesional. Hasil foto/video akan dibagikan ke panitia untuk keperluan dokumentasi.</p>
                              </div>
                           </label>
                        </div>
                     </div>
                  </div>

                  {/* Footer Action */}
                  <div className="p-6 md:p-8 border-t-2 border-slate-200 bg-white rounded-b-2xl">
                     <button onClick={handleSubmitPartnership} className="w-full bg-black text-white py-4 rounded-xl font-black text-xl hover:bg-[#a6b5cf] hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all border-2 border-transparent hover:border-black flex items-center justify-center gap-2">
                       <Mail /> KIRIM PENAWARAN (VIA EMAIL)
                     </button>
                     <p className="text-center text-xs text-slate-400 mt-3">*Akan membuka aplikasi email Anda dengan format pesan otomatis.</p>
                  </div>
               </motion.div>
             </div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL (Overlay) - FIXED SCROLLING */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div 
                layoutId={`card-${selectedEvent.id}`}
                className="relative w-full max-w-4xl bg-white rounded-3xl border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] overflow-hidden flex flex-col md:flex-row my-8"
              >
                {/* Image Side */}
                <div className="md:w-1/2 relative min-h-[300px] border-b-4 md:border-b-0 md:border-r-4 border-black">
                  <motion.img 
                    layoutId={`img-${selectedEvent.id}`}
                    src={selectedEvent.image} 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedEvent(null); }}
                    className="absolute top-4 left-4 bg-white rounded-full p-2 border-2 border-black shadow-md hover:bg-red-500 hover:text-white transition-colors z-10"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Content Side */}
                <div className="md:w-1/2 p-6 md:p-8 flex flex-col bg-[#FDFBF7]">
                  <div className="mb-auto">
                    <div className="flex gap-2 mb-4">
                       <span className="bg-[#a6b5cf] border border-black px-3 py-1 text-xs font-bold rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                         UPCOMING
                       </span>
                    </div>
                    <motion.h2 layoutId={`title-${selectedEvent.id}`} className="text-3xl md:text-4xl font-black mb-4 leading-none">
                      {selectedEvent.title}
                    </motion.h2>
                    
                    <div className="space-y-4 mb-6 text-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="text-[#31528b]" />
                        <span className="font-bold">{selectedEvent.date}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="text-red-500" />
                        <span className="font-bold">{selectedEvent.location}</span>
                      </div>
                    </div>

                    <p className="text-slate-600 leading-relaxed mb-6 font-medium border-l-4 border-slate-300 pl-4">
                      {selectedEvent.description}
                    </p>

                    {/* Map Embed */}
                    {selectedEvent.map && (
                      <div className="rounded-xl overflow-hidden border-2 border-black h-40 mb-6 grayscale hover:grayscale-0 transition-all shadow-md">
                        <iframe 
                          src={selectedEvent.map} 
                          className="w-full h-full border-0" 
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t-2 border-dashed border-slate-300">
                     <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-slate-500 font-bold uppercase">Harga Tiket</span>
                        <span className="text-2xl font-black text-[#31528b]">{selectedEvent.price}</span>
                     </div>
                     <a 
                       href={selectedEvent.ticket} 
                       target="_blank"
                       className="block w-full bg-black text-white text-center py-4 rounded-xl font-bold text-lg hover:bg-[#a6b5cf] hover:text-black hover:border-black border-2 border-transparent transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                     >
                       <Ticket size={20} />
                       BELI TIKET SEKARANG
                     </a>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN MODAL - FIXED SCROLLING */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-3xl rounded-3xl border-4 border-[#31528b] p-6 shadow-2xl my-8"
              >
                {!isAdmin ? (
                  <div className="text-center max-w-sm mx-auto py-10">
                    <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-3xl">🔐</div>
                    <h2 className="text-2xl font-black mb-6">ADMIN ACCESS</h2>
                    <p className="text-slate-500 mb-6 text-sm">Masuk untuk mengelola event & banner</p>
                    <input 
                      type="password" 
                      placeholder="Masukkan Password..." 
                      className="w-full text-center text-xl p-3 border-b-4 border-slate-200 focus:border-[#31528b] outline-none transition-colors mb-6 font-bold"
                      value={adminPwd}
                      onChange={(e) => setAdminPwd(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowAdminLogin(false)} className="flex-1 py-3 font-bold text-slate-400 hover:text-slate-600">BATAL</button>
                      <button onClick={() => { if (adminPwd === ADMIN_PASSWORD) setIsAdmin(true); else alert("Password Salah!"); }} className="flex-1 bg-[#31528b] text-white py-3 rounded-xl font-bold hover:bg-[#26406e]">MASUK</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-6 border-b-2 border-slate-100 pb-4">
                      <h2 className="text-2xl font-black flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        DASHBOARD ADMIN
                      </h2>
                      <button onClick={() => setShowAdminLogin(false)} className="bg-slate-100 p-2 rounded-lg hover:bg-slate-200">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                      {['event', 'banner', 'partner'].map(tab => (
                        <button 
                          key={tab}
                          onClick={() => setAdminTab(tab)}
                          className={`px-6 py-2 rounded-full font-bold border-2 border-black capitalize transition-all ${
                            adminTab === tab ? 'bg-black text-white' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          {tab}s
                        </button>
                      ))}
                    </div>

                    {/* EVENT TAB */}
                    {adminTab === 'event' && (
                      <div className="grid md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                            <h3 className="font-bold text-lg border-l-4 border-[#31528b] pl-3">Tambah / Edit Event</h3>
                            <input placeholder="Judul Event" className="w-full p-3 bg-slate-50 border rounded-lg font-bold" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                            <div className="grid grid-cols-2 gap-3">
                               <input placeholder="Tanggal (e.g 20 Jan)" className="p-3 bg-slate-50 border rounded-lg" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                               <input placeholder="Harga (e.g Rp100k)" className="p-3 bg-slate-50 border rounded-lg" value={newEvent.price} onChange={e => setNewEvent({...newEvent, price: e.target.value})} />
                            </div>
                            <input placeholder="Lokasi" className="w-full p-3 bg-slate-50 border rounded-lg" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                            <input placeholder="Link Tiket (URL)" className="w-full p-3 bg-slate-50 border rounded-lg" value={newEvent.ticket} onChange={e => setNewEvent({...newEvent, ticket: e.target.value})} />
                            
                            {/* SMART MAP INPUT */}
                            <input 
                              placeholder="Paste kode HTML dari Google Maps (iframe)" 
                              className="w-full p-3 bg-slate-50 border rounded-lg" 
                              value={newEvent.map} 
                              onChange={(e) => {
                                let val = e.target.value;
                                if (val.includes('<iframe')) {
                                  const srcMatch = val.match(/src="([^"]+)"/);
                                  if (srcMatch && srcMatch[1]) {
                                    val = srcMatch[1];
                                  }
                                }
                                setNewEvent({...newEvent, map: val});
                              }} 
                            />
                            
                            <textarea placeholder="Deskripsi Singkat" className="w-full p-3 bg-slate-50 border rounded-lg h-24" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
                            
                            <div className="flex items-center gap-2">
                              <label className={`flex-1 cursor-pointer bg-slate-100 border-2 border-dashed border-slate-300 p-4 rounded-lg text-center hover:bg-slate-200 transition ${processing ? 'opacity-50' : ''}`}>
                                <span className="text-sm font-bold text-slate-500">{processing ? "Processing..." : "📸 Upload Gambar (Max 1MB)"}</span>
                                <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'event')} />
                              </label>
                              {newEvent.image && <img src={newEvent.image} className="h-16 w-16 rounded object-cover border border-black" />}
                            </div>

                            <button 
                              onClick={handleAddEvent}
                              className="w-full bg-[#a6b5cf] border-2 border-black text-black py-3 rounded-xl font-black hover:bg-[#8da0c1] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                              disabled={processing}
                            >
                              {processing ? "Loading..." : "PUBLISH EVENT"}
                            </button>
                         </div>

                         <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 max-h-[600px] overflow-y-auto">
                            <h3 className="font-bold text-lg mb-4 text-slate-500">List Events ({events.length})</h3>
                            <div className="space-y-3">
                              {events.map(event => (
                                <div key={event.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex gap-3 items-center group">
                                  <img src={event.image} className="w-12 h-12 rounded object-cover bg-slate-200" />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold truncate">{event.title}</h4>
                                    <p className="text-xs text-slate-500">{event.date}</p>
                                  </div>
                                  <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingEvent(event); setNewEvent(event); }} className="p-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDeleteEvent(event.id)} className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"><Trash2 size={16} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                         </div>
                      </div>
                    )}

                    {/* BANNER TAB */}
                    {adminTab === 'banner' && (
                      <div>
                        <label className={`block w-full cursor-pointer bg-slate-100 border-2 border-dashed border-[#31528b] p-8 rounded-xl text-center hover:bg-blue-50 transition mb-6 ${processing ? 'opacity-50' : ''}`}>
                           <Upload className="mx-auto mb-2 text-[#31528b]" />
                           <span className="font-bold text-[#31528b]">{processing ? "Processing..." : "Tambah Banner Baru (Max 1MB)"}</span>
                           <input type="file" className="hidden" onChange={(e) => handleFileSelect(e, 'banner')} />
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                          {banners.map((b, i) => (
                            <div key={i} className="relative group rounded-xl overflow-hidden border-2 border-slate-200">
                               <img src={b.url} className="w-full h-32 object-cover" />
                               <button onClick={() => handleDeleteBanner(b.id)} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PARTNER TAB */}
                    {adminTab === 'partner' && (
                       <div className="space-y-4">
                          <div className="flex gap-2">
                             <input placeholder="Nama Partner" className="flex-1 p-3 bg-slate-50 border rounded-lg" value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} />
                             <input placeholder="URL Link" className="flex-1 p-3 bg-slate-50 border rounded-lg" value={newPartner.url} onChange={e => setNewPartner({...newPartner, url: e.target.value})} />
                             <button onClick={handleAddPartner} className="bg-black text-white px-6 rounded-lg font-bold">ADD</button>
                          </div>
                          <div className="grid gap-2">
                            {partners.map(p => (
                              <div key={p.id} className="flex justify-between items-center bg-white p-4 border rounded-xl">
                                <span className="font-bold">{p.name}</span>
                                <button onClick={() => handleDeletePartner(p.id)} className="text-red-500 font-bold text-sm hover:underline">Hapus</button>
                              </div>
                            ))}
                          </div>
                       </div>
                    )}
                    
                    {editingEvent && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 flex justify-between items-center">
                        <span>Sedang mengedit: <b>{editingEvent.title}</b>. Tekan "Publish Event" untuk menyimpan perubahan.</span>
                        <button onClick={handleSaveEdit} className="underline font-bold">Simpan Perubahan</button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}