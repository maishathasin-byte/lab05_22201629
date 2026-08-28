import { useEffect, useState } from "react";
import { getToken } from "../utils/authStore";
import "../styles/store.css";

function coverSvg(title, genre, c1 = "#06b6d4", c2 = "#7c3aed") {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${c1}" />
          <stop offset="100%" stop-color="${c2}" />
        </linearGradient>
      </defs>
      <rect width="900" height="520" rx="28" fill="#0b1120"/>
      <rect x="18" y="18" width="864" height="484" rx="24" fill="url(#g)" opacity="0.92"/>
      <text x="52" y="120" fill="#e5f7ff" font-size="22" font-family="Arial" font-weight="700">${genre}</text>
      <text x="52" y="220" fill="#ffffff" font-size="46" font-family="Arial" font-weight="900">${title}</text>
      <text x="52" y="280" fill="#dbeafe" font-size="18" font-family="Arial">Owned Game</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function money(v) {
  return `$${Number(v || 0).toFixed(2)}`;
}

function finalPrice(game) {
  return +(game.basePrice * (1 - game.discount / 100)).toFixed(2);
}

export default function OwnedGames() {
  const [ownedGames, setOwnedGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOwnedGames = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      const res = await fetch("/api/store/owned", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load owned games");
      }

      setOwnedGames(data.ownedGames || []);
    } catch (err) {
      setError(err.message || "Failed to load owned games");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwnedGames();
  }, []);

  return (
    <section className="app-section store-page">
      <header className="page-head">
        <div>
          <h1 className="page-title">🎮 Owned Games</h1>
          <p className="page-sub">
            Games you purchased from the store.
          </p>
        </div>
      </header>

      {error && (
        <div style={{ color: "#ff6b6b", marginBottom: "16px" }}>{error}</div>
      )}

      {loading ? (
        <div className="card">
          <b>Loading owned games...</b>
        </div>
      ) : ownedGames.length === 0 ? (
        <div className="card">
          <b>No owned games yet.</b>
          <div className="tiny muted">Buy games from the store first.</div>
        </div>
      ) : (
        <section className="game-grid">
          {ownedGames.map((game) => {
            const c1 = game.colors?.[0] || "#06b6d4";
            const c2 = game.colors?.[1] || "#7c3aed";
            const image = coverSvg(game.title, game.genre, c1, c2);

            return (
              <div key={game._id} className="game-card">
                <img src={image} alt={game.title} />

                <div className="content">
                  <h3>{game.title}</h3>

                  <div className="meta-row">
                    <span className="badge">{game.genre}</span>
                    <span className="badge">⭐ {game.rating}</span>
                    <span className="badge">{game.playtime}</span>
                    <span
                      className="badge"
                      style={{
                        borderColor: "rgba(0,230,118,.45)",
                        background: "rgba(0,230,118,.14)",
                        color: "#d6ffe9",
                      }}
                    >
                      Owned
                    </span>
                  </div>

                  <div className="price-row">
                    <div className="price">{money(finalPrice(game))}</div>
                    <div className="discount">Purchased</div>
                  </div>

                  <div className="tiny muted">{game.description}</div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </section>
  );
}
