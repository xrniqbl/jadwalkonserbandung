import { useState } from "react";
import "./app.css";

const DATA = [
  {
    id: 1,
    title: "Luvialand",
    date: "20 Januari 2026",
    location: "Kopivilium, Bandung",
    description:
      "Konser intimate dengan suasana santai dan akustik, cocok untuk penikmat musik.",
    price: "Rp100.000",
    image:
      "https://images.unsplash.com/photo-1518972559570-0a55526c6b0f",
    ticket: "https://google.com",
  },
  {
    id: 2,
    title: "Indie Night Bandung",
    date: "28 Januari 2026",
    location: "Sudirman Street",
    description: "Malam musik indie dengan band lokal Bandung.",
    price: "Rp75.000",
    image:
      "https://images.unsplash.com/photo-1507874457470-272b3c8d8ee2",
    ticket: "https://google.com",
  },
];

export default function App() {
  const [detail, setDetail] = useState(null);

  return (
    <div className="app">
      {/* NAVBAR */}
      <header className="navbar">
        <h1>🎵 Jadwal Konser Bandung</h1>
      </header>

      {/* GRID */}
      {!detail && (
        <section className="grid">
          {DATA.map((c) => (
            <article className="card" key={c.id}>
              <div className="card-image">
                <img src={c.image} alt={c.title} />
              </div>

              <div className="card-body">
                <h2>{c.title}</h2>
                <p className="meta">📅 {c.date}</p>
                <p className="meta">📍 {c.location}</p>
                <p className="price">{c.price}</p>

                <button onClick={() => setDetail(c)}>
                  Lihat Detail
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* DETAIL PAGE */}
      {detail && (
        <section className="detail">
          <button className="back" onClick={() => setDetail(null)}>
            ← Kembali ke Info Konser
          </button>

          <div className="detail-layout">
            <img src={detail.image} alt={detail.title} />

            <div className="detail-info">
              <h1>{detail.title}</h1>
              <p className="meta">📍 {detail.location}</p>
              <p className="meta">📅 {detail.date}</p>

              <p className="desc">{detail.description}</p>

              <div className="buy-box">
                <span>{detail.price}</span>
                <a href={detail.ticket} target="_blank">
                  <button>Beli Tiket</button>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
