# Adamnoteve Product Roadmap

Tracks which catalog entries in `lib/products.js` have been wired through to Printful fulfillment.

**Legend:**
- ✅ Live: Printful product exists, mapping added to `lib/printful-mapping.js`, can ship.
- 🎨 Design: artwork file ready, but not yet uploaded to Printful.
- ⏳ Planned: name + copy exist; no design, no Printful product.

## Removed

- **p16 Espresso Yourself Mug** — removed 2026-06-05. Did not fit the brand theme.
- **p7 Iced Out Beanie** — retired 2026-06-06. Off-theme test item; removed from catalog and deleted from the Printful store (was sync product 436646515).
- **p19 Highlighters, p20 Gel Pens, p21 Pencils, p22 Sticky Notes, p24 Sage Bundle** — removed 2026-06-27. Printful cannot print these; removed from the catalog so the store has no un-shippable "Coming Soon" items.

## Status

| ID  | Product                              | Category    | Status     | Notes |
| --- | ------------------------------------ | ----------- | ---------- | ----- |
| p1  | I Dodged a Bullet Mug                | drinkware   | ✅ Live    | **12 colors** as of 2026-06-06: White Glossy (11/15/20oz, sync product 436690698), Black Glossy w/ inverted design (11/15oz, 436911188), 10 color-inside blanks (436911185; 4 are 11oz-only). Per-size pricing $18/$22/$26. PDP filters sizes per color; checkout rejects unmapped combos. |
| p2  | Thanks for the Trauma Hoodie         | apparel     | ✅ Live    | Launched 2026-06-06 (typographic design). Gildan 18500, 26 colors S–2XL, $55. Sync 436912426/432. |
| p3  | Emotionally Unavailable Club Tee     | apparel     | ✅ Live    | Launched 2026-06-06 (typographic design). BC3001, 83 colors S–2XL, $28. Sync 436912458/462/537/540/543. |
| p4  | We Were a Mistake Candle             | home        | ✅ Live    | Launched 2026-06-06. Scented Soy Candle 9oz white tin, 7 scents as "colors", $32. Label design designs/p4-mistake-label.png. Sync 436913414. |
| p5  | Red Flags Were My Aesthetic Tote     | accessories | ✅ Live    | Launched 2026-06-06 (typographic design). BagBase W101, 12 colors, $22. Sync 436912822. |
| p6  | Closure is a Myth Sticker            | accessories | ✅ Live    | Launched 2026-06-06 (typographic design). Kiss-cut, 3"/4"/5.5" at $8/$10/$12. Sync 436912830. Renamed from "Sticker Pack". |
| p8  | Ghosted Phone Case                   | accessories | ✅ Live    | Launched 2026-06-06 (typographic design). Matte tough case, iPhone 14–16 + Galaxy S23/S24 (18 models), $20. Sync 436912833/838. |
| p9  | Petty in Pink Crewneck               | apparel     | ✅ Live    | Launched 2026-06-06 (typographic design). Gildan 18000, 25 colors S–2XL, $58. Sync 436912437/446. |
| p10 | Toxic Ex Repellent Candle            | novelty     | ✅ Live    | Launched 2026-06-06, renamed from "Spray". Amber Jar candle 4oz/$19, 9oz/$26 (was $15 — under cost), 5 scents w/ ragged size availability (sizesByColor). Sync 436913416. |
| p11 | Single & Salty Water Bottle          | drinkware   | ✅ Live    | Launched 2026-06-06 (typographic design). SS bottle 17oz White/Black, $34 (blank costs $23.91 — was underpriced at $24). Sync 436912840. |
| p12 | Cried in the Uber Crewneck           | apparel     | ✅ Live    | Launched 2026-06-06 (typographic design). Gildan 18000, 25 colors S–2XL, $48. Sync 436912448/451. |
| p13 | Self-Care Era Tee                    | apparel     | ✅ Live    | Launched 2026-06-06 (typographic design). BC3001, 83 colors S–2XL, $26. Sync 436912545/554/555/566/578. |
| p14 | Allergic to Mixed Signals Hoodie     | apparel     | ✅ Live    | Launched 2026-06-06 (typographic design). Gildan 18500, 26 colors S–2XL, $54. Sync 436912433/436. |
| p15 | Block & Move On Crew Socks           | apparel     | ✅ Live    | Launched 2026-06-06. Sublimation Socks S/M/L, all-over BLOCKED pattern (4 leg placements), $14. (Embroidered SOCCO blank rejected — $22.90 cost.) Sync 436913420. |
| p17 | Salty Single Tumbler                 | drinkware   | ✅ Live    | Launched 2026-06-06 (typographic design). Insulated tumbler w/ straw 20oz, 5 colors, $32. Sync 436912842. |
| p18 | Manifest, Don't Text Journal         | stationery  | ✅ Live    | Launched 2026-06-06 (typographic design). Spiral notebook 5.5"×8.5" dotted, $22. Sync 436912844. |
| p23 | Healing Era Desk Mat                 | home        | ✅ Live    | Launched 2026-06-06 (typographic design). 12"×18"/12"×22"/16"×32" at $28/$32/$44. Sync 436912851. |
| p26 | Anti-Valentine Card Collection       | stationery  | ✅ Live    | Launched 2026-06-27. Greeting Card 5"×7" (Printful blank 568/var 14458), $6. 6 designs as a one-tile collection (modeled as colors): Congrats on the Breakup, Sorry He Sucked, It's Definitely Them, Happy Divorce, New Number Who Dis, RIP to the Situationship. 6 sync products 443089670/986/989/990/992/994. |
| p27 | Emotional Support Beverage Koozie    | accessories | ✅ Live    | Launched 2026-06-27. Can Cooler (blank 764), Regular+Slim, $8. Sync 443089996. |
| p28 | Allergic to Me Pet Bandana           | novelty     | ✅ Live    | Launched 2026-06-27. Pet Bandana Collar (blank 902), Black, S–XL, $19.99. Sync 443090006. |
| p25 | Lost Tee                             | apparel     | ✅ Live    | Added 2026-06-06, deployed to prod same day. Bella+Canvas 3001, **83 colors**, S–2XL, $24 flat. Split across 6 Printful sync products (100-variant cap): 436904790 + 436908200/05 (light, black design) + 436908216/20/29 (dark, white inverted design). 415 variants total; mapping generated programmatically (see P25_COLOR_VARIANTS in lib/printful-mapping.js). User-designed in Canva. |

## Launch checklist for a new product

1. Design the artwork (Canva / AI / hand-made). Export 300 DPI PNG with transparent background.
2. In Printful → Stores → adamnoteve-site → Add product. Pick the blank, upload artwork, set sizes/colors.
3. Publish to store. Note the `sync_variant_id` for each variant.
4. Add entries to `lib/printful-mapping.js` matching the product/size/color keys used in `lib/products.js`.
5. Test locally with `netlify dev` — place a test order, watch the webhook log a successful Printful draft order.
6. Confirm the Printful preview image in `lib/products.js` (`img` field) matches what customers will receive.

## Notes on Printful catalog gaps

Printful does NOT currently print: actual bed linens (sheets/comforters), highlighters, pens, pencils, sticky notes, sage bundles. For those items we'd need an alternate fulfillment partner (Gooten, Pillow Profits, or simply order/pack/ship from home).
