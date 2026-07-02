# Dark Eden ("Midnight Plum") Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-theme adamnoteve.com from cream/bubblegum to the dark "Midnight Plum" palette derived from the new apple+snake logo, and add quick-add, sticky add-to-cart, shipping progress bar, snake dividers, and scroll reveals.

**Architecture:** CSS-first: the site is a static HTML/CSS/JS store where almost all colors flow through `:root` CSS variables in `styles.css`, so the retheme is mostly token remapping plus targeted rule rewrites. HTML edits are surgical (hero block, marquee position on index only). JS edits are small and additive in `script.js` and page inline scripts, always calling existing cart functions.

**Tech Stack:** Static HTML + single `styles.css` + vanilla JS (`script.js`, page inline scripts). No build step. Verification via headless Chrome screenshots and a one-off Playwright script.

**Spec:** `docs/superpowers/specs/2026-07-02-dark-eden-restyle-design.md`

## Global Constraints

- Work on the `dark-eden` branch (already created). Commit after every task.
- NEVER modify: `lib/products.js`, `lib/printful-mapping.js`, `designs/`, `netlify/`, `mockups/`, `.verify-tmp/`, product data, checkout/cart logic semantics.
- Fonts stay: Bungee (display) + Space Grotesk (body).
- New quick-add/sticky-ATC must call EXISTING functions (`quickAdd`, `addToCart`, `bindAovHandlers`) — no new cart code paths.
- Core palette (exact values): `--bg: #140820`, `--surface: #241035`, `--border: #3a1c55`, `--pink: #F70268`, `--hot-pink: #ff3d8f` (brighter pink for small/bold text so it passes AA on dark), `--neon: #BAC71B` (chartreuse), `--cream: #FFF5EC`, `--ink: #0a0512`, `--deep-purple: #1d0c30`, `--plum: #58105C`.
- All motion added must respect `prefers-reduced-motion: reduce`.
- Screenshot verification command (run from repo root, used in every task):
  ```bash
  CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --screenshot=/private/tmp/claude-501/-Users-romellospellman/831b148e-87d0-4a73-8095-bf661dbe6e43/scratchpad/check.png \
    --window-size=1440,2400 "file://$PWD/index.html"
  ```
  Then view the PNG. For mobile, use `--window-size=390,1600`.

---

### Task 1: Dark token system + base surfaces

**Files:**
- Modify: `styles.css:8-22` (the `:root` block), `styles.css` `body` rule (~line 27), `html` if needed
- Modify: all 11 `*.html` files (`<meta name="theme-color">`)

**Interfaces:**
- Produces: CSS custom properties `--bg`, `--surface`, `--border`, `--plum`, `--glow-pink`, and remapped legacy tokens (`--pink`, `--hot-pink`, `--neon`, `--neon-cyan`, `--ink`, `--text`, `--cream`, `--deep-purple`, `--shadow`, `--shadow-sm`). Every later task uses these names.

- [ ] **Step 1: Replace the `:root` block in `styles.css`**

Replace the existing `:root { ... }` (lines 8–22) with:

```css
:root {
  /* Dark Eden — Midnight Plum (from the apple+snake logo) */
  --bg: #140820;            /* page base */
  --surface: #241035;       /* cards, raised panels */
  --border: #3a1c55;        /* card/panel borders */
  --plum: #58105C;          /* logo plum, decorative */
  --pink: #F70268;          /* primary accent: fills, CTAs, glows */
  --hot-pink: #ff3d8f;      /* brighter pink for small/bold text + hovers (AA on dark) */
  --purple: #7a2bff;
  --deep-purple: #1d0c30;   /* navbar, alt section bands */
  --neon: #BAC71B;          /* chartreuse serpent accent — use sparingly */
  --neon-cyan: #BAC71B;     /* legacy alias -> chartreuse */
  --red: #ff5a5a;
  --cream: #FFF5EC;         /* primary text on dark */
  --ink: #0a0512;           /* deepest tone (was the light theme's text color) */
  --text: #FFF5EC;
  --glow-pink: 0 0 16px rgba(247, 2, 104, 0.45);
  --shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  --shadow-sm: 0 4px 14px rgba(0, 0, 0, 0.45);
}
```

- [ ] **Step 2: Point the body at the dark base**

In the `body` rule (just below `:root`), change `background: var(--cream);` to `background: var(--bg);` and `color: var(--text);` stays (now resolves to cream).

- [ ] **Step 3: Update theme-color meta in every page**

```bash
cd ~/Desktop/adamnoteve-site && sed -i '' 's/<meta name="theme-color" content="#ff007a"/<meta name="theme-color" content="#140820"/' *.html && grep -c 'theme-color" content="#140820"' *.html
```
Expected: each file that had the meta reports 1.

- [ ] **Step 4: Screenshot check**

Run the screenshot command from Global Constraints on `index.html`. Expected: page background is dark plum; many components look half-broken (light navbar, old hero gradient) — that is fine; later tasks fix each component. Nothing should be unreadable-black-on-black.

- [ ] **Step 5: Commit**

```bash
git add styles.css *.html && git commit -m "theme: dark Eden token system + dark base surfaces"
```

---

### Task 2: Navbar + marquee

**Files:**
- Modify: `styles.css:49-183` (marquee + navbar rules)

**Interfaces:**
- Consumes: tokens from Task 1.

- [ ] **Step 1: Restyle the marquee (styles.css:50-69)**

Replace the `.marquee` rule body with:

```css
.marquee {
  background: var(--neon);
  color: var(--bg);
  padding: 10px 0;
  overflow: hidden;
  white-space: nowrap;
  font-family: 'Bungee', sans-serif;
  font-size: 0.8rem;
  letter-spacing: 2px;
  border-bottom: none;
}
```

and change `.marquee-track span:nth-child(odd) { color: var(--hot-pink); }` to `.marquee-track span:nth-child(odd) { color: var(--plum); }`.

- [ ] **Step 2: Restyle the navbar (styles.css:77-183)**

Apply these exact changes:
- `.navbar`: `background: var(--cream);` → `background: var(--deep-purple);` and `border-bottom: 3px solid var(--ink);` → `border-bottom: 2px solid var(--pink);`
- `.logo`: `color: var(--ink);` → `color: var(--cream);`
- `.cart-btn`: replace body with:
  ```css
  .cart-btn {
    background: var(--pink);
    color: var(--cream);
    padding: 10px 18px;
    border-radius: 30px;
    font-weight: 700;
    font-family: 'Bungee', sans-serif;
    font-size: 0.9rem;
    transition: all 0.2s;
    border: 2px solid var(--pink);
  }
  .cart-btn:hover {
    box-shadow: var(--glow-pink);
    transform: translateY(-2px);
  }
  ```
  (delete the old `background`/`border-color` lines inside `.cart-btn:hover`)
- `.cart-count`: keep (`--neon` chartreuse on `--ink` still reads).
- `.menu-toggle`: `color: var(--ink);` → `color: var(--cream);`

- [ ] **Step 3: Screenshot check**

Screenshot `index.html` (1440px). Expected: chartreuse marquee at top, dark plum navbar with cream logo text, pink BAG pill.

- [ ] **Step 4: Commit**

```bash
git add styles.css && git commit -m "theme: dark navbar + chartreuse marquee"
```

---

### Task 3: Hero rebuild (centered statement) + buttons

**Files:**
- Modify: `index.html:53-100` (marquee position + hero markup)
- Modify: `styles.css:185-317` (hero, buttons, floating/blob rules)

**Interfaces:**
- Produces: `.hero-mark` class, `.btn-primary`/`.btn-secondary` dark styles used by every page.

- [ ] **Step 1: Restructure index.html hero**

Replace the hero section (`index.html:84-100`) with:

```html
<!-- Hero -->
<section class="hero">
  <div class="hero-content">
    <img src="logo-apple.png" alt="" class="hero-mark" />
    <h1>love is <span class="crossed">eternal</span><br/>temporary.</h1>
    <p>Merch for the heartbroken, the healing, and the gloriously single. Wear your ex like a souvenir from a trip you'd rather forget.</p>
    <div class="hero-cta">
      <a href="shop.html" class="btn btn-primary">SHOP THE BREAKUP</a>
      <a href="about.html" class="btn btn-secondary">OUR SOB STORY</a>
    </div>
  </div>
</section>
```

(The `hero-blobs`, `blob`, and both `floating-text` divs are deleted.)

- [ ] **Step 2: Move the marquee below the hero (index.html only)**

Cut the entire `<!-- Marquee -->` block (`index.html:53-67`) and paste it directly AFTER the hero's closing `</section>`. Order becomes: navbar → hero → marquee → featured section. Other pages keep the marquee at the top.

- [ ] **Step 3: Rewrite hero + button CSS**

Replace `styles.css` rules `.hero` (186), `.hero-content` (201), `.hero h1` (207), `.hero p` (231) with:

```css
.hero {
  background:
    radial-gradient(ellipse 70% 55% at 50% 0%, rgba(247, 2, 104, 0.28), transparent 70%),
    var(--bg);
  min-height: 66vh;
  position: relative;
  overflow: hidden;
  padding: 56px 5% 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.hero-content {
  max-width: 820px;
  margin: 0 auto;
  position: relative;
  z-index: 2;
}

.hero-mark {
  width: clamp(90px, 12vw, 130px);
  height: auto;
  margin: 0 auto 18px;
  filter: drop-shadow(0 0 24px rgba(247, 2, 104, 0.55));
}

.hero h1 {
  font-size: clamp(2.6rem, 7.5vw, 5.5rem);
  color: var(--cream);
  text-shadow: 0 0 30px rgba(247, 2, 104, 0.35);
  margin-bottom: 20px;
}

.hero p {
  font-size: 1.35rem;
  color: var(--cream);
  opacity: 0.88;
  margin: 0 auto 30px;
  font-weight: 500;
  max-width: 550px;
}
```

In `.hero h1 .crossed::after` keep everything, it already uses `var(--neon)`.

Change `.hero-cta` to add `justify-content: center;`.

Delete these rules entirely: `.floating-text`, `.floating-text.t1`, `.floating-text.t2`, `.hero-blobs`, `.blob`, `.blob.b1`, `.blob.b2`, `@keyframes float` (styles.css:285-317).

Replace `.btn` / `.btn-primary` / `.btn-secondary` (styles.css:245-283) with:

```css
.btn {
  display: inline-block;
  padding: 16px 36px;
  font-family: 'Bungee', sans-serif;
  font-size: 1rem;
  letter-spacing: 1px;
  border: none;
  border-radius: 50px;
  transition: all 0.15s;
  text-align: center;
  cursor: pointer;
}

.btn-primary {
  background: var(--pink);
  color: var(--cream);
  box-shadow: 0 0 18px rgba(247, 2, 104, 0.45);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 30px rgba(247, 2, 104, 0.7);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 0 10px rgba(247, 2, 104, 0.5);
}

.btn-secondary {
  background: transparent;
  color: var(--neon);
  border: 2px solid var(--neon);
}

.btn-secondary:hover {
  transform: translateY(-2px);
  background: rgba(186, 199, 27, 0.12);
  box-shadow: 0 0 18px rgba(186, 199, 27, 0.35);
}
```

- [ ] **Step 4: Screenshot check (desktop + mobile)**

Screenshot `index.html` at 1440×2400 and 390×1600. Expected: centered glowing logo mark above "LOVE IS ETERNAL TEMPORARY.", pink glowing primary CTA, chartreuse outline secondary, marquee strip under the hero, bestsellers heading visible within the first ~1.5 screens at 1440px.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css && git commit -m "feat: centered-statement dark hero with logo mark + glow buttons"
```

---

### Task 4: Product cards (glow treatment) + quick-add

**Files:**
- Modify: `styles.css:342-453` (grid/card rules)
- Modify: `script.js:294-335` (`productCardHTML`, `renderProducts`)

**Interfaces:**
- Consumes: `quickAdd(productId)` (script.js:164), `bindAovHandlers(root)` (script.js:260) — both already exist.
- Produces: `.card-quickadd` button class; `renderProducts` now binds quick-add handlers after rendering.

- [ ] **Step 1: Restyle cards in styles.css**

Replace `.product-card` (351), `.product-card:hover` (362), `.product-card:nth-child(even):hover` (367) with:

```css
.product-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.product-card:hover {
  transform: translateY(-4px);
  border-color: var(--pink);
  box-shadow: var(--glow-pink);
}
```

(The `nth-child(even)` rotate rule is deleted — hover is uniform now.)

Update `.product-tag` (386): set `background: var(--neon); color: var(--bg);` (keep position/size properties as they are).

Update `.product-price` (425): set `color: var(--hot-pink);`.

Replace `.add-btn` (431) and `.add-btn:hover` (443) with:

```css
.add-btn {
  background: transparent;
  border: 2px solid var(--pink);
  color: var(--hot-pink);
  border-radius: 30px;
  padding: 8px 16px;
  font-weight: 800;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.add-btn:hover {
  background: var(--pink);
  color: var(--cream);
  box-shadow: var(--glow-pink);
}
```

Add after `.add-btn.added` (449):

```css
.card-quickadd {
  background: var(--pink);
  color: var(--cream);
  border: none;
  border-radius: 30px;
  padding: 9px 14px;
  font-weight: 800;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.card-quickadd:hover {
  box-shadow: var(--glow-pink);
  transform: translateY(-1px);
}
```

- [ ] **Step 2: Add quick-add to the card template in script.js**

In `productCardHTML` (script.js:294), replace the `ctaHTML` assignment (lines 300-302) with:

```js
  const ctaHTML = live
    ? `<button type="button" class="card-quickadd" data-quickadd="${p.id}">+ BAG</button>
       <a href="product.html?id=${p.id}" class="add-btn">VIEW →</a>`
    : `<a href="product.html?id=${p.id}" class="add-btn add-btn-soon">PREVIEW</a>`;
```

In `renderProducts` (script.js:321), add `bindAovHandlers(target);` as the last line of the function (after `target.innerHTML = list.map(productCardHTML).join('');`).

- [ ] **Step 3: Verify quick-add works (behavioral)**

```bash
cd ~/Desktop/adamnoteve-site && python3 -m http.server 8788 &> /dev/null & sleep 1
cat > /private/tmp/claude-501/-Users-romellospellman/831b148e-87d0-4a73-8095-bf661dbe6e43/scratchpad/qa-test.mjs <<'EOF'
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('http://localhost:8788/shop.html'); await p.waitForSelector('.card-quickadd');
await p.click('.card-quickadd');
await p.waitForFunction(() => JSON.parse(localStorage.getItem('adamnoteve_cart')||'[]').length === 1);
const count = await p.textContent('.cart-count');
console.log('cart items:', count.trim());
await b.close();
EOF
cd /private/tmp/claude-501/-Users-romellospellman/831b148e-87d0-4a73-8095-bf661dbe6e43/scratchpad && npx -y playwright@1.53 install chromium --with-deps 2>/dev/null; npm ls playwright &>/dev/null || npm i playwright@1.53 &>/dev/null; node qa-test.mjs
```
Expected output: `cart items: 1`. (If Playwright install is unavailable, fall back to: screenshot shop.html and confirm "+ BAG" pill renders on cards; then verify the click path manually at final review.)

- [ ] **Step 4: Screenshot check**

Screenshot `shop.html` at 1440px. Expected: plum glow-cards with chartreuse badges, "+ BAG" pink pill + "VIEW →" outline per card.

- [ ] **Step 5: Commit**

```bash
git add styles.css script.js && git commit -m "feat: glow product cards with one-click quick-add"
```

---

### Task 5: Shop page band + filter pills, section commons, story strip, categories, newsletter

**Files:**
- Modify: `styles.css:319-341` (section commons), `455-499` (story strip), `500-535` (cat cards), `537-605` (newsletter), `1028-1075` (shop hero + filters)

**Interfaces:**
- Consumes: tokens from Task 1.

- [ ] **Step 1: Shop hero + filter pills**

`.shop-hero` (1029): replace its `background: linear-gradient(135deg, var(--hot-pink), var(--purple));` with:

```css
  background:
    radial-gradient(ellipse 70% 80% at 50% 0%, rgba(247, 2, 104, 0.3), transparent 70%),
    var(--deep-purple);
```

Replace `.filter-btn` (1055), `.filter-btn:hover` (1065), `.filter-btn.active` (1067) with:

```css
.filter-btn {
  background: var(--surface);
  color: var(--cream);
  border: 1px solid var(--border);
  padding: 10px 22px;
  border-radius: 30px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover { border-color: var(--neon); color: var(--neon); background: transparent; }

.filter-btn.active {
  background: var(--pink);
  color: var(--cream);
  border-color: var(--pink);
  box-shadow: var(--glow-pink);
}
```
(Keep any padding/size values already present if they differ — only colors/borders/shadows change; the values above mirror the existing pill dimensions.)

- [ ] **Step 2: Section commons + story strip**

- `.section-title .accent` (331): `color: var(--hot-pink);` stays (now brighter pink).
- `.story-strip` (455): set `background: var(--deep-purple);` (replacing its current background) and add `border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);`. If the rule has a `color` property keep it as `var(--cream)`.
- `.quote-marks` (493): set `color: var(--pink);`.

- [ ] **Step 3: Category cards**

Replace `.cat-card` (509), the two `nth-child` overrides (523-524), and `.cat-card:hover` (526) with:

```css
.cat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--cream);
  border-radius: 20px;
  padding: 40px 20px;
  text-align: center;
  font-family: 'Bungee', sans-serif;
  font-size: 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.cat-card:hover {
  transform: translateY(-4px);
  border-color: var(--pink);
  box-shadow: var(--glow-pink);
}
```
(Keep the existing `.cat-card .cat-emoji` rule.)

- [ ] **Step 4: Newsletter**

`.newsletter` (538): set `background: var(--deep-purple); border: 1px solid var(--border);` (replace existing background; keep layout properties). `.newsletter h2` (548): `color: var(--neon);`. `.news-form input` (572): set `background: var(--surface); border: 1px solid var(--border); color: var(--cream);` (keep sizing). `.news-form button` (582): set `background: var(--pink); color: var(--cream);` and `.news-form button:hover` (591): `{ box-shadow: var(--glow-pink); }`. `.news-success` (593): set `color: var(--neon);`.

- [ ] **Step 5: Screenshot check**

Screenshot `index.html` (full length, 1440×3200) and `shop.html`. Expected: coherent dark page top-to-bottom — story strip band, uniform category cards, dark newsletter, dark shop band with pink active filter pill.

- [ ] **Step 6: Commit**

```bash
git add styles.css && git commit -m "theme: dark shop band, filter pills, story strip, categories, newsletter"
```

---

### Task 6: Cart drawer, cart page + free-shipping progress bar

**Files:**
- Modify: `styles.css:681-855` (drawer), `1077-1144` (cart page)
- Modify: `script.js:141-160` (`freeShipBanner`)
- Modify: inline drawer link color in every page containing the cart drawer markup

**Interfaces:**
- Consumes: `getCartTotal()` (script.js:134). `freeShipBanner(subtotal)` is called from `renderCartDrawer` (script.js:366) and `cart.html:170` — the new version keeps the same signature.
- Produces: `.ship-progress`, `.ship-bar` classes.

- [ ] **Step 1: Upgrade freeShipBanner with a progress bar**

Replace the whole `freeShipBanner` function (script.js:142-149) with:

```js
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
```

- [ ] **Step 2: Add ship-progress CSS**

Add to `styles.css` directly after the `.checkout-btn:hover` rule (~line 855):

```css
/* Free-shipping progress */
.ship-progress {
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--cream);
  padding: 10px 14px;
  border-radius: 10px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 14px;
  font-size: 0.9rem;
}

.ship-progress b { color: var(--neon); }

.ship-progress.unlocked { border-color: var(--neon); font-weight: 700; }

.ship-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--bg);
  margin-top: 8px;
  overflow: hidden;
}

.ship-bar span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--pink), var(--neon));
  transition: width 0.4s ease;
}
```

- [ ] **Step 3: Dark drawer + cart page styles**

In `styles.css`:
- `.cart-drawer` (682): set `background: var(--deep-purple);` and add `border-left: 1px solid var(--border);` (keep positioning/transition properties).
- `.cart-overlay` (700): change `background: rgba(18, 0, 36, 0.5);` → `background: rgba(5, 2, 10, 0.6);`
- `.cart-item-price` (781): stays `var(--hot-pink)` (now brighter).
- `.qty-btn` (790): set `background: var(--surface); color: var(--cream); border: 1px solid var(--border);` (keep size/shape). `.qty-btn:hover` (803): `background: var(--pink);` stays.
- `.checkout-btn` (838): set `background: var(--pink); color: var(--cream); box-shadow: 0 0 18px rgba(247, 2, 104, 0.45);` (keep layout). `.checkout-btn:hover` (851): replace body with `{ transform: translateY(-2px); box-shadow: 0 0 30px rgba(247, 2, 104, 0.7); }`
- `.cart-page-summary` (1104) and `.cart-page-items` (1096): set `background: var(--surface); border: 1px solid var(--border);` (keep padding/radius).

- [ ] **Step 4: Fix the drawer's "view full cart" inline link color**

The drawer markup is duplicated in several pages with an inline `color: var(--ink)` that would vanish on dark:

```bash
cd ~/Desktop/adamnoteve-site && grep -l 'view full cart' *.html | xargs sed -i '' 's/color: var(--ink); opacity: 0.7;/color: var(--cream); opacity: 0.8;/' && grep -n 'view full cart' *.html | head
```
Expected: every listed page now uses `var(--cream)`.

- [ ] **Step 5: Verify progress bar renders**

Screenshot `cart.html` at 1440px (empty state is fine), then verify the banner in the drawer: with the Task 4 Playwright setup, after clicking `.card-quickadd`, screenshot the page — the drawer/toast area and `.ship-progress` bar with partial fill should render on `cart.html` after reload:

```bash
cat > /private/tmp/claude-501/-Users-romellospellman/831b148e-87d0-4a73-8095-bf661dbe6e43/scratchpad/cart-test.mjs <<'EOF'
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('http://localhost:8788/shop.html'); await p.waitForSelector('.card-quickadd');
await p.click('.card-quickadd');
await p.goto('http://localhost:8788/cart.html'); await p.waitForSelector('.ship-progress');
const barWidth = await p.getAttribute('.ship-bar span', 'style');
console.log('progress bar:', barWidth);
await p.screenshot({ path: 'cart-check.png', fullPage: true });
await b.close();
EOF
cd /private/tmp/claude-501/-Users-romellospellman/831b148e-87d0-4a73-8095-bf661dbe6e43/scratchpad && node cart-test.mjs
```
Expected: `progress bar: width:NN%` where NN is between 1 and 99; view `cart-check.png` to confirm the dark cart page.

- [ ] **Step 6: Commit**

```bash
git add styles.css script.js *.html && git commit -m "feat: free-shipping progress bar + dark cart drawer and cart page"
```

---

### Task 7: Product page — dark PDP + sticky add-to-cart

**Files:**
- Modify: `styles.css:881-956` (PDP), `1300-1390` (variant pickers)
- Modify: `product.html` (inline script, inside the `DOMContentLoaded` handler that starts at line 119)

**Interfaces:**
- Consumes: `#pdp` container (product.html:48), `#add-pdp` button (re-rendered on variant change — never cache a reference to it), the `product` variable already in scope in that handler (used at product.html:130 and :355).
- Produces: `.sticky-atc` bar.

- [ ] **Step 1: Dark PDP styles**

In `styles.css`:
- `.pdp-img` (895): set `background: var(--surface); border: 1px solid var(--border);` (keep radius/aspect).
- `.pdp-price` (912): set `color: var(--hot-pink);`.
- `.variant-chip` (1324): set `background: var(--surface); color: var(--cream); border: 1px solid var(--border);` (keep shape). `.variant-chip:hover` (1336): `{ border-color: var(--hot-pink); color: var(--hot-pink); }`. `.variant-chip.active` (1341): set `background: var(--pink); color: var(--cream); border-color: var(--pink);`.
- `.qty-picker button` (1374): set `background: var(--surface); color: var(--cream); border: 1px solid var(--border);`. `.qty-picker button:hover` (1383): `{ background: var(--pink); }` (replace `var(--neon)`).
- `.back-link:hover` (956): stays `var(--hot-pink)`.

- [ ] **Step 2: Add sticky-ATC CSS**

Add to `styles.css` after the `.back-link:hover` rule (~line 956):

```css
/* Sticky add-to-cart bar (product page) */
.sticky-atc {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 5%;
  background: rgba(29, 12, 48, 0.94);
  backdrop-filter: blur(8px);
  border-top: 1px solid var(--border);
  transform: translateY(110%);
  transition: transform 0.3s ease;
}

.sticky-atc.show { transform: translateY(0); }

.sticky-atc-name {
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sticky-atc .btn { padding: 12px 26px; font-size: 0.85rem; }

@media (prefers-reduced-motion: reduce) {
  .sticky-atc { transition: none; }
}
```

- [ ] **Step 3: Add sticky-ATC init to product.html**

At the END of the `DOMContentLoaded` handler in product.html's inline script (the handler starting at line 119, after the initial render call), add — using the same `product` variable that handler already defines:

```js
  // Sticky add-to-cart: appears when the PDP scrolls out of view.
  // #add-pdp is re-rendered on variant change, so resolve it at click time.
  const pdpRoot = document.getElementById('pdp');
  if (pdpRoot && product && 'IntersectionObserver' in window) {
    const bar = document.createElement('div');
    bar.className = 'sticky-atc';
    bar.innerHTML = `<span class="sticky-atc-name">${product.name}</span>
      <button type="button" class="btn btn-primary sticky-atc-btn">ADD TO BAG</button>`;
    document.body.appendChild(bar);
    bar.querySelector('.sticky-atc-btn').addEventListener('click', () => document.getElementById('add-pdp')?.click());
    const io = new IntersectionObserver(([entry]) => {
      bar.classList.toggle('show', !entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    io.observe(pdpRoot);
  }
```

- [ ] **Step 4: Verify sticky bar behavior**

```bash
cat > /private/tmp/claude-501/-Users-romellospellman/831b148e-87d0-4a73-8095-bf661dbe6e43/scratchpad/sticky-test.mjs <<'EOF'
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('http://localhost:8788/product.html?id=p45'); await p.waitForSelector('#add-pdp');
const before = await p.$eval('.sticky-atc', el => el.classList.contains('show'));
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(600);
const after = await p.$eval('.sticky-atc', el => el.classList.contains('show'));
await p.click('.sticky-atc-btn');
await p.waitForFunction(() => JSON.parse(localStorage.getItem('adamnoteve_cart')||'[]').length === 1);
console.log('bar hidden at top:', !before, '| bar shown after scroll:', after, '| sticky ATC adds to cart: true');
await b.close();
EOF
cd /private/tmp/claude-501/-Users-romellospellman/831b148e-87d0-4a73-8095-bf661dbe6e43/scratchpad && node sticky-test.mjs
```
Expected: `bar hidden at top: true | bar shown after scroll: true | sticky ATC adds to cart: true`

- [ ] **Step 5: Screenshot + commit**

Screenshot `product.html?id=p45` (serve via localhost, 1440px and 390px). Expected: dark PDP, pink price, dark variant chips.

```bash
git add styles.css product.html && git commit -m "feat: sticky add-to-cart bar + dark product page"
```

---

### Task 8: Snake dividers, scroll reveal, reduced-motion guard

**Files:**
- Modify: `index.html` (insert dividers between sections)
- Modify: `styles.css` (divider + reveal styles, appended at end before COMING SOON block)
- Modify: `script.js` (reveal observer in the global init)

**Interfaces:**
- Produces: `.snake-divider`, `.reveal`/`.reveal-in` classes, `initScrollReveal()` called from the existing `DOMContentLoaded` handler (script.js:490).

- [ ] **Step 1: Insert dividers in index.html**

Insert this block in `index.html` at three places — after the featured `</section>` (line ~110), after the story-strip `</section>`, and after the categories `</section>`:

```html
<div class="snake-divider" aria-hidden="true">
  <svg viewBox="0 0 1200 36" preserveAspectRatio="none"><path d="M0 18 Q 60 2 120 18 T 240 18 T 360 18 T 480 18 T 600 18 T 720 18 T 840 18 T 960 18 T 1080 18 T 1200 18" /></svg>
</div>
```

- [ ] **Step 2: Divider + reveal CSS**

Append to `styles.css` (before the `/* ============ COMING SOON ============ */` block at line 1978):

```css
/* ============ DARK EDEN MOTIFS ============ */
.snake-divider {
  max-width: 900px;
  margin: 0 auto;
  padding: 8px 24px;
}

.snake-divider svg { display: block; width: 100%; height: 22px; }

.snake-divider path {
  fill: none;
  stroke: var(--neon);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-dasharray: 10 14;
  opacity: 0.55;
}

/* Scroll reveal */
.reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
.reveal-in { opacity: 1; transform: none; }

@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
  .marquee-track { animation: none; padding-left: 0; }
  .logo .heart { animation: none; }
}
```

- [ ] **Step 3: Reveal observer in script.js**

Add this function above the `// ===== INIT GLOBAL =====` comment (script.js:489):

```js
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
```

Then add `initScrollReveal();` inside the existing `DOMContentLoaded` handler, right after `renderCartDrawer();` (script.js:493).

- [ ] **Step 4: Verify + commit**

Screenshot `index.html` full-page — dividers visible between sections, sections near the top revealed (IntersectionObserver fires for in-view elements even in headless screenshots; if sections render invisible in the screenshot, check that the observer ran).

```bash
git add index.html styles.css script.js && git commit -m "feat: snake-vine dividers + scroll reveal with reduced-motion guard"
```

---

### Task 9: Remaining pages sweep — checkout, search, toast, about/contact/kits/legal, footer

**Files:**
- Modify: `styles.css` — checkout (1392-1739), search overlay (1164-1290), toast (858-880), about (958-1027, 1843-1859), contact (1861-1919), legal (1798-1841), footer (607-679), order success (1741-1796)

**Interfaces:**
- Consumes: tokens from Task 1.

- [ ] **Step 1: Checkout + forms**

- `.checkout-form` (1457) and `.checkout-summary` (1549): set `background: var(--surface); border: 1px solid var(--border);` (keep padding/radius).
- `.form-field input, .form-field select` (1493): set `background: var(--deep-purple); border: 1px solid var(--border); color: var(--cream);` (keep sizing). Focus rule (1506): set `border-color: var(--pink);`.
- `.step.active` (1432): set `background: var(--pink); color: var(--cream);`. `.step.done` (1439): set `background: var(--neon); color: var(--bg);`.
- `.btn-back` (1535): set `background: var(--surface); color: var(--cream); border: 1px solid var(--border);`; hover (1547): `{ border-color: var(--neon); color: var(--neon); background: transparent; }`.
- `.promo-input` (1640): change `background: rgba(255, 245, 236, 0.95);` → `background: var(--deep-purple);` and add `color: var(--cream);`.

- [ ] **Step 2: Search overlay + toast**

- `.search-overlay` (1165): `rgba(18, 0, 36, 0.85)` → `rgba(5, 2, 10, 0.85)`.
- `.search-modal` (1185): set `background: var(--deep-purple); border: 1px solid var(--border);` (keep radius/animation).
- `.search-input` (1212): set `color: var(--cream); background: transparent;`. Placeholder rule (1223): set `color: rgba(255, 245, 236, 0.4);`.
- `.search-result:hover` (1256): keep (pink tint works on dark).
- `.toast` (858): set `background: var(--surface); color: var(--cream); border: 1px solid var(--pink); box-shadow: var(--glow-pink);` (keep positioning).

- [ ] **Step 3: About / contact / legal / order success**

- `.stat-box` (1007): set `background: var(--surface); border: 1px solid var(--border);`. `.stat-num` (1016): set `color: var(--hot-pink);`.
- `.about-hero` (959): replace any gradient/solid light background with the same radial-pink-on-deep-purple treatment used by `.shop-hero` in Task 5.
- `.contact-info-card` (1868) and `.contact-form` (1894): set `background: var(--surface); border: 1px solid var(--border);`. `.contact-form textarea` (1902): match the Task 9 Step 1 input treatment (`background: var(--deep-purple); border: 1px solid var(--border); color: var(--cream);`).
- `.legal-tldr` (1799): change `background: rgba(122, 43, 255, 0.06);` → `background: rgba(122, 43, 255, 0.16);`.
- `.legal-placeholder` (1832): keep pink tint; add `color: var(--cream);` if it sets a dark color.
- `.order-success .check-circle` (1753): set `background: var(--neon); color: var(--bg);`.

- [ ] **Step 4: Footer**

- `.footer` (608): set `background: var(--ink); border-top: 1px solid var(--border);` (keep grid/padding).
- `.footer-brand h3` (622): set `color: var(--hot-pink);`.
- `.socials a` (656): set `background: var(--surface); border: 1px solid var(--border); color: var(--cream);`. Hover (667): set `border-color: var(--neon); color: var(--neon);` (replace body if it sets background).
- `.footer a:hover` (648): stays `var(--neon)`.

- [ ] **Step 5: Full remaining-color audit**

```bash
cd ~/Desktop/adamnoteve-site && grep -nE "#[0-9a-fA-F]{3,8}|rgba?\(" styles.css | grep -v "var(--" | grep -vE "rgba\((247, 2, 104|186, 199, 27|0, 0, 0|5, 2, 10|29, 12, 48|122, 43, 255|255, 245, 236|255, 0, 122|255, 46, 46)"
```
Review every remaining hit: each must be either (a) intentionally kept (e.g., `#ffb3b3` error text — fine on dark) or (b) fixed to a token. Also sweep the inline styles in HTML/JS:

```bash
grep -n "background:#fff\|background: #fff\|background:white" styles.css script.js *.html
```
The kit thumbnails (`script.js:244`) keep `background:#fff` intentionally — product mockups need a light backing. Fix any other hits to `var(--surface)`.

- [ ] **Step 6: Screenshot every remaining page + commit**

Screenshot at 1440px: `checkout.html`, `about.html`, `contact.html`, `kits.html`, `privacy.html`, `terms.html`, `refund.html` (served via localhost so JS renders). Expected: every page fully dark, no light patches, readable text everywhere.

```bash
git add styles.css *.html script.js && git commit -m "theme: dark checkout, search, toast, info pages, and footer"
```

---

### Task 10: Full verification pass + PR

**Files:**
- No new changes expected — fixes only if verification fails.

- [ ] **Step 1: Full cart-flow regression (quick-add → drawer → cart → checkout)**

```bash
cat > /private/tmp/claude-501/-Users-romellospellman/831b148e-87d0-4a73-8095-bf661dbe6e43/scratchpad/flow-test.mjs <<'EOF'
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
// 1. quick-add from shop card
await p.goto('http://localhost:8788/shop.html'); await p.waitForSelector('.card-quickadd');
await p.click('.card-quickadd');
await p.waitForFunction(() => JSON.parse(localStorage.getItem('adamnoteve_cart')||'[]').length === 1);
// 2. add from product page
await p.goto('http://localhost:8788/product.html?id=p45'); await p.waitForSelector('#add-pdp');
await p.click('#add-pdp');
await p.waitForFunction(() => JSON.parse(localStorage.getItem('adamnoteve_cart')||'[]').length === 2);
// 3. cart page renders both + progress bar
await p.goto('http://localhost:8788/cart.html'); await p.waitForSelector('.ship-progress');
const items = await p.$$eval('.cart-page-items .cart-item, .cart-page-items [class*=item]', els => els.length);
// 4. checkout page renders with summary
await p.goto('http://localhost:8788/checkout.html'); await p.waitForSelector('.checkout-summary');
const summaryItems = await p.$$eval('.summary-item', els => els.length);
console.log('cart page items:', items, '| checkout summary items:', summaryItems);
await b.close();
EOF
cd /private/tmp/claude-501/-Users-romellospellman/831b148e-87d0-4a73-8095-bf661dbe6e43/scratchpad && node flow-test.mjs
```
Expected: `cart page items: ≥2 | checkout summary items: 2` (exact selector counts may vary with markup — the hard requirement is both pages render their items and no JS errors appear).

- [ ] **Step 2: Screenshot all 11 pages, both widths**

```bash
cd ~/Desktop/adamnoteve-site
SCRATCH=/private/tmp/claude-501/-Users-romellospellman/831b148e-87d0-4a73-8095-bf661dbe6e43/scratchpad
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for p in index shop product cart checkout kits about contact privacy terms refund; do
  url="http://localhost:8788/$p.html"; [ "$p" = "product" ] && url="$url?id=p45"
  "$CHROME" --headless --disable-gpu --hide-scrollbars --screenshot="$SCRATCH/final-$p-desktop.png" --window-size=1440,2800 "$url" 2>/dev/null
  "$CHROME" --headless --disable-gpu --hide-scrollbars --screenshot="$SCRATCH/final-$p-mobile.png" --window-size=390,1800 "$url" 2>/dev/null
done
```
View every screenshot. Checklist per page: dark base everywhere, readable text (no dark-on-dark or light-on-light), pink CTAs glowing, chartreuse used sparingly, product mockup images sit cleanly in cards, mobile nav/menu usable.

- [ ] **Step 3: Contrast spot-check**

Confirm: prices/accent text use `--hot-pink` `#ff3d8f` (≥4.5:1 on `#140820`/`#241035`), body text is `--cream`, chartreuse `#BAC71B` only on dark surfaces. Fix any violations found in screenshots.

- [ ] **Step 4: Push branch + open PR**

```bash
cd ~/Desktop/adamnoteve-site && git push -u origin dark-eden
gh pr create --title "Dark Eden site restyle (Midnight Plum)" --body "$(cat <<'EOF'
## Summary
- Full-site dark retheme derived from the new apple+snake logo (plum base, pink primary, chartreuse accent)
- Rebuilt hero: centered statement with glowing logo mark, ~60% shorter, bestsellers at the fold
- Glow product cards + one-click "+ BAG" quick-add (uses existing quickAdd/cart logic)
- Sticky add-to-cart bar on product pages; free-shipping progress bar in drawer + cart
- Snake-vine dividers + scroll reveals (with prefers-reduced-motion guard)
- Untouched: products, lib/, designs/, netlify functions, checkout logic, fonts

## Verification
- Playwright cart-flow regression: quick-add → drawer → cart page → checkout ✅
- All 11 pages screenshot-verified at 1440px and 390px
- Spec: docs/superpowers/specs/2026-07-02-dark-eden-restyle-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Stop the local server afterwards (`kill %1` or find the `http.server 8788` process).
