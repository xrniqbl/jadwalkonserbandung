import React, { useEffect, useMemo, useState } from "react";

/* ======================================================
   CONFIG
====================================================== */
const ADMIN_PASSWORD = "admin123";
const EVENTS_PER_PAGE = 6;

/* ======================================================
   UTIL
====================================================== */
const slugify = (t = "") =>
  t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const readFile = (file) =>
  new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(file);
  });

/* ======================================================
   DEFAULT DATA
====================================================== */
const DEFAULT_EVENTS = [
  {
    id: Date.now(),
    title: "Luvialand",
    slug: "luvialand",
    date: "20 Januari 2026",
    location: "Bandung",
    price: "Rp100.000",
    ticket: "https://goersapp.com",
    image:
      "https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2",
    map: "https://maps.google.com/maps?q=bandung&t=&z=11&output=embed",
    description: "Konser indie intimate dengan visual artistik.",
  },
];

const DEFAULT_BANNERS = [
  "https://images.unsplash.com/photo-1518972559570-7cc1309f3229",
  "https://images.unsplash.com/photo-1497032205916-ac775f0649ae",
];

const DEFAULT_PARTNERS = [
  { id: 1, name: "GOERS", url: "https://goersapp.com" },
  { id: 2, name: "Spotify", url: "https://spotify.com" },
];

/* ======================================================
   MAIN COMPONENT
====================================================== */
export default function JadwalKonserBandung() {
  /* ================= STATE ================= */
  const [dark, setDark] = useState(
    () => localStorage.getItem("dark") === "1"
  );

  const [events, setEvents] = useState(
    () => JSON.parse(localStorage.getItem("events")) || DEFAULT_EVENTS
  );

  const [banners, setBanners] = useState(
    () => JSON.parse(localStorage.getItem("banners")) || DEFAULT_BANNERS
  );

  const [partners, setPartners] = useState(
    () => JSON.parse(localStorage.getItem("partners")) || DEFAULT_PARTNERS
  );

  const [page, setPage] = useState("home"); // home | partner
  const [detail, setDetail] = useState(null);

  /* ================= SEARCH & SORT ================= */
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");

  /* ================= PAGINATION ================= */
  const [currentPage, setCurrentPage] = useState(1);

  /* ================= BANNER SLIDER ================= */
  const [bannerIndex, setBannerIndex] = useState(0);

  /* ================= ADMIN ================= */
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminTab, setAdminTab] = useState("event");
  const [adminPwd, setAdminPwd] = useState("");

  const [editingEvent, setEditingEvent] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    location: "",
    price: "",
    ticket: "",
    map: "",
    description: "",
    image: "",
  });

  const [newPartner, setNewPartner] = useState({ name: "", url: "" });

  /* ================= EFFECTS ================= */
  useEffect(() => {
    localStorage.setItem("dark", dark ? "1" : "0");
  }, [dark]);

  useEffect(() => {
    localStorage.setItem("events", JSON.stringify(events));
    localStorage.setItem("banners", JSON.stringify(banners));
    localStorage.setItem("partners", JSON.stringify(partners));
  }, [events, banners, partners]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(
      () => setBannerIndex((i) => (i + 1) % banners.length),
      4000
    );
    return () => clearInterval(t);
  }, [banners]);

  /* ================= FILTER ================= */
  const filteredEvents = useMemo(() => {
    let data = events.filter((e) =>
      e.title.toLowerCase().includes(search.toLowerCase())
    );
    if (sort === "az") data.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === "newest") data.sort((a, b) => b.id - a.id);
    return data;
  }, [events, search, sort]);

  const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * EVENTS_PER_PAGE,
    currentPage * EVENTS_PER_PAGE
  );

  /* ================= ADMIN LOGIC ================= */
  const addEvent = () => {
    if (!newEvent.title) return alert("Judul wajib");
    setEvents([
      {
        ...newEvent,
        id: Date.now(),
        slug: slugify(newEvent.title),
      },
      ...events,
    ]);
    setNewEvent({
      title: "",
      date: "",
      location: "",
      price: "",
      ticket: "",
      map: "",
      description: "",
      image: "",
    });
  };

  const saveEditEvent = () => {
    setEvents(
      events.map((e) => (e.id === editingEvent.id ? editingEvent : e))
    );
    setEditingEvent(null);
  };

  const deleteEvent = (id) => {
    if (!confirm("Hapus event ini?")) return;
    setEvents(events.filter((e) => e.id !== id));
  };

  const addPartner = () => {
    if (!newPartner.name) return;
    setPartners([...partners, { ...newPartner, id: Date.now() }]);
    setNewPartner({ name: "", url: "" });
  };

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className={dark ? "dark bg-slate-900 text-white" : "bg-slate-100"}>
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-blue-600 border-b border-white/30 text-white px-6 py-4 flex justify-between">
        <b className="text-lg">🎵 Jadwal Konser Bandung</b>
        <div className="flex gap-4 items-center font-semibold">
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => setPage("partner")}>Partnership</button>
          <button onClick={() => setDark(!dark)}>
            {dark ? "☀️" : "🌙"}
          </button>
          <button
            className="bg-white text-blue-600 px-3 py-1 rounded"
            onClick={() => setShowAdmin(true)}
          >
            Admin
          </button>
        </div>
      </nav>

      {/* BANNER – HOME ONLY */}
      {!detail && page === "home" && (
        <div className="max-w-6xl mx-auto mt-6 relative">
          <img
            src={banners[bannerIndex]}
            className="w-full h-56 object-cover rounded-2xl shadow transition-all duration-700"
          />
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
            {banners.map((_, i) => (
              <span
                key={i}
                onClick={() => setBannerIndex(i)}
                className={`w-3 h-3 rounded-full cursor-pointer ${
                  i === bannerIndex ? "bg-blue-500" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* SEARCH & SORT */}
      {!detail && page === "home" && (
        <div className="max-w-6xl mx-auto p-6 flex gap-4">
          <input
            className="flex-1 p-3 rounded-xl border"
            placeholder="Cari konser..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="p-3 rounded-xl border"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Terbaru</option>
            <option value="az">A–Z</option>
          </select>
        </div>
      )}

      {/* EVENT GRID */}
      {!detail && page === "home" && (
        <div className="max-w-6xl mx-auto p-6 grid md:grid-cols-3 gap-6">
          {paginatedEvents.map((e) => (
            <div
              key={e.id}
              className="
  bg-white dark:bg-slate-800 
  text-slate-900 dark:text-slate-100
  rounded-2xl shadow
"

              onClick={() => setDetail(e)}
            >
              <img
                src={e.image}
                className="h-40 w-full object-cover rounded-t-2xl"
              />
              <div className="p-4 space-y-1">
                <b>{e.title}</b>
                <p className="text-sm opacity-70">{e.date}</p>
                <p className="text-blue-500 font-semibold">{e.price}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAGINATION */}
      {!detail && (
        <div className="flex justify-center gap-2 pb-10">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded transition ${
                currentPage === i + 1
                  ? "bg-blue-600 text-white"
                  : "bg-white"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* DETAIL */}
      {detail && (
        <div className="max-w-6xl mx-auto p-6 grid md:grid-cols-2 gap-6">
          <img
            src={detail.image}
            className="rounded-2xl w-full h-[350px] object-cover"
          />
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">{detail.title}</h1>
            <p>{detail.description}</p>
            <iframe
              src={detail.map}
              className="w-full h-40 rounded"
              loading="lazy"
            />
            <a
              href={detail.ticket}
              target="_blank"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg"
            >
              Beli Tiket
            </a>
            <button
              className="block text-blue-500 mt-2"
              onClick={() => setDetail(null)}
            >
              ← Kembali
            </button>
          </div>
        </div>
      )}

      {/* PARTNERSHIP (NO BANNER) */}
      {page === "partner" && (
        <div className="max-w-4xl mx-auto p-10 text-center space-y-6">
          <h2 className="text-3xl font-bold">Partner Kami</h2>
          <div className="flex justify-center gap-6 flex-wrap">
            {partners.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                className="
  bg-white dark:bg-slate-800 
  text-slate-900 dark:text-slate-100
  rounded-2xl shadow
"

              >
                {p.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ================= ADMIN PANEL ================= */}
      {showAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
          <div className="
  bg-white dark:bg-slate-800 
  text-slate-900 dark:text-slate-100
  rounded-2xl shadow
">

            {!isAdmin ? (
              <>
                <h3 className="text-xl font-bold">Admin Login</h3>
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full p-3 rounded border"
                  value={adminPwd}
                  onChange={(e) => setAdminPwd(e.target.value)}
                />
                <button
                  className="w-full bg-blue-600 text-white py-3 rounded-xl"
                  onClick={() =>
                    adminPwd === ADMIN_PASSWORD
                      ? setIsAdmin(true)
                      : alert("Password salah")
                  }
                >
                  Login
                </button>
              </>
            ) : (
              <>
                {/* ADMIN TABS */}
                <div className="flex gap-4 font-semibold">
                  <button onClick={() => setAdminTab("event")}>Event</button>
                  <button onClick={() => setAdminTab("banner")}>Banner</button>
                  <button onClick={() => setAdminTab("partner")}>Partner</button>
                </div>

                {/* EVENT CRUD */}
                {adminTab === "event" && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold">Event</h3>

                    {/* ADD EVENT */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <input placeholder="Judul" className="p-3 border rounded"
                        value={newEvent.title}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, title: e.target.value })
                        }
                      />
                      <input placeholder="Tanggal" className="p-3 border rounded"
                        value={newEvent.date}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, date: e.target.value })
                        }
                      />
                      <input placeholder="Lokasi" className="p-3 border rounded"
                        value={newEvent.location}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, location: e.target.value })
                        }
                      />
                      <input placeholder="Harga" className="p-3 border rounded"
                        value={newEvent.price}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, price: e.target.value })
                        }
                      />
                      <input placeholder="Link Tiket" className="p-3 border rounded"
                        value={newEvent.ticket}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, ticket: e.target.value })
                        }
                      />
                      <input placeholder="Google Maps Embed" className="p-3 border rounded"
                        value={newEvent.map}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, map: e.target.value })
                        }
                      />
                      <textarea placeholder="Deskripsi" className="p-3 border rounded md:col-span-2"
                        value={newEvent.description}
                        onChange={(e) =>
                          setNewEvent({ ...newEvent, description: e.target.value })
                        }
                      />
                      <input type="file"
                        onChange={async (e) =>
                          setNewEvent({
                            ...newEvent,
                            image: await readFile(e.target.files[0]),
                          })
                        }
                      />
                    </div>

                    <button
                      className="bg-green-600 text-white px-6 py-3 rounded-xl"
                      onClick={addEvent}
                    >
                      Tambah Event
                    </button>

                    {/* LIST */}
                    <div className="space-y-2">
                      {events.map((e) => (
                        <div
                          key={e.id}
                          className="flex justify-between items-center bg-slate-100 dark:bg-slate-700 p-3 rounded"
                        >
                          <span>{e.title}</span>
                          <div className="flex gap-2">
                            <button
                              className="text-yellow-500"
                              onClick={() => setEditingEvent(e)}
                            >
                              Edit
                            </button>
                            <button
                              className="text-red-500"
                              onClick={() => deleteEvent(e.id)}
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* EDIT MODAL */}
                    {editingEvent && (
                      <div className="p-4 border rounded space-y-3">
                        <h4 className="font-bold">Edit Event</h4>
                        <input className="w-full p-2 border rounded"
                          value={editingEvent.title}
                          onChange={(e) =>
                            setEditingEvent({ ...editingEvent, title: e.target.value })
                          }
                        />
                        <textarea className="w-full p-2 border rounded"
                          value={editingEvent.description}
                          onChange={(e) =>
                            setEditingEvent({ ...editingEvent, description: e.target.value })
                          }
                        />
                        <button
                          className="bg-blue-600 text-white px-4 py-2 rounded"
                          onClick={saveEditEvent}
                        >
                          Simpan
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* BANNER CRUD */}
                {adminTab === "banner" && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Banner</h3>
                    <input
                      type="file"
                      onChange={async (e) =>
                        setBanners([...banners, await readFile(e.target.files[0])])
                      }
                    />
                    {banners.map((b, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <img src={b} className="h-16 rounded" />
                        <button
                          className="text-red-500"
                          onClick={() =>
                            setBanners(banners.filter((_, x) => x !== i))
                          }
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* PARTNER CRUD */}
                {adminTab === "partner" && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold">Partner</h3>
                    <input placeholder="Nama" className="p-3 border rounded"
                      value={newPartner.name}
                      onChange={(e) =>
                        setNewPartner({ ...newPartner, name: e.target.value })
                      }
                    />
                    <input placeholder="URL" className="p-3 border rounded"
                      value={newPartner.url}
                      onChange={(e) =>
                        setNewPartner({ ...newPartner, url: e.target.value })
                      }
                    />
                    <button
                      className="bg-green-600 text-white px-4 py-2 rounded"
                      onClick={addPartner}
                    >
                      Tambah Partner
                    </button>

                    {partners.map((p) => (
                      <div key={p.id} className="flex justify-between">
                        <span>{p.name}</span>
                        <button
                          className="text-red-500"
                          onClick={() =>
                            setPartners(partners.filter((x) => x.id !== p.id))
                          }
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <button
              className="w-full opacity-60"
              onClick={() => {
                setShowAdmin(false);
                setIsAdmin(false);
                setEditingEvent(null);
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
