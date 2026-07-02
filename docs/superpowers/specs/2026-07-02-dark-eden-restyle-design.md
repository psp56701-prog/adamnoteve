# Dark Eden ("Midnight Plum") Site Restyle — Design Spec

**Date:** 2026-07-02
**Site:** adamnoteve.com (static HTML/CSS/JS, Netlify)
**Repo:** psp56701-prog/adamnoteve
**Status:** Approved by owner (visual options validated interactively: palette variant A "Midnight Plum", hero layout B "centered statement", card treatment A "glow cards")

## Goal

Re-theme the entire site from the current cream/bubblegum neo-brutalist look to a dark
"garden of Eden after dark" palette derived from the new apple+snake logo, and fix the
highest-impact UX problems (oversized empty hero, no quick-add, weak footer, no sticky
add-to-cart) — without touching products, cart/checkout logic, or `lib/`.

## Color system

Replace values in the `:root` block of `styles.css`. Old variable names are kept and
remapped so every existing `var()` reference resolves to a dark-theme value; new names
are added where needed.

| Token | Value | Role |
|---|---|---|
| `--bg` (new) | `#140820` | page base, deep plum |
| `--surface` (new) | `#241035` | cards, raised panels |
| `--border` (new) | `#3a1c55` | card/panel borders |
| `--pink` | `#F70268` | primary accent: CTAs, prices, links, glows, active states |
| `--neon` | `#BAC71B` | secondary accent (chartreuse): badges, marquee, serpent motifs — sparing use |
| `--cream` | `#FFF5EC` | primary text on dark |
| `--ink` | `#0a0512` | deepest shadow/contrast tone |
| `--deep-purple` | `#1d0c30` | header/nav bar, alt section band |

Legacy `--hot-pink`, `--purple`, `--neon-cyan`, `--red`, `--text`, `--shadow`,
`--shadow-sm` are remapped to theme-consistent dark equivalents (hard offset shadows
become glow/soft shadows per component; see Cards).

**Accessibility:** all text/background pairs meet WCAG AA. Cream on `#140820` ≈ 14:1.
Pink `#F70268` on plum is reserved for large/bold text and non-text accents; where pink
text falls below AA at small sizes, lighten to a `--pink-bright` variant or increase size/weight.

## Hero (index.html only)

Centered statement layout, height ~60–70vh (down from ~1.5 screens):

- Snake-apple logo mark (existing `logo-apple.png`) centered above the headline, with a soft pink glow.
- Centered headline: `LOVE IS ~~ETERNAL~~ TEMPORARY.` (strike in chartreuse), sub-line below.
- CTAs: primary pink pill with glow ("SHOP THE BREAKUP"), secondary chartreuse-outline pill ("OUR SOB STORY").
- Background: `--bg` with one subtle radial pink glow from top center. The full-screen
  pink/purple/cyan gradient and floating watermark words are removed.
- Chartreuse marquee strip directly under the hero; Bestsellers section starts at the fold.

## Shop & product cards (shop.html, index.html bestsellers)

Glow-card treatment:

- Card: `--surface` background, 1px `--border`, rounded corners.
- Hover: pink border, soft pink glow (`box-shadow: 0 0 16px rgba(247,2,104,0.45)`), slight lift.
- Quick-add: a "+ BAG" pill pinned bottom-right of each card, wired to the **existing**
  add-to-cart function in `script.js` (same code path as the product page — no new cart logic).
- Badges (NEW/TREND/BESTSELLER/LIMITED): chartreuse background, plum text.
- Filter pills: dark surface, cream text, pink active state.
- Product images keep their native mockup backgrounds (white mugs, dark hoodies) inside the card image area.

## Brand motifs & micro-interactions

- Snake-vine SVG divider (thin chartreuse serpent line) between major home-page sections.
- Primary buttons carry a persistent subtle pink glow; glow intensifies on hover.
- Scroll-reveal (fade-up) on section entry via one IntersectionObserver in `script.js`.
- All motion behind a `prefers-reduced-motion` guard (reveals render visible, glows static).
- Existing marquee animations kept, recolored chartreuse/plum.

## Conversion & trust

- **product.html:** sticky add-to-cart bar (product name, price, ATC button) appears when
  the main ATC button scrolls out of view.
- **cart.html:** free-shipping progress bar — "$X away from free shipping" against the $50 threshold.
- **Footer (all pages):** rebuilt dark footer — newsletter signup (uses existing contact/form
  endpoint if present, else mailto fallback), nav links, social icons, trust/shipping line.
  Footer markup is duplicated per page; update identically in each file.

## Page coverage

| Page | Work |
|---|---|
| index.html | hero restructure, section dividers, card quick-add, footer |
| shop.html | card treatment + quick-add, filter pills, footer |
| product.html | dark restyle, sticky ATC, footer |
| cart.html | dark restyle, shipping progress bar, footer |
| checkout.html | dark restyle only (no logic changes), footer |
| about.html, contact.html, kits.html | inherit theme, footer |
| privacy.html, terms.html, refund.html | inherit theme, footer — no layout work |

## Out of scope / must not change

- Products, `lib/products.js`, `lib/printful-mapping.js`, `designs/`, Netlify functions.
- Checkout/cart logic and existing JS cart behavior (quick-add only calls existing functions).
- Fonts: Bungee (display) + Space Grotesk (body) stay.
- Logo/brand assets shipped in the previous change.

## Implementation approach

CSS-first: the retheme lives in `styles.css` token + component changes. HTML edits are
surgical and limited to: hero block (index), card quick-add buttons, sticky ATC (product),
progress bar (cart), footer (all pages). JS additions are small and additive in `script.js`:
quick-add handler, IntersectionObserver reveal, sticky-bar toggle, progress-bar calc.

## Verification

- Per page: headless-Chrome screenshots at 1440px and 390px widths, reviewed against this spec.
- Cart regression: add item from a card quick-add → cart shows it → proceed to checkout renders. Repeat from product page.
- Contrast spot-checks on pink text sizes.
- Work on a `dark-eden` branch; open a PR (owner merges + deploys manually, as with the logo change).
