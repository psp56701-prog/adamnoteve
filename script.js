/* ============================================
   ADAMNOTEVE — Cart, Filters, Search, Variants
   ============================================
   PRODUCTS catalog is loaded from lib/products.js
   (must be included via <script src="lib/products.js"> BEFORE this file).
   ============================================ */

// ===== CART STATE =====
// Cart items: { id, qty, size, color }
// Items with the same id+size+color are merged.
const CART_KEY = 'adamnoteve_cart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function variantKey(item) {
  return `${item.id}|${item.size || ''}|${item.color || ''}`;
}

// Variant keys can contain a double-quote (sticker sizes are 3", 4", 5.5"), which
// would break an HTML attribute like data-qty="...". Escape before injecting into markup.
// Browsers decode the entities back, so getAttribute() still returns the exact key.
function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

// Pick a colorful, on-brand default variant to show in grids/cards/search instead of
// plain White. Preference: brand pink family -> other vibrants -> black -> any non-neutral.
// Falls back to p.img if the product has no per-color mockups.
function displayColor(p) {
  if (!p || !p.colors || !p.imgByColor) return null;
  const has = (c) => p.imgByColor[c];
  // Explicit per-product override (e.g. mug = blue/white; "Petty in Pink" stays pink).
  if (p.featuredColor && has(p.featuredColor)) return p.featuredColor;
  // ALL physical products default to a darker/neutral color — unisex, broad appeal,
  // NOT pink/white — varied per product (deterministic by id) so the grid isn't one
  // shade. Design-collections (cards/stickers/magnets) have design-name "colors" that
  // won't match here, so they fall through and show their first (colorful) design.
  const darkRe = /black|navy|charcoal|maroon|forest|olive|army|military|graphite|chocolate|burgundy|plum|cardinal|indigo|royal|dark|slate|stone|teal|french navy|bottle green|deep/i;
  let darks = p.colors.filter((c) => has(c) && darkRe.test(c) && !/heather/i.test(c));
  if (!darks.length) darks = p.colors.filter((c) => has(c) && darkRe.test(c));
  if (darks.length) {
    let h = 0; for (let i = 0; i < p.id.length; i++) h = (h * 31 + p.id.charCodeAt(i)) >>> 0;
    return darks[h % darks.length];
  }
  // No dark option: prefer any non-pink color before vibrant; pink is the last resort.
  const nonPink = p.colors.find((c) => has(c) && !/white|cream|natural|sand|ivory|pink|light|ash|bone|heather|grey|gray/i.test(c));
  if (nonPink) return nonPink;
  const prefs = [
    /blue|teal|aqua|cyan|turquoise/i,
    /green|kelly|mint/i,
    /purple|violet|orchid/i,
    /red|coral|orange/i,
    /yellow|gold|mustard/i,
    /pink|azalea|raspberry|berry|fuchsia|magenta|rose|mauve/i,
  ];
  for (const re of prefs) {
    const hit = p.colors.find((c) => re.test(c) && has(c));
    if (hit) return hit;
  }
  const nonNeutral = p.colors.find(
    (c) => has(c) && !/white|cream|natural|ivory|sand|ash|heather|grey|gray|bone|oatmeal/i.test(c)
  );
  return nonNeutral || p.colors.find((c) => has(c)) || null;
}

function displayImage(p) {
  const c = displayColor(p);
  return (c && p.imgByColor && p.imgByColor[c]) || (p && p.img);
}

function addToCart(productId, opts = {}) {
  const { size = null, color = null, qty = 1 } = opts;
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;
  // Guard: coming-soon products can't be added to cart.
  // Server also rejects them in create-checkout-session, but front-end short-circuit
  // is the UX boundary.
  if (!isProductLive(product)) {
    showToast(`"${product.name}" is coming soon 🕯️`);
    return;
  }
  const cart = getCart();
  const newKey = variantKey({ id: productId, size, color });
  const existing = cart.find(item => variantKey(item) === newKey);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ id: productId, qty, size, color });
  }
  saveCart(cart);
  showToast(`"${product.name}" added to cart 💔`);
  renderCartDrawer();
  if (typeof window.renderCartPage === 'function') window.renderCartPage();
}

function removeFromCart(key) {
  const cart = getCart().filter(item => variantKey(item) !== key);
  saveCart(cart);
  renderCartDrawer();
  if (typeof window.renderCartPage === 'function') window.renderCartPage();
}

function updateQty(key, delta) {
  const cart = getCart();
  const item = cart.find(i => variantKey(i) === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty < 1) {
    removeFromCart(key);
    return;
  }
  saveCart(cart);
  renderCartDrawer();
  if (typeof window.renderCartPage === 'function') window.renderCartPage();
}

function clearCart() {
  saveCart([]);
  renderCartDrawer();
  if (typeof window.renderCartPage === 'function') window.renderCartPage();
}

function getCartTotal() {
  return getCart().reduce((sum, item) => {
    const product = PRODUCTS.find(p => p.id === item.id);
    return sum + (product ? getVariantPrice(product, item.size) * item.qty : 0);
  }, 0);
}

// Free-shipping progress nudge — encourages bigger carts toward the $50 threshold.
function freeShipBanner(subtotal) {
  const FREE = 50;
  const pct = Math.min(100, Math.round((subtotal / FREE) * 100));
  if (subtotal >= FREE) {
    return `<div class="ship-progress unlocked">🎉 You unlocked FREE shipping!<div class="ship-bar"><span style="width:100%"></span></div></div>`;
  }
  const left = (FREE - subtotal).toFixed(2);
  return `<div class="ship-progress">🚚 You're <b>$${left}</b> from <b>FREE shipping</b><div class="ship-bar"><span style="width:${pct}%"></span></div></div>`;
}

// Petty Perk progress nudge — free Bitten Heart Sticker on orders over $40.
// Mirrors the server rule in create-checkout-session.js (FREE_STICKER_THRESHOLD_CENTS).
function freeStickerBanner(subtotal) {
  const THRESHOLD = 40;
  if (subtotal >= THRESHOLD) {
    return `<div style="background:var(--hot-pink);color:#fff;padding:10px 14px;border-radius:10px;font-weight:700;text-align:center;margin-bottom:14px;font-size:0.92rem;">🎁 Nice — a FREE Bitten Heart Sticker ships with this order!</div>`;
  }
  const left = (THRESHOLD - subtotal).toFixed(2);
  return `<div style="background:var(--ink);color:var(--cream);padding:10px 14px;border-radius:10px;font-weight:600;text-align:center;margin-bottom:14px;font-size:0.9rem;">🎁 You're <b style="color:var(--hot-pink)">$${left}</b> from a <b>FREE sticker</b></div>`;
}

// ===== AOV boosters: upsells + bundle kits =====
// One-click add a product with a sensible default variant (first size + colorful default color).
function quickAdd(productId) {
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return;
  const size = p.sizes ? p.sizes[0] : null;
  const color = p.colors ? ((typeof displayColor === 'function' && displayColor(p)) || p.colors[0]) : null;
  addToCart(productId, { size, color });
}

// Cheap impulse items suggested inside the cart ("Add a little extra").
const UPSELL_POOL = ['p29', 'p30', 'p6', 'p27', 'p26'];
function upsellHTML() {
  const inCart = new Set(getCart().map(i => i.id));
  const picks = UPSELL_POOL
    .map(id => PRODUCTS.find(p => p.id === id))
    .filter(p => p && isProductLive(p) && !inCart.has(p.id))
    .slice(0, 3);
  if (!picks.length) return '';
  const rows = picks.map(p => {
    const img = (typeof displayImage === 'function') ? displayImage(p) : p.img;
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid rgba(128,128,128,0.18);">
      <img src="${img}" alt="${p.name}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;" />
      <div style="flex:1;min-width:0;"><div style="font-weight:700;font-size:0.82rem;line-height:1.15;">${p.name}</div><div style="font-size:0.78rem;opacity:0.7;">$${p.price}</div></div>
      <button type="button" data-quickadd="${p.id}" style="background:var(--neon);color:var(--ink);border:none;border-radius:20px;padding:6px 13px;font-weight:800;font-size:0.78rem;cursor:pointer;white-space:nowrap;">+ Add</button>
    </div>`;
  }).join('');
  return `<div style="margin-top:16px;padding-top:10px;border-top:2px dashed rgba(128,128,128,0.3);">
    <div style="font-weight:800;font-size:0.86rem;margin-bottom:2px;">💔 Add a little extra</div>
    ${rows}
  </div>`;
}

// Curated bundle kits — one click adds the whole set (each as a normal line item).
const KITS = [
  { id: 'kit-petty', name: 'Petty Starter Pack', emoji: '🍎',
    blurb: 'Sticker + magnet + sticker. Small, cheap, devastating — slap your trauma on everything you own.',
    items: [{ id: 'p37' }, { id: 'p38' }, { id: 'p43' }] },
  { id: 'kit-survival', name: 'Breakup Survival Kit', emoji: '💔',
    blurb: 'The flagship tee, a bullet-dodging mug, and a sticker for the laptop. Everything you need to ugly-cry in style.',
    items: [{ id: 'p45', size: 'M', color: 'Sport Grey' }, { id: 'p1', size: '11oz', color: 'White' }, { id: 'p37' }] },
  { id: 'kit-villain', name: 'Villain Era Kit', emoji: '🐍',
    blurb: 'Lean all the way in. The Villain Era tee, its matching sticker, and a tote to carry your unbothered energy.',
    items: [{ id: 'p40', size: 'M', color: 'Maroon' }, { id: 'p43' }, { id: 'p5', color: 'Natural' }] },
  { id: 'kit-summer', name: 'Hot Single Summer Kit', emoji: '☀️',
    blurb: 'No exes, no closure, just sun. Summer tee, an emotional-support koozie, and a beach-ready tote.',
    items: [{ id: 'p41', size: 'M', color: 'Light Blue' }, { id: 'p27', size: 'Regular' }, { id: 'p5', color: 'Natural' }] },
  { id: 'kit-trio', name: 'The Trend Trio', emoji: '🔥',
    blurb: 'One tee for every mood — Villain Era, Hot Single Summer, and Touch Grass. The whole drop, one cart, free shipping.',
    items: [{ id: 'p40', size: 'M', color: 'Maroon' }, { id: 'p41', size: 'M', color: 'Light Blue' }, { id: 'p42', size: 'M', color: 'Forest Green' }] },
  { id: 'kit-galentine', name: 'Galentine\'s Gift Box', emoji: '🎁',
    blurb: 'For the friend who needs it: an anti-Valentine card, a bullet-dodging mug, and a sticker. Petty, packaged.',
    items: [{ id: 'p26', color: 'Congrats on the Breakup' }, { id: 'p1', size: '11oz', color: 'White' }, { id: 'p37' }] },
];
function kitPrice(kit) {
  return kit.items.reduce((s, it) => { const p = PRODUCTS.find(x => x.id === it.id); return s + (p ? getVariantPrice(p, it.size) : 0); }, 0);
}
function addKit(kitId) {
  const kit = KITS.find(k => k.id === kitId);
  if (!kit) return;
  kit.items.forEach(it => addToCart(it.id, { size: it.size || null, color: it.color || null }));
  if (typeof openCart === 'function') openCart();
}
function kitItemImg(it) {
  const p = PRODUCTS.find(x => x.id === it.id);
  if (!p) return '';
  return (it.color && p.imgByColor && p.imgByColor[it.color]) || p.img || '';
}
function kitItemName(it) {
  const p = PRODUCTS.find(x => x.id === it.id);
  return p ? p.name : '';
}
function renderKits(targetSelector) {
  const el = document.querySelector(targetSelector);
  if (!el) return;
  el.innerHTML = KITS.filter(k => k.items.every(it => { const p = PRODUCTS.find(x => x.id === it.id); return p && isProductLive(p); })).map(kit => {
    const price = kitPrice(kit);
    const freeShip = price >= 50;
    const freeSticker = price >= 40;
    const perk = freeShip
      ? '🎁 FREE shipping + free sticker'
      : (freeSticker ? '🎁 FREE sticker' : '');
    const thumbs = kit.items.map(it => `<img src="${kitItemImg(it)}" alt="${escapeAttr(kitItemName(it))}" loading="lazy" style="width:32%;aspect-ratio:1;object-fit:cover;border-radius:10px;background:#fff;" />`).join('');
    const itemList = kit.items.map(it => `<li>${kitItemName(it)}</li>`).join('');
    const perkBadge = perk ? `<span style="display:inline-block;background:var(--neon);color:var(--ink);font-weight:800;font-size:0.72rem;padding:3px 10px;border-radius:20px;margin-left:6px;">${perk}</span>` : '';
    return `<div style="background:var(--ink);color:var(--cream);border-radius:18px;padding:18px;display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:6px;">${thumbs}</div>
      <div style="font-family:'Bungee',sans-serif;color:var(--neon);font-size:1.1rem;line-height:1.15;">${kit.emoji} ${kit.name}</div>
      <div style="opacity:0.85;font-size:0.9rem;line-height:1.4;">${kit.blurb}</div>
      <ul style="margin:0;padding-left:18px;font-size:0.82rem;opacity:0.7;flex:1;">${itemList}</ul>
      <div style="font-weight:800;font-size:1.15rem;">$${price.toFixed(2)} ${perkBadge}</div>
      <button type="button" data-addkit="${kit.id}" style="background:var(--hot-pink);color:#fff;border:none;border-radius:26px;padding:13px;font-family:'Bungee',sans-serif;font-size:0.85rem;cursor:pointer;">ADD THE KIT →</button>
    </div>`;
  }).join('');
  bindAovHandlers(el);
}

// Wire quick-add + add-kit buttons (call after rendering).
function bindAovHandlers(root) {
  (root || document).querySelectorAll('[data-quickadd]').forEach(b => b.addEventListener('click', () => quickAdd(b.getAttribute('data-quickadd'))));
  (root || document).querySelectorAll('[data-addkit]').forEach(b => b.addEventListener('click', () => addKit(b.getAttribute('data-addkit'))));
}

function getCartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function updateCartCount() {
  const els = document.querySelectorAll('.cart-count');
  const count = getCartCount();
  els.forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'inline-block' : 'none';
  });
}

// ===== TOAST =====
let toastTimer;
function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

// ===== PRODUCT CARD HTML =====
function productCardHTML(p) {
  const live = isProductLive(p);
  // Coming-soon badge replaces any existing NEW/BESTSELLER/LIMITED tag.
  const tagHTML = !live
    ? `<span class="product-tag coming-soon-tag">COMING SOON</span>`
    : (p.tag ? `<span class="product-tag">${p.tag}</span>` : '');
  const ctaHTML = live
    ? `<button type="button" class="card-quickadd" data-quickadd="${p.id}">+ BAG</button>
       <a href="product.html?id=${p.id}" class="add-btn">VIEW →</a>`
    : `<a href="product.html?id=${p.id}" class="add-btn add-btn-soon">PREVIEW</a>`;
  return `
    <div class="product-card${live ? '' : ' coming-soon'}" data-id="${p.id}">
      <a href="product.html?id=${p.id}" class="product-img-wrap">
        ${tagHTML}
        <img src="${displayImage(p)}" alt="${p.name}" loading="lazy" />
      </a>
      <div class="product-info">
        <a href="product.html?id=${p.id}"><h3 class="product-name">${p.name}</h3></a>
        <p class="product-desc">${p.desc}</p>
        <div class="product-bottom">
          <span class="product-price">${p.priceBySize ? 'From $' + p.price : '$' + p.price}</span>
          ${ctaHTML}
        </div>
      </div>
    </div>
  `;
}

function renderProducts(targetSelector, list) {
  const target = document.querySelector(targetSelector);
  if (!target) return;
  if (list.length === 0) {
    target.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
        <div style="font-size: 4rem; margin-bottom: 16px;">🔍</div>
        <h3 style="font-family: 'Bungee', sans-serif; margin-bottom: 10px;">No matches found</h3>
        <p style="opacity: 0.7;">Even our products are ghosting you. Try a different search.</p>
      </div>
    `;
    return;
  }
  target.innerHTML = list.map(productCardHTML).join('');
  bindAovHandlers(target);
}

// ===== CART DRAWER =====
function variantLabel(item) {
  const parts = [];
  if (item.size) parts.push(item.size);
  if (item.color) parts.push(item.color);
  return parts.length ? `<div class="cart-item-variant">${parts.join(' · ')}</div>` : '';
}

function renderCartDrawer() {
  const drawer = document.querySelector('.cart-drawer');
  if (!drawer) return;
  const cart = getCart();
  const itemsEl = drawer.querySelector('.cart-items');
  const footer = drawer.querySelector('.cart-footer');

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <div class="emoji">🥀</div>
        <h3>Your cart is empty</h3>
        <p>Just like their promises.</p>
        <a href="shop.html" class="btn btn-primary">START SHOPPING</a>
      </div>
    `;
    if (footer) footer.style.display = 'none';
    return;
  }

  if (footer) footer.style.display = 'block';
  itemsEl.innerHTML = freeStickerBanner(getCartTotal()) + freeShipBanner(getCartTotal()) + cart.map(item => {
    const p = PRODUCTS.find(prod => prod.id === item.id);
    if (!p) return '';
    const key = variantKey(item);
    return `
      <div class="cart-item">
        <img src="${p.img}" alt="${p.name}" />
        <div>
          <div class="cart-item-name">${p.name}</div>
          ${variantLabel(item)}
          <div class="cart-item-price">$${(getVariantPrice(p, item.size) * item.qty).toFixed(2)}</div>
          <div class="qty-controls">
            <button class="qty-btn" data-qty="${escapeAttr(key)}" data-delta="-1">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" data-qty="${escapeAttr(key)}" data-delta="1">+</button>
          </div>
        </div>
        <button class="remove-btn" data-remove="${escapeAttr(key)}" title="Remove">✕</button>
      </div>
    `;
  }).join('') + upsellHTML();

  const totalEl = drawer.querySelector('.total-amt');
  if (totalEl) totalEl.textContent = '$' + getCartTotal().toFixed(2);

  itemsEl.querySelectorAll('[data-qty]').forEach(b =>
    b.addEventListener('click', () =>
      updateQty(b.getAttribute('data-qty'), parseInt(b.getAttribute('data-delta'), 10))
    )
  );
  itemsEl.querySelectorAll('[data-remove]').forEach(b =>
    b.addEventListener('click', () => removeFromCart(b.getAttribute('data-remove')))
  );
  bindAovHandlers(itemsEl);
}

function openCart() {
  document.querySelector('.cart-drawer')?.classList.add('open');
  document.querySelector('.cart-overlay')?.classList.add('open');
  renderCartDrawer();
}
function closeCart() {
  document.querySelector('.cart-drawer')?.classList.remove('open');
  document.querySelector('.cart-overlay')?.classList.remove('open');
}

// ===== SEARCH =====
function searchProducts(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.desc.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  );
}

function openSearch() {
  const overlay = document.querySelector('.search-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  setTimeout(() => overlay.querySelector('input')?.focus(), 100);
}
function closeSearch() {
  document.querySelector('.search-overlay')?.classList.remove('open');
  const input = document.querySelector('.search-overlay input');
  if (input) input.value = '';
  const results = document.querySelector('.search-results');
  if (results) results.innerHTML = '';
}

function injectSearchOverlay() {
  if (document.querySelector('.search-overlay')) return;
  const html = `
    <div class="search-overlay">
      <div class="search-modal">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="search the heartbreak..." class="search-input" />
          <button class="search-close" aria-label="Close">✕</button>
        </div>
        <div class="search-results"></div>
        <div class="search-hint">try: "hoodie", "candle", "petty", "single"</div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  const input = document.querySelector('.search-input');
  const results = document.querySelector('.search-results');

  input.addEventListener('input', () => {
    const matches = searchProducts(input.value);
    if (input.value.trim() === '') {
      results.innerHTML = '';
      return;
    }
    if (matches.length === 0) {
      results.innerHTML = `
        <div class="search-empty">
          <div style="font-size: 3rem;">🥀</div>
          <p>No matches. Even our products are ghosting you.</p>
        </div>
      `;
      return;
    }
    results.innerHTML = matches.slice(0, 8).map(p => `
      <a href="product.html?id=${p.id}" class="search-result">
        <img src="${displayImage(p)}" alt="${p.name}" />
        <div>
          <div class="search-result-name">${p.name}</div>
          <div class="search-result-price">${p.priceBySize ? 'From $' + p.price : '$' + p.price}</div>
        </div>
      </a>
    `).join('');
  });

  document.querySelector('.search-close')?.addEventListener('click', closeSearch);
  document.querySelector('.search-overlay')?.addEventListener('click', e => {
    if (e.target.classList.contains('search-overlay')) closeSearch();
  });
}

// ===== SCROLL REVEAL =====
function initScrollReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const els = document.querySelectorAll('.section, .story-strip, .newsletter, .cat-row');
  els.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('reveal-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

// ===== INIT GLOBAL =====
document.addEventListener('DOMContentLoaded', () => {
  injectSearchOverlay();
  updateCartCount();
  renderCartDrawer();
  initScrollReveal();

  document.querySelectorAll('[data-open-cart]').forEach(b =>
    b.addEventListener('click', e => { e.preventDefault(); openCart(); })
  );
  document.querySelectorAll('[data-open-search]').forEach(b =>
    b.addEventListener('click', e => { e.preventDefault(); openSearch(); })
  );
  document.querySelector('.cart-close')?.addEventListener('click', closeCart);
  document.querySelector('.cart-overlay')?.addEventListener('click', closeCart);

  // Mobile menu
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav-links');
  toggle?.addEventListener('click', () => nav?.classList.toggle('open'));

  // Newsletter
  document.querySelector('.news-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const success = document.querySelector('.news-success');
    if (input.value.trim()) {
      input.value = '';
      success?.classList.add('show');
      setTimeout(() => success?.classList.remove('show'), 4000);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeCart();
      closeSearch();
    }
    // Cmd/Ctrl + K to open search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });
});
