import { useEffect, useMemo, useState } from "react";
import { getToken } from "../utils/authStore";
import "../styles/marketplace.css";

const tabs = ["market", "sell", "my", "inv", "tx", "help"];

function money(n) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export default function Marketplace() {
  const token = getToken();

  const [view, setView] = useState("market");
  const [summary, setSummary] = useState({ wallet: 0, inventoryCount: 0, activeCount: 0 });
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [toast, setToast] = useState("");

  const [filters, setFilters] = useState({
    q: "",
    type: "all",
    platform: "all",
    sort: "new",
    max: "",
  });

  const [form, setForm] = useState({
    type: "game",
    platform: "PC",
    title: "",
    price: "",
    condition: "new",
    tags: "",
    description: "",
  });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1700);
  };

  const api = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Request failed");
    return data;
  };

  const loadAll = async () => {
    try {
      const [s, l, m, inv, tx] = await Promise.all([
        api("/api/marketplace/summary"),
        api("/api/marketplace/listings"),
        api("/api/marketplace/my-listings"),
        api("/api/marketplace/inventory"),
        api("/api/marketplace/transactions"),
      ]);

      setSummary(s);
      setListings(l);
      setMyListings(m);
      setInventory(inv);
      setTransactions(tx);
    } catch (err) {
      showToast(err.message);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredListings = useMemo(() => {
    let list = [...listings];

    if (filters.q.trim()) {
      const q = filters.q.toLowerCase();
      list = list.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.sellerName.toLowerCase().includes(q) ||
          x.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filters.type !== "all") list = list.filter((x) => x.type === filters.type);
    if (filters.platform !== "all") list = list.filter((x) => x.platform === filters.platform);
    if (filters.max) list = list.filter((x) => Number(x.price) <= Number(filters.max));

    if (filters.sort === "price_asc") list.sort((a, b) => a.price - b.price);
    if (filters.sort === "price_desc") list.sort((a, b) => b.price - a.price);
    if (filters.sort === "new") list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return list;
  }, [listings, filters]);

  const createListing = async () => {
    try {
      const tags = form.tags.split(",").map((x) => x.trim()).filter(Boolean);

      await api("/api/marketplace/listings", {
        method: "POST",
        body: JSON.stringify({ ...form, price: Number(form.price), tags }),
      });

      setForm({
        type: "game",
        platform: "PC",
        title: "",
        price: "",
        condition: "new",
        tags: "",
        description: "",
      });

      showToast("Listing published!");
      setView("my");
      loadAll();
    } catch (err) {
      showToast(err.message);
    }
  };

  const buyListing = async (id) => {
    try {
      await api("/api/marketplace/buy", {
        method: "POST",
        body: JSON.stringify({ listingId: id }),
      });

      showToast("Purchase successful!");
      loadAll();
    } catch (err) {
      showToast(err.message);
    }
  };

  const delistListing = async (id) => {
    try {
      await api("/api/marketplace/delist", {
        method: "PATCH",
        body: JSON.stringify({ listingId: id }),
      });

      showToast("Listing delisted.");
      loadAll();
    } catch (err) {
      showToast(err.message);
    }
  };

  const sendOffer = async (id) => {
    const price = prompt("Offer price:");
    const message = prompt("Message:");

    if (!price || !message) return;

    try {
      await api("/api/marketplace/offer", {
        method: "POST",
        body: JSON.stringify({ listingId: id, price: Number(price), message }),
      });

      showToast("Offer sent!");
      loadAll();
    } catch (err) {
      showToast(err.message);
    }
  };

  const prefillFromInventory = (item) => {
    setForm({
      type: item.type,
      platform: item.platform,
      title: item.title,
      price: "",
      condition: item.condition === "new" ? "new" : "used",
      tags: item.tags?.join(", ") || "",
      description: `Selling my owned item. Notes: ${item.note || "—"}`,
    });
    setView("sell");
  };

  const ListingCard = ({ item, mine = false }) => (
    <div className="mp-card">
      <div className="mp-card-top">
        <div>
          <div className="mp-card-title">{item.title}</div>
          <div className="mp-card-sub">
            Seller: <b>{item.sellerName}</b> • {new Date(item.createdAt).toLocaleString()}
          </div>

          <div className="mp-badges">
            <span className="mp-badge accent">{item.type}</span>
            <span className="mp-badge">{item.platform}</span>
            <span className="mp-badge">{item.condition}</span>
            {mine && <span className="mp-badge pink">My listing</span>}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div className="mp-price">{money(item.price)}</div>
        </div>
      </div>

      <div className="mp-badges">
        {item.tags?.slice(0, 4).map((tag) => (
          <span className="mp-badge" key={tag}>{tag}</span>
        ))}
      </div>

      <div className="mp-desc">{item.description || "No description."}</div>

      {mine ? (
        <div className="mp-actions">
          <button className="mp-action danger" onClick={() => delistListing(item._id)}>
            Delist
          </button>
          <div className="mp-desc">
            <b>Offers:</b> {item.offers?.length || 0} • <b>Status:</b> {item.status}
          </div>
        </div>
      ) : (
        <div className="mp-actions">
          <button className="mp-action buy" onClick={() => buyListing(item._id)}>
            Buy
          </button>
          <button className="mp-action" onClick={() => sendOffer(item._id)}>
            Offer
          </button>
        </div>
      )}
    </div>
  );

  return (
    <section id="section-marketplace" className="app-section content-section marketplace-page">
      <div className="mp-wrap">
        <header className="mp-topbar">
          <div>
            <h2 className="mp-title">🧑‍🤝‍🧑 Player-to-Player Marketplace</h2>
            <p className="mp-sub muted">Sell and buy games or skins using MongoDB marketplace data.</p>
          </div>

          <div className="mp-top-actions">
            <div className="mp-stat-chip">
              <div className="k">Wallet</div>
              <div className="v">{money(summary.wallet)}</div>
            </div>
            <div className="mp-stat-chip">
              <div className="k">Inventory</div>
              <div className="v">{summary.inventoryCount}</div>
            </div>
            <div className="mp-stat-chip">
              <div className="k">Active</div>
              <div className="v">{summary.activeCount}</div>
            </div>

            <button className="mp-btn ghost" onClick={() => setView("help")}>Safety</button>
            <button className="mp-btn" onClick={() => setView("sell")}>Create listing</button>
          </div>
        </header>

        <div className="mp-tabs">
          {tabs.map((t) => (
            <button
              key={t}
              className={`mp-tab ${view === t ? "active" : ""}`}
              onClick={() => setView(t)}
            >
              {t === "market" && "🛒 Marketplace"}
              {t === "sell" && "➕ Sell"}
              {t === "my" && "🪪 My Listings"}
              {t === "inv" && "📦 Inventory"}
              {t === "tx" && "🧾 Transactions"}
              {t === "help" && "🛡️ Safety"}
            </button>
          ))}
        </div>

        {view === "market" && (
          <div className="mp-view active">
            <div className="mp-panel">
              <div className="mp-panel-head">
                <h3>Browse listings</h3>
                <div className="mp-meta">Showing: <b>{filteredListings.length}</b></div>
              </div>

              <div className="mp-filters">
                <div className="mp-field">
                  <label>Search</label>
                  <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
                </div>

                <div className="mp-field">
                  <label>Type</label>
                  <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                    <option value="all">All</option>
                    <option value="game">Game</option>
                    <option value="skin">Skin</option>
                  </select>
                </div>

                <div className="mp-field">
                  <label>Platform</label>
                  <select value={filters.platform} onChange={(e) => setFilters({ ...filters, platform: e.target.value })}>
                    <option value="all">All</option>
                    <option value="PC">PC</option>
                    <option value="Steam">Steam</option>
                    <option value="Epic">Epic</option>
                    <option value="PS">PlayStation</option>
                    <option value="Xbox">Xbox</option>
                    <option value="Mobile">Mobile</option>
                  </select>
                </div>

                <div className="mp-field">
                  <label>Sort</label>
                  <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
                    <option value="new">Newest</option>
                    <option value="price_asc">Price Low → High</option>
                    <option value="price_desc">Price High → Low</option>
                  </select>
                </div>

                <div className="mp-field">
                  <label>Max price</label>
                  <input type="number" value={filters.max} onChange={(e) => setFilters({ ...filters, max: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="mp-cards">
              {filteredListings.length === 0 ? (
                <div className="muted">No listings found.</div>
              ) : (
                filteredListings.map((x) => <ListingCard key={x._id} item={x} />)
              )}
            </div>
          </div>
        )}

        {view === "sell" && (
          <div className="mp-view active">
            <div className="mp-panel">
              <div className="mp-panel-head">
                <h3>Create listing</h3>
                <div className="mp-meta">Listings save to MongoDB.</div>
              </div>

              <div className="mp-sell-grid">
                <div className="mp-card mp-form-card">
                  <div className="mp-form">
                    <div className="mp-row2">
                      <div className="mp-field">
                        <label>Type</label>
                        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                          <option value="game">Game</option>
                          <option value="skin">Skin</option>
                        </select>
                      </div>

                      <div className="mp-field">
                        <label>Platform</label>
                        <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                          <option value="PC">PC</option>
                          <option value="Steam">Steam</option>
                          <option value="Epic">Epic</option>
                          <option value="PS">PlayStation</option>
                          <option value="Xbox">Xbox</option>
                          <option value="Mobile">Mobile</option>
                        </select>
                      </div>
                    </div>

                    <div className="mp-field">
                      <label>Title</label>
                      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    </div>

                    <div className="mp-row2">
                      <div className="mp-field">
                        <label>Price</label>
                        <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                      </div>

                      <div className="mp-field">
                        <label>Condition</label>
                        <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                          <option value="new">New</option>
                          <option value="used">Used</option>
                          <option value="gift">Giftable</option>
                          <option value="account">Account item</option>
                        </select>
                      </div>
                    </div>

                    <div className="mp-field">
                      <label>Tags</label>
                      <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
                    </div>

                    <div className="mp-field">
                      <label>Description</label>
                      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>

                    <div className="mp-actions">
                      <button className="mp-btn ghost" onClick={() => setView("inv")}>List from inventory</button>
                      <button className="mp-btn" onClick={createListing}>Publish listing</button>
                    </div>
                  </div>
                </div>

                <div className="mp-card">
                  <h4>Preview</h4>
                  <ListingCard
                    item={{
                      title: form.title || "Untitled",
                      sellerName: "You",
                      type: form.type,
                      platform: form.platform,
                      condition: form.condition,
                      tags: form.tags.split(",").map((x) => x.trim()).filter(Boolean),
                      description: form.description,
                      price: Number(form.price || 0),
                      createdAt: new Date(),
                    }}
                    mine
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "my" && (
          <div className="mp-view active">
            <div className="mp-panel">
              <div className="mp-panel-head">
                <h3>My listings</h3>
                <div className="mp-meta">Total: <b>{myListings.length}</b></div>
              </div>
            </div>

            <div className="mp-cards">
              {myListings.length === 0 ? (
                <div className="muted">No listings yet.</div>
              ) : (
                myListings.map((x) => <ListingCard key={x._id} item={x} mine />)
              )}
            </div>
          </div>
        )}

        {view === "inv" && (
          <div className="mp-view active">
            <div className="mp-panel">
              <div className="mp-panel-head">
                <h3>My inventory</h3>
                <div className="mp-meta">Items you own. You can list any item for sale.</div>
              </div>
            </div>

            <div className="mp-cards">
              {inventory.map((item) => (
                <div className="mp-card" key={item._id}>
                  <div className="mp-card-title">{item.title}</div>
                  <div className="mp-card-sub">{item.type} • {item.platform} • {item.condition}</div>
                  <div className="mp-desc">{item.note || "—"}</div>
                  <button className="mp-action buy" onClick={() => prefillFromInventory(item)}>List</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "tx" && (
          <div className="mp-view active">
            <div className="mp-panel">
              <div className="mp-panel-head">
                <h3>Transactions</h3>
                <div className="mp-meta">Your buy/sell history.</div>
              </div>
            </div>

            <div className="mp-tx">
              {transactions.length === 0 ? (
                <div className="muted">No transactions yet.</div>
              ) : (
                transactions.map((t) => (
                  <div className="mp-tx-item" key={t._id}>
                    <div className="mp-tx-top">
                      <div>
                        <div className="mp-tx-title">{t.title}</div>
                        <div className="mp-tx-meta">{t.kind} • {new Date(t.createdAt).toLocaleString()}</div>
                      </div>
                      <div className={t.amount >= 0 ? "mp-badge accent" : "mp-badge pink"}>
                        {t.amount >= 0 ? "+" : "-"}{money(Math.abs(t.amount))}
                      </div>
                    </div>
                    <div className="mp-tx-meta">{t.note}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {view === "help" && (
          <div className="mp-view active">
            <div className="mp-panel">
              <div className="mp-panel-head">
                <h3>Safety & rules</h3>
              </div>

              <div className="mp-help">
                <div className="mp-help-card">
                  <h4>✅ Safe trading checklist</h4>
                  <ul>
                    <li>Use official platform trade methods.</li>
                    <li>Never share passwords or OTP codes.</li>
                    <li>Check region locks and item condition.</li>
                  </ul>
                </div>

                <div className="mp-help-card">
                  <h4>⚠️ Common scams</h4>
                  <ul>
                    <li>Fake receipts or proof screenshots.</li>
                    <li>Phishing login links.</li>
                    <li>Urgent pressure tactics.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`mp-toast ${toast ? "show" : ""}`}>{toast}</div>
      </div>
    </section>
  );
}
