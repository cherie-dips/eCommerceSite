# Flagzen

**Live site: https://ecommercesite-production-2842.up.railway.app**

Flagzen is a 3D customisation store for custom-branded merchandise. Sellers list products with a
**3D model** (an uploaded `.glb` file). Shoppers turn the products around in 3D, design them in the
browser (upload a logo or photo, pick a suggested layout, fine-tune it and see it on the 3D model) and
order. Sellers get print-ready files with every order, and admins look after the whole store.

## What it does

**Shoppers**
- **Home:** a live 3D product in the hero with a sample logo printed on it; switch products and drag to turn it.
- **Design page:** every product shown as its rotating 3D model (drag to turn it), filtered by category.
- **Design studio** on every product:
  - Upload photos and logos, add text (8 fonts, colours, outline, spacing) and shapes.
  - Move, resize and rotate everything; undo/redo; layers (order, lock, hide); front and back sides.
  - **3 instant design ideas** after an upload, based on the logo/photo's colours and shape.
  - **AI design ideas** (optional) from Claude, when the server has an Anthropic API key.
  - Print-quality warning when an image is too small for its printed size.
  - **3D view:** the front and back designs shown on the product's 3D model, where the seller set them.
  - Unfinished designs are kept in the browser (they survive a refresh or logging in).
- Likes (shown in 3D too), reviews and ratings.
- Cart with saved addresses and discount codes; checkout with **Razorpay** (UPI, cards, net banking, wallets).
- My Orders (status steps, courier tracking, cancel with automatic refund), My Designs, Profile.
- Sign up with email or Google, confirm email, reset a forgotten password.

**Sellers**
- Add/edit products: upload the product's **3D model** (`.glb`, up to 25 MB, textures included) and
  click it to choose where the front and back designs go and how big they are; upload photos for each
  side and mark the print area by dragging a box on the photo (this sets the size of the print files).
- Stock levels, sales numbers, remove/restore products.
- Orders: download print files (high-resolution PNG up to 300 DPI, transparent background), mark
  "being made", ship with courier + tracking ID, mark delivered, cancel (the customer is refunded).
- New seller accounts wait for admin approval.

**Admins**
- Store totals, approve sellers, change user roles, hide products, see every order.

## How 3D models work

1. **Upload:** the seller uploads a `.glb` file. The server checks it is a real, self-contained glTF 2.0
   file with at least one shape (no separate texture files), saves it under `uploads/models/` and the
   product stores its path (`modelFile`). A product can't be saved without a 3D model.
2. **Print spots:** in the product form the seller clicks the model where the front (and back) designs
   go and sets their size. Each spot is saved in the model's own coordinates (`modelPrintSpots`), so it
   stays right however big the model is shown. Without one, a design goes in the middle of that side.
3. **Showing it:** the Design page draws every product's model through one shared WebGL canvas, each
   card in its own scissored viewport. In the design studio's 3D view, each side's design is rendered to
   a picture and projected onto the model's surface at its print spot (faces pointing away are skipped,
   so the design doesn't show through thin products).
4. **Printing:** the print files come from the 2D design studio (sized by the print area on the
   product photo) and are attached to every order for the seller.

The demo products from `npm run seed` use built-in models drawn in code (`model3d`); every new product
uses an uploaded model.

## Look and feel

A bright "photo studio": warm paper background, ink-black type and pill buttons, frosted glass panels
floating over the 3D products, and one electric lime accent. Headlines use **Instrument Serif**, the
interface **Geist**, and small labels **Geist Mono**. Everything comes from one design system in
`client/src/styles/ui.css` (colours, buttons, cards, forms, tables, badges, the 3D gallery, the footer);
the other stylesheets only lay out their page.

## Tech stack

| Part | Technology |
| --- | --- |
| Website (`client/`) | React 19, Vite, React Router, Phosphor icons (react-icons) |
| 3D | three.js, React Three Fiber, drei: sellers' glTF models, one shared WebGL canvas for the gallery, design decals |
| Design studio | Konva / react-konva (2D editor, previews and print files) |
| Server (`server/`) | Node.js, Express 5, Helmet, rate limiting |
| Database | MongoDB Atlas with Mongoose |
| Login | JWT, bcrypt, Google Sign-In |
| Uploads | Multer (photos, designs, print files and 3D models on disk; a persistent volume in production) |
| Payments | Razorpay Standard Checkout with signature-checked payments and webhooks |
| Email | Nodemailer with any SMTP service (printed in the console without settings) |
| AI design ideas | Anthropic Claude API (optional) |
| Tests | node:test with an in-memory MongoDB |
| Hosting | Railway (app + volume), GitHub Actions for tests and builds |

## Getting started

You need **Node.js 20+** and a **MongoDB** database (a free MongoDB Atlas cluster works).

```bash
# 1. Install everything
npm run install:all

# 2. Settings: copy the examples and fill them in
cp server/.env.example server/.env      # at least MONGO_URI and JWT_SECRET
cp client/.env.example client/.env      # optional

# 3. Demo data: a demo seller and one demo product for each built-in 3D model
npm run seed

# 4. Your admin account
npm run create-admin -- you@example.com "a-strong-password" "Your Name"

# 5. Start the server and the website together
npm run dev
```

Open http://localhost:5173. The server runs on http://localhost:5050.

### Optional services

All of these are off until their settings are added to `server/.env`; the store works without them.

| Service | Settings | Without it |
| --- | --- | --- |
| **Razorpay payments** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (+ `RAZORPAY_WEBHOOK_SECRET`) from the [Razorpay dashboard](https://dashboard.razorpay.com/app/keys). Add a webhook to `https://<server>/api/payments/razorpay/webhook` for `payment.captured` and `order.paid`. | Locally, checkout runs in test mode (orders are marked paid without taking money). On the live site (`NODE_ENV=production`) checkout is turned off, so no order is ever free. |
| **Email** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (e.g. Resend, Brevo, Amazon SES) | Emails (confirmation links, reset links, order updates) are printed in the server console. |
| **Google sign-in** | `GOOGLE_CLIENT_ID` (server) and `VITE_GOOGLE_CLIENT_ID` (client), the same value. Add every website address you use (e.g. `http://localhost:5173`, the live site) as an *Authorized JavaScript origin* in Google Cloud. | The Google button doesn't work; email sign-up still does. |
| **AI design ideas** | `ANTHROPIC_API_KEY` from the [Anthropic console](https://console.anthropic.com). `AI_SUGGESTIONS_PER_HOUR` limits requests per user (default 10). Each request costs a few US cents. | Only the free "smart template" ideas are shown. |

## Commands (run from the project folder)

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the server and the website |
| `npm test` | Runs the server tests (uses a temporary database, never yours) |
| `npm run lint` | Checks the website code |
| `npm run build` | Builds the website for going live |
| `npm start` | Starts the server (in production it also hosts the built website) |
| `npm run seed` | Adds the demo seller and demo products (safe to run again) |
| `npm run create-admin -- <email> <password> [name]` | Creates an admin, or makes an existing account an admin |

## Deployment

The live site runs on [Railway](https://railway.com) as a single service: the Express server hosts the
API, the built website and the uploaded files.

- **Every push to `main`** runs the GitHub Actions check (`.github/workflows/ci.yml`): server tests,
  website lint and build. Railway waits for it to pass ("Wait for CI") and then deploys.
- **Build and start commands** are in `railway.json`. On start, the server runs the seed script, which
  only adds demo products that are missing.
- **Uploads** (photos, designs, print files, 3D models) are saved on a Railway volume mounted at `/data`
  (`UPLOAD_DIR=/data/uploads`), so they survive deploys and restarts.
- **Railway variables:** `NODE_ENV=production`, `PORT=8080`, `UPLOAD_DIR=/data/uploads`, `MONGO_URI`,
  `JWT_SECRET`, `CLIENT_URL` (the live address), `GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_ID`,
  `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (`rzp_test_…` for test payments, `rzp_live_…` to take real
  money after Razorpay KYC), plus any optional services above.
- **MongoDB Atlas** must allow connections from anywhere (`0.0.0.0/0`), because Railway's address changes.

To run it the same way on another host: build with `VITE_API_URL=/api npm run build`, set the variables
above and run `npm start`.

## Project layout

```
client/                    Website (React)
  src/pages/               Pages (home, design page, product + studio, cart, checkout, orders, seller, admin...)
  src/design/              Design studio: canvas, layers, settings, suggestions, export
  src/components/three/    3D: product models (uploaded .glb or built-in demo models), the 3D viewer,
                           placing designs on a model
  src/components/          Shared pieces (navbar, footer, 3D product gallery, sign-in layout,
                           address form, print-area editor...)
  src/context/             Login, cart, likes, on-page messages
  src/styles/              Design system (ui.css) and page layouts
  public/                  Favicons
server/                    API (Express)
  routes/                  API routes (auth, products, designs, orders, payments, admin, AI ideas)
  services/orders.js       Payment and order steps shared by routes, webhook and clean-up job
  models/                  Database models
  utils/                   Uploads (incl. .glb checks), email, payments, rate limits, login tokens
  scripts/                 Demo data and create-admin
  seed-assets/             Product photos used by the demo data
  tests/                   Server tests (node:test + temporary MongoDB)
.github/workflows/ci.yml   Tests and builds every push
railway.json               Railway build and start settings
```
