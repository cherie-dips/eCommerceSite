# Flagzen roadmap: from project to a store real people use

This plan has four parts:

1. Where the project is now.
2. What must happen before real customers pay.
3. How the in-app custom design can grow.
4. What makes the business run smoothly.

---

## 1. Where things stand

The whole buying journey works end to end and is covered by tests (28 server tests, plus 47 browser checks run during development):

| Area | Status |
| --- | --- |
| Product catalogue: search, categories, sorting, pages, reviews | ✅ Done |
| Design studio: photos, logos, text, shapes, layers, undo, front/back | ✅ Done |
| Design suggestions: 3 free "smart templates" + optional AI ideas | ✅ Done |
| 3D mug preview and 3D logo lab | ✅ Done |
| Print-ready files for sellers (300 DPI PNG) | ✅ Done |
| Cart, saved addresses, discount code, stock reservation | ✅ Done |
| Razorpay payments, refunds on cancel, payment webhook | ✅ Built, **needs your Razorpay keys** |
| Emails (confirm email, reset password, order updates) | ✅ Built, **needs an email service** |
| My Orders / My Designs / Profile | ✅ Done |
| Seller tools: products, print areas, stock, order steps, tracking | ✅ Done |
| Admin panel: seller approval, users, products, orders | ✅ Done |
| Security: sign-up roles, upload checks, rate limits, safe errors | ✅ Done |

**Can the app suggest 2–3 designs after an upload? Yes, it already does, in two ways:**
- **Smart templates (free, instant):** the app reads the upload's main colours and whether it is a logo (transparent background, few colours) or a photo.
  - For logos it suggests a centred logo, the logo with a brand name, and a round badge (a left-chest logo on T-shirts).
  - For photos it suggests a full photo, a framed photo with a caption, and a round portrait.
- **AI ideas (optional):** the upload and product details go to Claude, which returns 3 more layouts in a fixed format. The server checks every value before showing it. This costs roughly 3–10 US cents per request (an estimate; check the real figure in the Anthropic console) and is limited to 10 requests per user per hour.

---

## 2. Before real customers (must do)

Do these in this order. None of them need more coding, unless marked.

### Week 1: accounts and safety
1. **Change the MongoDB password** in MongoDB Atlas. The old one is visible in the GitHub history. Then turn on Atlas backups.
2. **Razorpay:** create an account and use the test keys first. Complete KYC to get live keys. Add the webhook (see README).
3. **Email:** sign up for an email service (Resend, Brevo or Amazon SES), verify your domain, and put the SMTP settings in `server/.env`.
4. **Google sign-in:** add your live website address to the allowed origins in Google Cloud.
5. **Domain and hosting:** buy a domain.
   - Simplest: host the server and website together on Render or Railway, with a persistent disk for `server/uploads`.
   - Better: move uploads to cloud storage, so files survive redeploys and can be served fast from a CDN.
     - Cloudinary or Amazon S3: about 1 day of coding.
6. **Create your admin account** (`npm run create-admin`) and approve your first sellers.

### Week 2: trust and legal
7. **Pages customers expect:**
   - Privacy policy, terms of service, and a return/refund policy (custom items are usually non-returnable unless faulty; say so clearly).
   - Shipping times and a contact page.
   - About 1 day of coding plus writing the policies; get them checked.
8. **GST invoices:** a PDF invoice per order, emailed and downloadable from My Orders. About 2 days.
9. **Real product photos:** blank, front-facing product photos on a plain background give the best design previews. Replace the demo templates.

### Week 3: test with real people
10. **Small private launch:** invite 10–20 friendly customers and 1–2 print partners.
    - Watch them design something without helping. Note where they get stuck.
    - Track which suggestions they pick (add simple analytics: Plausible or PostHog).
11. **Print a real sample of every product** from the exported print files before selling it.
    - Colours on screen and on fabric or ceramic differ; adjust the print areas if needed.
12. **Error tracking:** add Sentry (free tier) to the website and server so you hear about problems before customers email you. About half a day.

---

## 3. The custom design idea: how it can grow

### Phase A: done now
- Upload images; add text and shapes; move, resize and rotate; layers; undo; front and back sides.
- Smart template suggestions, plus optional AI suggestions.
- Print-area guides per product; low-resolution warning; 300 DPI print files.
- 3D mug preview; 3D logo lab.
- Drafts kept in the browser; saved designs can be reopened and reordered.

### Phase B: next (most value for customers)
| Feature | Why it matters | Effort |
| --- | --- | --- |
| **Remove image background** (one click, for logos on white) | Most customers only have a JPG logo with a white box around it | 2–3 days (remove.bg API, or a free on-device model) |
| **Product colours** (the same T-shirt in 5 colours, a photo per colour) | People expect to choose the shirt colour | 3–4 days |
| **Names on every item** (upload a list; each shirt gets a different name) | Very common for corporate and team orders | 3–5 days |
| **Proof approval** (seller sends a final proof; customer approves before printing) | Avoids reprints and complaints | 2–3 days |
| **Clipart and icon library**, QR codes, more fonts | Customers without a logo can still make something nice | 2–4 days |
| **Curved text** for badges and mugs | Common merch look | 1–2 days |
| **SVG/vector logos** (cleaned for safety) | Sharp prints at any size | 2 days |

### Phase C: richer previews and AI
- **Full wrap-around printing for mugs** (the design is wrapped onto the mug model instead of only the front), and more 3D models (T-shirt, tote, bottle) made in Blender. About 1–2 weeks.
- **AI that improves over time:**
  - Log which suggestions people choose and keep the prompt tuned to that.
  - Have the AI write taglines.
  - Offer AI-generated background art.
  - Cache results for the same image to save cost.
- **Bleed and safe-area guides** per product, as print partners require.

---

## 4. Running the business

| Need | Plan | Effort |
| --- | --- | --- |
| Courier booking and tracking | Connect Shiprocket: book pickup, print labels and get tracking updates automatically (today sellers type the tracking ID by hand) | 4–5 days |
| Paying sellers | Razorpay Route splits each payment between Flagzen and the seller automatically | 3–4 days |
| Discount codes | Admin screen to create codes (today only `SAVE10` exists, written in code) | 1–2 days |
| Returns and disputes | Admin screen to refund part of an order and record why | 2 days |
| Low-stock alerts | Email the seller when stock drops below a limit | half a day |
| Corporate customers | Bulk-order quotes, company accounts, invoices with GST numbers | 1–2 weeks |
| Being found on Google | Pre-render product pages so search engines can read them; product structured data | 3–4 days |

### Quality (ongoing)
- Run the server tests automatically on every push (GitHub Actions). Add browser tests for the main buying journey.
- Keep `npm audit` clean.
- Check the site on real phones (the layout works on phones, but test on cheap Android devices too).
- Check accessibility: keyboard use and screen-reader labels in the design studio.

---

## Rough running costs (monthly, small scale)

| Item | Cost |
| --- | --- |
| Hosting (Render/Railway, 1 small server + disk) | about $7–25 |
| MongoDB Atlas | free to start; about $9+ when you grow |
| Cloud storage for uploads | free tier, then a few dollars |
| Email (Resend/Brevo) | free tier (a few thousand emails) |
| Razorpay | about 2% per successful payment, no monthly fee |
| AI design ideas (optional) | a few cents per request; capped per user per hour |
| Domain | about ₹800–1,500 per year |

These are estimates; check each provider's current pricing.
