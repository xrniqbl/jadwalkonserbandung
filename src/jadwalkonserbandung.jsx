import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, MapPin, Calendar, Ticket, ChevronRight, Plus, Trash2, 
  Edit2, Upload, ChevronLeft, Lock, Instagram, Facebook, Mail, CheckCircle, Database, Loader 
} from "lucide-react";

// --- SUPABASE IMPORTS ---
import { createClient } from '@supabase/supabase-js';

/* ======================================================
   CONFIG SUPABASE (WAJIB DIGANTI)
====================================================== */
const supabaseUrl = 'https://czqjoounutrvjvooyvfy.supabase.co'; 
const supabaseKey = 'sb_publishable_uNE3lE2LPlfOvp3OXvkf8Q_29bn8d2G'; // <--- PASTE KEY "ANON" ANDA DI SINI

// Initialize Supabase
let supabase;
try {
  if (supabaseKey && !supabaseKey.includes('MASUKKAN')) {
    supabase = createClient(supabaseUrl, supabaseKey);
  } else {
    console.warn("Supabase Key belum diisi. Fitur database tidak akan jalan.");
  }
} catch (e) {
  console.error("Supabase Init Error:", e);
}

/* ======================================================
   APP CONFIG
====================================================== */
const ADMIN_PASSWORD = "admin123";

/* ======================================================
   UTIL
====================================================== */
const slugify = (t = "") =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* ======================================================
   MAIN COMPONENT
====================================================== */
export default function JadwalKonserBandung() {
  /* ================= STATE ================= */
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [events, setEvents] = useState([]);
  const [banners, setBanners] = useState([]);
  const [partners, setPartners] = useState([]);

  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Partnership
  const [showPartnershipModal, setShowPartnershipModal] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    konserName: "", date: "", wa: "", offer: "opt1", customOfferText: "", cameraAccess: false
  });
  
  // Banner
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Admin
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPwd, setAdminPwd] = useState("");
  const [adminTab, setAdminTab] = useState("event");
  const [clickCount, setClickCount] = useState(0); 
  
  // CRUD
  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: "", date: "", location: "", price: "", ticket: "", map: "", description: "", image: ""
  });
  const [newPartner, setNewPartner] = useState({ name: "", url: "" });

  /* ================= EFFECTS ================= */
  const fetchData = async () => {
    if (!supabase) return;
    const { data: ev } = await supabase.from('events').select('*').order('id', { ascending: false });
    if (ev) setEvents(ev);
    const { data: bn } = await supabase.from('banners').select('*').order('id', { ascending: false });
    if (bn) setBanners(bn);
    const { data: pt } = await supabase.from('partners').select('*').order('id', { ascending: true });
    if (pt) setPartners(pt);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    if (supabase) {
      const channel = supabase.channel('public-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => fetchData())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    } else {
      setLoading(false); // Stop loading if no supabase
    }
  }, []);

  useEffect(() => {
    if (isDragging) return;
    const t = setInterval(() => {
      if (banners.length > 0) setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(t);
  }, [banners, isDragging]);

  /* ================= HELPER: UPLOAD ================= */
  const handleUploadImage = async (file) => {
    if (!file || !supabase) return null;
    if (file.size > 10 * 1024 * 1024) {
      alert("File max 10MB!"); return null;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('images').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      setUploading(false);
      return data.publicUrl;
    } catch (error) {
      console.error(error); alert("Gagal upload. Cek Bucket 'images' public?");
      setUploading(false); return null;
    }
  };

  /* ================= HANDLERS ================= */
  const filteredEvents = useMemo(() => {
    return events.filter((e) => e.title && e.title.toLowerCase().includes(search.toLowerCase())).sort((a, b) => b.id - a.id);
  }, [events, search]);

  const handleSecretTrigger = () => {
    setClickCount(prev => {
      const count = prev + 1;
      if (count === 5) { setShowAdminLogin(true); return 0; }
      return count;
    });
  };

  const handleSubmitPartnership = () => {
    if (!partnerForm.konserName) return alert("Isi nama konser!");
    const offerText = {
      opt1: "Bundling 2/3 Tiket + Akses Mudah", opt2: "Fee Posting", opt3: "Bundling 2/3 Tiket + Akses Biasa", opt4: partnerForm.customOfferText
    }[partnerForm.offer];
    const subject = `Partnership - ${partnerForm.konserName}`;
    const body = `Halo JDWLKNSRBDG,\n\nEvent: ${partnerForm.konserName}\nTanggal: ${partnerForm.date}\nWA: ${partnerForm.wa}\nKerjasama: ${offerText}\nKamera: ${partnerForm.cameraAccess ? 'Ya' : 'Tidak'}`;
    window.open(`mailto:jadwalkonserbandung@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  // CRUD
  const handleAddEvent = async () => {
    if (!newEvent.title) return alert("Judul wajib!");
    setUploading(true);
    const { error } = await supabase.from('events').insert([{ ...newEvent, slug: slugify(newEvent.title) }]);
    setUploading(false);
    if (error) alert("Error: " + error.message);
    else { setNewEvent({ title: "", date: "", location: "", price: "", ticket: "", map: "", description: "", image: "" }); alert("Sukses!"); }
  };
  const handleDeleteEvent = async (id) => { if (confirm("Hapus?")) await supabase.from('events').delete().eq('id', id); };
  const handleSaveEdit = async () => { if (editingEvent) { await supabase.from('events').update(editingEvent).eq('id', editingEvent.id); setEditingEvent(null); alert("Updated!"); } };
  const handleBannerUpload = async (file) => { const url = await handleUploadImage(file); if (url) await supabase.from('banners').insert([{ url }]); };
  const handleDeleteBanner = async (id) => { if (confirm("Hapus?")) await supabase.from('banners').delete().eq('id', id); };
  const handleAddPartner = async () => { if (newPartner.name) { await supabase.from('partners').insert([newPartner]); setNewPartner({ name: '', url: '' }); } };
  const handleDeletePartner = async (id) => { await supabase.from('partners').delete().eq('id', id); };

  /* ================= RENDER ================= */
  if (loading) return <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999] text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 font-sans selection:bg-[#a6b5cf] selection:text-black overflow-x-hidden flex flex-col">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b-2 border-black">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer select-none group" onClick={handleSecretTrigger}>
            <div className="w-8 h-8 bg-[#a6b5cf] border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-active:translate-y-1 group-active:shadow-none transition-all">🎵</div>
            <h1 className="text-xl font-bold tracking-tighter">JDWL<span className="text-[#31528b]">KNSRBDG</span></h1>
          </div>
          <div className="flex gap-4 text-sm font-bold">
            <a href="#" className="hover:text-[#31528b] transition-colors">HOME</a>
            <a href="#partners" className="hover:text-[#31528b] transition-colors">PARTNERS</a>
          </div>
        </div>
      </nav>

      {/* CONTENT */}
      <main className="w-full flex-grow">
        
        {/* BANNER */}
        <div className="mt-8 relative w-full overflow-hidden py-4">
          {banners.length === 0 ? (
             <div className="w-full text-center py-10 bg-slate-200 border-2 border-black mx-auto max-w-[630px] rounded-2xl"><p className="font-bold text-slate-500">{supabase ? "Belum ada banner." : "Setup Supabase dulu!"}</p></div>
          ) : (
            <>
              <motion.div className="flex gap-4 items-center" style={{ "--slide-width": "min(630px, 85vw)", "--gap": "16px" }} animate={{ x: `calc(50% - (var(--slide-width) / 2) - (${bannerIndex} * (var(--slide-width) + var(--gap))))` }} transition={{ type: "spring", stiffness: 200, damping: 25 }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1} onDragStart={() => setIsDragging(true)} onDragEnd={(e, i) => { setIsDragging(false); if (i.offset.x < -50 || i.velocity.x < -500) setBannerIndex((p) => (p + 1) % banners.length); else if (i.offset.x > 50 || i.velocity.x > 500) setBannerIndex((p) => (p - 1 + banners.length) % banners.length); }}>
                {banners.map((item, index) => (
                  <motion.div key={item.id} className="relative shrink-0 rounded-2xl border-2 border-black bg-black overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300" style={{ width: "var(--slide-width)", aspectRatio: "630/140" }} animate={{ scale: index === bannerIndex ? 1 : 0.9, opacity: index === bannerIndex ? 1 : 0.5, filter: index === bannerIndex ? "grayscale(0%)" : "grayscale(100%)" }}>
                    <img src={item.url} className="w-full h-full object-cover opacity-90" draggable="false" />
                    {index === bannerIndex && <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center p-2"><h2 className="text-lg md:text-2xl font-black text-white tracking-tighter drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] text-center leading-none">JELAJAHI MUSIK <span className="text-[#a6b5cf]">BANDUNG</span></h2></div>}
                  </motion.div>
                ))}
              </motion.div>
              <div className="flex justify-center gap-2 mt-6">{banners.map((_, idx) => (<button key={idx} onClick={() => setBannerIndex(idx)} className={`w-3 h-3 rounded-full border border-black shadow-sm transition-all ${idx === bannerIndex ? 'bg-[#a6b5cf] scale-125' : 'bg-white'}`} />))}</div>
            </>
          )}
        </div>

        <div className="max-w-6xl mx-auto px-6">
          <div className="mt-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari konser favoritmu..." className="w-full bg-white border-2 border-black rounded-xl px-5 py-4 text-lg font-medium focus:outline-none focus:ring-4 focus:ring-[#a6b5cf] transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">🔍</div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.length === 0 && !loading && <div className="col-span-full text-center py-20 opacity-50"><Database size={48} className="mx-auto mb-2"/><p className="font-bold">Belum ada event.</p></div>}
            {filteredEvents.map((event) => (
              <motion.div layoutId={`card-${event.id}`} key={event.id} onClick={() => setSelectedEvent(event)} whileHover={{ y: -8 }} className="bg-white rounded-2xl border-2 border-black overflow-hidden cursor-pointer shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_#31528b] transition-all group">
                <div className="relative h-48 overflow-hidden border-b-2 border-black">
                  <motion.img layoutId={`img-${event.id}`} src={event.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 bg-white border-2 border-black px-3 py-1 text-sm font-bold rounded-full shadow-sm">{event.price}</div>
                </div>
                <div className="p-5">
                  <motion.h3 layoutId={`title-${event.id}`} className="text-xl font-black mb-2 leading-tight">{event.title}</motion.h3>
                  <div className="space-y-2 text-sm font-medium text-slate-600">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-[#31528b]" /><span>{event.date}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-red-500" /><span>{event.location}</span></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* PARTNERSHIP SECTION */}
          <div id="partners" className="mt-24 border-t-4 border-black pt-10 pb-20">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowPartnershipModal(true)} className="cursor-pointer border-4 border-black bg-[#a6b5cf] p-6 md:p-8 mb-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] transition-all rounded-2xl">
               <h2 className="text-2xl md:text-4xl font-black italic tracking-tighter uppercase mb-2">✨ AYO JADIKAN <span className="text-[#31528b] bg-white px-2">JDWLKNSRBDG</span> MEDIA PARTNER! ✨</h2>
               <p className="font-bold text-lg underline decoration-wavy decoration-black">Klik di sini untuk kerjasama & boost eventmu!</p>
            </motion.div>
            <div className="flex flex-col md:flex-row items-center justify-between mb-8"><h3 className="text-3xl font-black uppercase italic tracking-tighter">Official Partners</h3><p className="text-slate-500 font-medium">Didukung oleh brand terbaik</p></div>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              {partners.map((p) => (<a key={p.id} href={p.url} target="_blank" className="bg-white px-6 py-3 rounded-xl border-2 border-black font-bold hover:bg-[#a6b5cf] transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none">{p.name} ↗</a>))}
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER (RESTORED TO FULL VERSION) */}
      <footer className="bg-black text-white pt-16 pb-8 border-t-4 border-[#a6b5cf] mt-auto">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[#a6b5cf] text-black rounded-full flex items-center justify-center text-xl font-bold border-2 border-white">🎵</div>
              <h2 className="text-3xl font-black tracking-tighter">JDWL<span className="text-[#31528b]">KNSRBDG</span></h2>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed">Platform informasi jadwal konser paling update di Bandung. Temukan gig favoritmu, beli tiket, dan rasakan atmosfer musik kota kembang.</p>
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
              <a href="https://www.instagram.com/jadwalkonserbandung/" target="_blank" className="bg-white text-black p-2 rounded-full hover:bg-[#a6b5cf] hover:scale-110 transition-all"><Instagram size={20} /></a>
              <a href="https://www.tiktok.com/@jadwalkonserbandung" target="_blank" className="bg-white text-black p-2 rounded-full hover:bg-[#a6b5cf] hover:scale-110 transition-all flex justify-center items-center">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
              </a>
              <a href="#" className="bg-white text-black p-2 rounded-full hover:bg-[#a6b5cf] hover:scale-110 transition-all"><Facebook size={20} /></a>
              <a href="#" className="bg-white text-black p-2 rounded-full hover:bg-[#a6b5cf] hover:scale-110 transition-all"><Mail size={20} /></a>
            </div>
            <div className="mt-6"><p className="text-xs text-slate-500">© 2026 JDWLKNSRBDG.</p><p className="text-xs text-slate-500">All rights reserved.</p></div>
          </div>
        </div>
      </footer>

      {/* ADMIN MODAL */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-3xl rounded-3xl border-4 border-[#31528b] p-6 shadow-2xl my-8">
                {!isAdmin ? (
                  <div className="text-center py-10">
                    <h2 className="text-2xl font-black mb-6">ADMIN ACCESS</h2>
                    <input type="password" placeholder="Password..." className="w-full text-center text-xl p-3 border-b-4 border-slate-200 focus:border-[#31528b] outline-none font-bold" value={adminPwd} onChange={(e) => setAdminPwd(e.target.value)} />
                    <button onClick={() => { if (adminPwd === ADMIN_PASSWORD) setIsAdmin(true); else alert("Salah!"); }} className="w-full mt-4 bg-[#31528b] text-white py-3 rounded-xl font-bold hover:bg-[#26406e]">MASUK</button>
                    <button onClick={() => setShowAdminLogin(false)} className="w-full mt-2 py-3 font-bold text-slate-400">BATAL</button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-6 border-b-2 border-slate-100 pb-4">
                      <h2 className="text-2xl font-black">DASHBOARD ADMIN</h2>
                      <button onClick={() => setShowAdminLogin(false)}><X size={20} /></button>
                    </div>
                    <div className="flex gap-2 mb-6 overflow-x-auto">
                      {['event', 'banner', 'partner'].map(tab => (
                        <button key={tab} onClick={() => setAdminTab(tab)} className={`px-4 py-2 rounded-full font-bold border-2 border-black capitalize ${adminTab === tab ? 'bg-black text-white' : 'bg-white'}`}>{tab}</button>
                      ))}
                    </div>
                    {adminTab === 'event' && (
                      <div className="space-y-4">
                         <input placeholder="Judul Event" className="w-full p-3 bg-slate-50 border rounded-lg" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                         <div className="grid grid-cols-2 gap-3"><input placeholder="Tanggal" className="p-3 bg-slate-50 border rounded-lg" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} /><input placeholder="Harga" className="p-3 bg-slate-50 border rounded-lg" value={newEvent.price} onChange={e => setNewEvent({...newEvent, price: e.target.value})} /></div>
                         <input placeholder="Lokasi" className="w-full p-3 bg-slate-50 border rounded-lg" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
                         <input placeholder="Link Tiket" className="w-full p-3 bg-slate-50 border rounded-lg" value={newEvent.ticket} onChange={e => setNewEvent({...newEvent, ticket: e.target.value})} />
                         <input placeholder="Kode Embed Map (iframe)" className="w-full p-3 bg-slate-50 border rounded-lg" value={newEvent.map} onChange={(e) => { let val = e.target.value; if (val.includes('<iframe')) { const match = val.match(/src="([^"]+)"/); if (match) val = match[1]; } setNewEvent({...newEvent, map: val}); }} />
                         <textarea placeholder="Deskripsi" className="w-full p-3 bg-slate-50 border rounded-lg" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
                         <div className="border-2 border-dashed border-slate-300 p-4 rounded-lg text-center">
                            {uploading ? <div className="text-[#31528b] font-bold animate-pulse">Uploading...</div> : <label className="cursor-pointer block font-bold text-slate-500">📸 Upload Gambar Event (Max 10MB)<input type="file" className="hidden" onChange={async (e) => { const url = await handleUploadImage(e.target.files[0]); if(url) setNewEvent({...newEvent, image: url}); }} /></label>}
                         </div>
                         {newEvent.image && <img src={newEvent.image} className="h-20 rounded border border-black mx-auto" />}
                         <button onClick={handleAddEvent} className="w-full bg-[#a6b5cf] text-black py-3 rounded-xl font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none transition-all" disabled={uploading}>{uploading ? "Uploading..." : "PUBLISH EVENT"}</button>
                         <div className="mt-6 border-t pt-4">
                            <h3 className="font-bold mb-2">List Events</h3>
                            {events.map(ev => (<div key={ev.id} className="flex justify-between items-center p-2 bg-slate-50 mb-2 rounded border"><span>{ev.title}</span><div className="flex gap-2"><button onClick={() => { setEditingEvent(ev); setNewEvent(ev); }} className="p-1 bg-yellow-200 rounded"><Edit2 size={14} /></button><button onClick={() => handleDeleteEvent(ev.id)} className="p-1 bg-red-200 rounded"><Trash2 size={14} /></button></div></div>))}
                         </div>
                      </div>
                    )}
                    {adminTab === 'banner' && (
                      <div>
                        <div className="border-2 border-dashed border-[#31528b] p-8 rounded-xl text-center mb-6">
                           {uploading ? <p className="font-bold text-[#31528b]">Sedang Upload...</p> : <label className="cursor-pointer block"><Upload className="mx-auto mb-2 text-[#31528b]" /><span className="font-bold text-[#31528b]">Tambah Banner (Max 10MB)</span><input type="file" className="hidden" onChange={(e) => handleBannerUpload(e.target.files[0])} /></label>}
                        </div>
                        <div className="grid grid-cols-2 gap-4">{banners.map((b) => (<div key={b.id} className="relative group rounded-xl overflow-hidden border border-slate-300"><img src={b.url} className="w-full h-24 object-cover" /><button onClick={() => handleDeleteBanner(b.id)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full"><Trash2 size={14} /></button></div>))}</div>
                      </div>
                    )}
                    {adminTab === 'partner' && (
                       <div className="space-y-4">
                          <div className="flex gap-2"><input placeholder="Nama" className="flex-1 p-2 border rounded" value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} /><input placeholder="URL" className="flex-1 p-2 border rounded" value={newPartner.url} onChange={e => setNewPartner({...newPartner, url: e.target.value})} /><button onClick={handleAddPartner} className="bg-black text-white px-4 rounded font-bold">ADD</button></div>
                          <div>{partners.map(p => (<div key={p.id} className="flex justify-between items-center p-2 border-b"><span>{p.name}</span><button onClick={() => handleDeletePartner(p.id)} className="text-red-500 text-xs hover:underline">Hapus</button></div>))}</div>
                       </div>
                    )}
                    {editingEvent && <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm flex justify-between items-center"><span>Sedang edit: <b>{editingEvent.title}</b></span><button onClick={handleSaveEdit} className="font-bold underline">Simpan Perubahan</button></div>}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* PARTNERSHIP MODAL (RESTORED FULL) */}
      <AnimatePresence>
        {showPartnershipModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md overflow-y-auto">
             <div className="flex min-h-full items-center justify-center p-4">
               <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#FDFBF7] w-full max-w-4xl rounded-3xl border-4 border-[#a6b5cf] shadow-[10px_10px_0px_0px_rgba(255,255,255,0.2)] flex flex-col my-8">
                  <div className="bg-black text-white p-6 md:p-8 flex justify-between items-start border-b-4 border-[#a6b5cf] rounded-t-2xl">
                     <div><h2 className="text-3xl font-black italic tracking-tighter text-[#a6b5cf] mb-2">KERJASAMA MEDIA PARTNER</h2><p className="text-slate-300 font-medium">Isi form di bawah untuk kolaborasi epik bareng JDWLKNSRBDG!</p></div>
                     <button onClick={() => setShowPartnershipModal(false)} className="bg-white text-black p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors"><X size={24} /></button>
                  </div>
                  <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
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
                           <ul className="text-xs font-bold text-[#31528b] list-disc list-inside"><li>Logo Acara (PNG/JPG)</li><li>Poster Konser (Feed Instagram)</li></ul>
                           <button className="mt-4 w-full bg-[#31528b] text-white py-2 rounded-lg font-bold text-xs hover:bg-[#26406e] cursor-not-allowed opacity-70">Upload via Email (Otomatis)</button>
                        </div>
                     </div>
                     <div className="md:w-2/3 space-y-5">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1"><label className="font-bold text-sm">Nama Konser</label><input value={partnerForm.konserName} onChange={(e) => setPartnerForm({...partnerForm, konserName: e.target.value})} className="w-full border-2 border-black p-3 rounded-xl font-medium focus:ring-4 focus:ring-[#a6b5cf] outline-none" placeholder="Contoh: Bandung Berisik 2026" /></div>
                          <div className="space-y-1"><label className="font-bold text-sm">Hari / Tanggal / Tahun</label><input type="date" value={partnerForm.date} onChange={(e) => setPartnerForm({...partnerForm, date: e.target.value})} className="w-full border-2 border-black p-3 rounded-xl font-medium focus:ring-4 focus:ring-[#a6b5cf] outline-none" /></div>
                        </div>
                        <div className="space-y-1"><label className="font-bold text-sm">WhatsApp PIC</label><input value={partnerForm.wa} onChange={(e) => setPartnerForm({...partnerForm, wa: e.target.value})} className="w-full border-2 border-black p-3 rounded-xl font-medium focus:ring-4 focus:ring-[#a6b5cf] outline-none" placeholder="0812xxxx" /></div>
                        <div className="space-y-2">
                          <label className="font-bold text-sm block border-b-2 border-slate-200 pb-2 mb-2">Pilih Skema Kerjasama (Wajib Pilih Satu)</label>
                          {[ {val: 'opt1', label: 'Bundling 2/3 Tiket Konser + Akses Mudah Media Partner'}, {val: 'opt2', label: 'Fee Posting (Beli tiket mandiri, Akses MP saat acara)'}, {val: 'opt3', label: 'Bundling 2/3 Tiket Konser + Akses Biasa'}, {val: 'opt4', label: 'Isi Penawaran Sendiri...'} ].map((opt) => (
                            <label key={opt.val} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${partnerForm.offer === opt.val ? 'border-[#31528b] bg-blue-50' : 'border-slate-200 hover:border-slate-400'}`}>
                               <input type="radio" name="offer" value={opt.val} checked={partnerForm.offer === opt.val} onChange={(e) => setPartnerForm({...partnerForm, offer: e.target.value})} className="w-5 h-5 accent-[#31528b]" /><span className="font-bold text-sm">{opt.label}</span>
                            </label>
                          ))}
                          {partnerForm.offer === 'opt4' && <motion.textarea initial={{opacity: 0, height: 0}} animate={{opacity: 1, height: 'auto'}} className="w-full border-2 border-black p-3 rounded-xl mt-2 text-sm font-medium focus:ring-4 focus:ring-[#a6b5cf] outline-none" placeholder="Tuliskan penawaran kerjasama Anda di sini..." rows="3" value={partnerForm.customOfferText} onChange={(e) => setPartnerForm({...partnerForm, customOfferText: e.target.value})} />}
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-300">
                           <label className="flex items-start gap-3 cursor-pointer">
                              <input type="checkbox" checked={partnerForm.cameraAccess} onChange={(e) => setPartnerForm({...partnerForm, cameraAccess: e.target.checked})} className="w-6 h-6 mt-1 accent-[#31528b] rounded" />
                              <div className="text-sm"><p className="font-bold">Izin Membawa Kamera Profesional?</p><p className="text-slate-500 text-xs mt-1">Jika dicentang, Media Partner boleh membawa kamera profesional. Hasil foto/video akan dibagikan ke panitia untuk keperluan dokumentasi.</p></div>
                           </label>
                        </div>
                     </div>
                  </div>
                  <div className="p-6 md:p-8 border-t-2 border-slate-200 bg-white rounded-b-2xl">
                     <button onClick={handleSubmitPartnership} className="w-full bg-black text-white py-4 rounded-xl font-black text-xl hover:bg-[#a6b5cf] hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all border-2 border-transparent hover:border-black flex items-center justify-center gap-2"><Mail /> KIRIM PENAWARAN (VIA EMAIL)</button>
                     <p className="text-center text-xs text-slate-400 mt-3">*Akan membuka aplikasi email Anda dengan format pesan otomatis.</p>
                  </div>
               </motion.div>
             </div>
          </div>
        )}
      </AnimatePresence>
      
      {/* DETAIL MODAL */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div layoutId={`card-${selectedEvent.id}`} className="relative w-full max-w-4xl bg-white rounded-3xl border-4 border-black shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] overflow-hidden flex flex-col md:flex-row my-8">
                <div className="md:w-1/2 relative min-h-[300px] border-b-4 md:border-b-0 md:border-r-4 border-black">
                  <motion.img layoutId={`img-${selectedEvent.id}`} src={selectedEvent.image} className="absolute inset-0 w-full h-full object-cover" />
                  <button onClick={() => setSelectedEvent(null)} className="absolute top-4 left-4 bg-white rounded-full p-2 border-2 border-black shadow-md hover:bg-red-500 hover:text-white transition-colors z-10"><X size={20} /></button>
                </div>
                <div className="md:w-1/2 p-6 flex flex-col bg-[#FDFBF7]">
                  <h2 className="text-3xl font-black mb-4">{selectedEvent.title}</h2>
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-2"><Calendar className="text-[#31528b]" /><span className="font-bold">{selectedEvent.date}</span></div>
                    <div className="flex items-center gap-2"><MapPin className="text-red-500" /><span className="font-bold">{selectedEvent.location}</span></div>
                  </div>
                  <p className="text-slate-600 mb-6">{selectedEvent.description}</p>
                  {selectedEvent.map && <div className="rounded-xl overflow-hidden border border-black h-40 mb-6"><iframe src={selectedEvent.map} className="w-full h-full border-0" /></div>}
                  <a href={selectedEvent.ticket} target="_blank" className="block w-full bg-black text-white text-center py-3 rounded-xl font-bold hover:bg-[#a6b5cf] hover:text-black">BELI TIKET</a>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}