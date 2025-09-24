/* script.js
   Final site client-side engine for Alhamwi store:
   - Products data (editable below)
   - Renders product grid, product page, cart, reviews
   - Uses localStorage for persistent cart & reviews
   - Integrates PayPal Smart Buttons (replace YOUR_PAYPAL_CLIENT_ID)
*/

/* =========================
   0. CONFIG
   ========================= */
const CONFIG = {
  PAYPAL_CLIENT_ID: "YOUR_PAYPAL_CLIENT_ID", // <-- replace with your PayPal Client ID
  CURRENCY: "USD",
  TAX_RATE: 0.07, // 7% tax example
  SHIPPING_FLAT: 5.00 // flat shipping
};

/* =========================
   1. SAMPLE PRODUCTS (edit to match your real items)
   Each product should have: id, title, category, price, short, long, image
   ========================= */
const PRODUCTS = [
  {
    id: "ls1",
    title: "Alhamwi Long Sleeve Pro",
    category: "Long Sleeve",
    price: 50.00,
    short: "Breathable long sleeve jersey.",
    long: "High-quality, moisture-wicking long sleeve jersey with stitched seams and custom name option.",
    image: "https://via.placeholder.com/600x700?text=Long+Sleeve+1"
  },
  {
    id: "ss1",
    title: "Alhamwi Short Sleeve Pro",
    category: "Short Sleeve",
    price: 40.00,
    short: "Lightweight game-day tee.",
    long: "Comfort fit, lightweight fabric ideal for both training and matches. Custom numbering available.",
    image: "https://via.placeholder.com/600x700?text=Short+Sleeve+1"
  },
  {
    id: "hd1",
    title: "Alhamwi Signature Hoodie",
    category: "Hoodies",
    price: 70.00,
    short: "Warm, cozy hoodie with logo print.",
    long: "Premium fleece hoodie with embroidered Alhamwi logo and reinforced pocket seams.",
    image: "https://via.placeholder.com/600x700?text=Hoodie+1"
  }
];

/* =========================
   2. localStorage keys & helpers
   ========================= */
const LS_KEYS = {
  CART: "alhamwi_cart_v1",
  REVIEWS: "alhamwi_reviews_v1"
};

function saveCart(cart) {
  localStorage.setItem(LS_KEYS.CART, JSON.stringify(cart));
}
function loadCart() {
  try {
    const raw = localStorage.getItem(LS_KEYS.CART);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

function saveReviews(obj) {
  localStorage.setItem(LS_KEYS.REVIEWS, JSON.stringify(obj));
}
function loadReviews() {
  try {
    const raw = localStorage.getItem(LS_KEYS.REVIEWS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) { return {}; }
}

/* =========================
   3. CART API
   ========================= */
function cartAdd(productId, qty = 1) {
  const cart = loadCart();
  const entry = cart.find(i => i.id === productId);
  if (entry) {
    entry.qty = Number(entry.qty) + Number(qty);
  } else {
    cart.push({ id: productId, qty: Number(qty) });
  }
  saveCart(cart);
  renderCartCount();
  return cart;
}

function cartSetQty(productId, qty) {
  let cart = loadCart();
  cart = cart.map(i => i.id === productId ? ({id: i.id, qty: Number(qty)}) : i).filter(i => i.qty > 0);
  saveCart(cart);
  renderCartCount();
  return cart;
}

function cartRemove(productId) {
  let cart = loadCart();
  cart = cart.filter(i => i.id !== productId);
  saveCart(cart);
  renderCartCount();
  return cart;
}

function cartClear() {
  saveCart([]);
  renderCartCount();
}

function cartItemsDetailed() {
  const cart = loadCart();
  return cart.map(ci => {
    const p = PRODUCTS.find(x => x.id === ci.id);
    return {
      ...p,
      qty: ci.qty,
      lineTotal: +(p.price * ci.qty)
    };
  });
}

function cartSubtotal() {
  const items = cartItemsDetailed();
  const sum = items.reduce((s, it) => s + it.lineTotal, 0);
  return round2(sum);
}
function cartTax() {
  return round2(cartSubtotal() * CONFIG.TAX_RATE);
}
function cartShipping() {
  const sub = cartSubtotal();
  return sub > 0 ? CONFIG.SHIPPING_FLAT : 0;
}
function cartTotal() {
  return round2(cartSubtotal() + cartTax() + cartShipping());
}
function round2(x) { return Math.round((x + Number.EPSILON) * 100) / 100; }

/* =========================
   4. RENDER HELPERS (connect these in your HTML)
   Expected HTML hooks:
   - container with id="product-grid" (home/shop)
   - product detail page ids: id="product-image", id="product-title", id="product-price", id="product-desc", id="add-to-cart"
   - cart page container id="cart-contents", id="cart-summary"
   - cart count span id="cart-count"
   - search input id="search-input", category buttons with data-cat, sort select id="sort-select"
   - reviews area id="reviews-list", review form id="review-form"
   ========================= */

function renderProductGrid(targetId = "product-grid", products = PRODUCTS) {
  const container = document.getElementById(targetId);
  if (!container) return;
  container.innerHTML = "";
  products.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <a class="product-link" href="product.html?id=${encodeURIComponent(p.id)}">
        <div class="product-thumb"><img src="${p.image}" alt="${escapeHtml(p.title)}"></div>
        <div class="product-info">
          <h3>${escapeHtml(p.title)}</h3>
          <p class="short">${escapeHtml(p.short)}</p>
          <p class="price">$${p.price.toFixed(2)}</p>
        </div>
      </a>
      <div class="product-actions">
        <button class="addnow" data-id="${p.id}">Add to cart</button>
      </div>
    `;
    container.appendChild(card);
  });

  // attach add-to-cart handlers
  Array.from(container.querySelectorAll(".addnow")).forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      cartAdd(id, 1);
      toast("Added to cart");
    });
  });
}

function renderProductDetail(productId) {
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) {
    console.warn("Product not found", productId);
    return;
  }
  const img = document.getElementById("product-image");
  const title = document.getElementById("product-title");
  const price = document.getElementById("product-price");
  const desc = document.getElementById("product-desc");
  const qtyIn = document.getElementById("product-qty");
  const addBtn = document.getElementById("add-to-cart");
  if (img) img.src = p.image;
  if (title) title.textContent = p.title;
  if (price) price.textContent = `$${p.price.toFixed(2)}`;
  if (desc) desc.textContent = p.long;
  if (qtyIn) qtyIn.value = 1;
  if (addBtn) {
    addBtn.onclick = () => {
      const q = Number(qtyIn ? qtyIn.value : 1);
      cartAdd(productId, q);
      toast("Added to cart");
    };
  }
  renderReviews(productId);
}

function renderCartPage() {
  const container = document.getElementById("cart-contents");
  const summary = document.getElementById("cart-summary");
  if (!container || !summary) return;
  const items = cartItemsDetailed();

  if (items.length === 0) {
    container.innerHTML = `<p>Your cart is empty. <a href="index.html">Continue shopping</a></p>`;
    summary.innerHTML = "";
    return;
  }

  container.innerHTML = "";
  items.forEach(it => {
    const row = document.createElement("div");
    row.className = "cart-row";
    row.innerHTML = `
      <div class="cart-thumb"><img src="${it.image}" alt="${escapeHtml(it.title)}"></div>
      <div class="cart-meta">
        <h4>${escapeHtml(it.title)}</h4>
        <p>$${it.price.toFixed(2)} each</p>
        <div class="cart-controls">
          <label>Qty: <input type="number" class="cart-qty" data-id="${it.id}" min="1" value="${it.qty}"></label>
          <button class="remove-btn" data-id="${it.id}">Remove</button>
        </div>
      </div>
      <div class="cart-line">$${it.lineTotal.toFixed(2)}</div>
    `;
    container.appendChild(row);
  });

  // attach qty/change/remove handlers
  Array.from(container.querySelectorAll(".cart-qty")).forEach(el => {
    el.addEventListener("change", (e) => {
      const id = e.target.dataset.id;
      const q = Number(e.target.value) || 1;
      cartSetQty(id, q);
      renderCartPage();
    });
  });
  Array.from(container.querySelectorAll(".remove-btn")).forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      cartRemove(id);
      renderCartPage();
    });
  });

  // summary
  summary.innerHTML = `
    <p>Subtotal: $${cartSubtotal().toFixed(2)}</p>
    <p>Tax (${(CONFIG.TAX_RATE*100).toFixed(0)}%): $${cartTax().toFixed(2)}</p>
    <p>Shipping: $${cartShipping().toFixed(2)}</p>
    <h3>Total: $${cartTotal().toFixed(2)}</h3>
    <div id="paypal-button-container"></div>
    <p><button id="clear-cart">Clear Cart</button></p>
  `;

  document.getElementById("clear-cart").addEventListener("click", () => {
    if (confirm("Clear cart?")) { cartClear(); renderCartPage(); }
  });

  // render PayPal button
  renderPayPalButtons();
}

function renderCartCount() {
  const el = document.getElementById("cart-count");
  if (!el) return;
  const total = loadCart().reduce((s, it) => s + Number(it.qty), 0);
  el.textContent = total;
}

/* =========================
   5. REVIEWS (simple localStorage)
   ========================= */
function getReviewsForProduct(productId) {
  const all = loadReviews();
  return all[productId] || [];
}
function addReview(productId, name, rating, comment) {
  const all = loadReviews();
  if (!all[productId]) all[productId] = [];
  all[productId].push({
    name: String(name).slice(0,64),
    rating: Number(rating),
    comment: String(comment).slice(0,1500),
    date: new Date().toISOString()
  });
  saveReviews(all);
  toast("Review saved");
}

function renderReviews(productId) {
  const listEl = document.getElementById("reviews-list");
  if (!listEl) return;
  const reviews = getReviewsForProduct(productId);
  if (reviews.length === 0) {
    listEl.innerHTML = "<p>No reviews yet. Be the first!</p>";
    return;
  }
  listEl.innerHTML = reviews.map(rv => {
    return `<div class="review">
      <div class="r-head"><strong>${escapeHtml(rv.name)}</strong> • <span class="rating">${"★".repeat(rv.rating)}${"☆".repeat(5-rv.rating)}</span></div>
      <div class="r-body">${escapeHtml(rv.comment)}</div>
      <div class="r-date">${new Date(rv.date).toLocaleString()}</div>
    </div>`;
  }).join("\n");
}

/* =========================
   6. PAYPAL Integration (Smart Buttons)
   - This uses the client-side SDK to create an order from local cart items.
   - Replace CONFIG.PAYPAL_CLIENT_ID with your PayPal client ID.
   ========================= */
function renderPayPalButtons() {
  const container = document.getElementById("paypal-button-container");
  if (!container) return;

  // avoid double-loading multiple times
  if (container.dataset.rendered === "1") return;
  container.dataset.rendered = "1";

  // load SDK script dynamically if not present
  if (!window.paypal) {
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(CONFIG.PAYPAL_CLIENT_ID)}&currency=${CONFIG.CURRENCY}`;
    s.onload = () => { createPayPalButtons(container); };
    s.onerror = () => { container.innerHTML = "<p>PayPal failed to load. Check client ID.</p>"; };
    document.head.appendChild(s);
  } else {
    createPayPalButtons(container);
  }
}

function createPayPalButtons(container) {
  if (!window.paypal) {
    container.innerHTML = "<p>PayPal SDK not available.</p>";
    return;
  }
  const items = cartItemsDetailed().map(i => ({
    name: i.title,
    unit_amount: { currency_code: CONFIG.CURRENCY, value: i.price.toFixed(2) },
    quantity: i.qty.toString()
  }));

  const purchase = [{
    amount: {
      currency_code: CONFIG.CURRENCY,
      value: cartTotal().toFixed(2),
      breakdown: {
        item_total: { currency_code: CONFIG.CURRENCY, value: cartSubtotal().toFixed(2) },
        shipping: { currency_code: CONFIG.CURRENCY, value: cartShipping().toFixed(2) },
        tax_total: { currency_code: CONFIG.CURRENCY, value: cartTax().toFixed(2) }
      }
    },
    items
  }];

  paypal.Buttons({
    createOrder: function(data, actions) {
      return actions.order.create({
        purchase_units: purchase
      });
    },
    onApprove: function(data, actions) {
      return actions.order.capture().then(function(details) {
        cartClear();
        renderCartPage();
        alert("Transaction completed by " + (details.payer.name?.given_name || "buyer") + ".\nYou will receive the funds in your PayPal account.");
      });
    },
    onError: function(err) {
      console.error(err);
      alert("PayPal error. See console.");
    }
  }).render(container);
}

/* =========================
   7. UTIL & INIT: search, filters, page routing
   ========================= */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function toast(msg, ms = 1300) {
  let t = document.getElementById("al-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "al-toast";
    t.style = "position:fixed;right:20px;bottom:20px;background:#00ffff;padding:10px 14px;border-radius:8px;color:#000;font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.4)";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = 1;
  setTimeout(()=>{ t.style.transition="opacity 400ms"; t.style.opacity = 0; }, ms);
}

/* page helpers */
function queryParam(name) {
  const u = new URL(location.href);
  return u.searchParams.get(name);
}

function initSite() {
  // render grid if container exists
  const grid = document.getElementById("product-grid");
  if (grid) {
    renderProductGrid("product-grid", PRODUCTS);
  }

  // if product detail page
  const pid = queryParam("id");
  if (document.getElementById("product-title") && pid) {
    renderProductDetail(pid);
    // attach review submit if form exists
    const revForm = document.getElementById("review-form");
    if (revForm) {
      revForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = revForm.querySelector("[name='name']").value || "Anonymous";
        const rating = revForm.querySelector("[name='rating']").value || 5;
        const comment = revForm.querySelector("[name='comment']").value || "";
        addReview(pid, name, rating, comment);
        revForm.reset();
        renderReviews(pid);
      });
    }
  }

  // render cart page
  if (document.getElementById("cart-contents")) {
    renderCartPage();
  }

  // cart count
  renderCartCount();

  // simple search if input present
  const sInput = document.getElementById("search-input");
  if (sInput) {
    sInput.addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      const filtered = PRODUCTS.filter(p => (p.title + " " + p.short + " " + p.long).toLowerCase().includes(q));
      renderProductGrid("product-grid", filtered);
    });
  }

  // category buttons (data-cat attributes)
  Array.from(document.querySelectorAll("[data-cat]")).forEach(btn => {
    btn.addEventListener("click", (e) => {
      const cat = e.currentTarget.dataset.cat;
      if (cat === "all") renderProductGrid("product-grid", PRODUCTS);
      else renderProductGrid("product-grid", PRODUCTS.filter(p => p.category === cat));
    });
  });

  // attach Add to Cart buttons on product lists (if present)
  document.addEventListener("click", (e) => {
    if (e.target && e.target.matches && e.target.matches(".add-cart-inline")) {
      const id = e.target.dataset.id;
      cartAdd(id, 1);
      toast("Added to cart");
    }
  });

  // show cart count periodically (in case other scripts change it)
  setInterval(renderCartCount, 1500);
}

/* auto-init on DOM loaded */
document.addEventListener("DOMContentLoaded", initSite);
