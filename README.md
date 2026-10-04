# Flagzen

An online store for custom-branded merchandise (mugs, T-shirts, tote bags, notebooks and more) with a
built-in **design studio**: customers upload their logo or photo, pick one of the suggested layouts,
fine-tune it, preview it (in 3D for mugs) and order. Sellers receive print-ready files with every order.

The plan for taking this to real customers is in [docs/ROADMAP.md](docs/ROADMAP.md).

## What it does

**Customers**
- Browse, search and filter products; like products; read and write reviews.
- **Design studio** on every customisable product:
  - Upload photos and logos, add text (8 fonts, colours, outline, spacing) and shapes.
  - Move, resize and rotate everything; undo/redo; layers (order, lock, hide); front and back sides.
  - **3 instant design ideas** after an upload, based on the logo/photo's colours and shape.
  - **AI design ideas** (optional) from Claude, when the server has an Anthropic API key.
  - Print-quality warning when an image is too small for its printed size.
  - Live **3D preview** for mugs, and a separate 3D logo lab.
  - Unfinished designs are kept in the browser (survive a refresh or logging in).
- Cart with saved addresses and discount codes; checkout with **Razorpay** (UPI, cards, net banking, wallets).
- My Orders (status steps, courier tracking, cancel with automatic refund), My Designs, Profile.
- Sign up with email or Google, confirm email, reset forgotten password.

**Sellers**
- Add/edit products with photos for each side, and mark where designs can be printed (drag a box on the photo).
- Stock levels, sales numbers, remove/restore products.
- Orders: download print files (300 DPI PNG, transparent background), mark "being made", ship with courier + tracking ID, mark delivered, cancel (customer is refunded).
- New seller accounts wait for admin approval.

**Admins**
- Store totals, approve sellers, change user roles, hide products, see every order.

## How it's built

| Part | Technology |
| --- | --- |
| Website (`client/`) | React 19 + Vite, React Router, Konva (2D design editor), three.js / react-three-fiber (3D) |
| Server (`server/`) | Node.js + Express 5, MongoDB (Mongoose), JWT login, Multer uploads |
| Payments | Razorpay (test mode without keys) |
| Email | Any SMTP service via Nodemailer (printed in the console without settings) |
| AI ideas | Anthropic Claude API (optional) |

## Getting started

You need **Node.js 20+** and a **MongoDB** database (a free MongoDB Atlas cluster works).

```bash
# 1. Install everything
npm run install:all

# 2. Settings: copy the examples and fill them in
cp server/.env.example server/.env      # at least MONGO_URI and JWT_SECRET
cp client/.env.example client/.env      # optional

# 3. Demo data: a demo seller and 4 ready-to-design products
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
| **Razorpay payments** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (+ `RAZORPAY_WEBHOOK_SECRET`) from the [Razorpay dashboard](https://dashboard.razorpay.com/app/keys). Add a webhook to `https://<server>/api/payments/razorpay/webhook` for `payment.captured` and `order.paid`. | Checkout runs in test mode: orders are marked paid without taking money. |
| **Email** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (e.g. Resend, Brevo, Amazon SES) | Emails (confirmation links, reset links, order updates) are printed in the server console. |
| **Google sign-in** | `GOOGLE_CLIENT_ID` (server) and `VITE_GOOGLE_CLIENT_ID` (client). Add every website address you use (e.g. `http://localhost:5173`, your live domain) as an *Authorized JavaScript origin* in Google Cloud. | The Google button doesn't work; email sign-up still does. |
| **AI design ideas** | `ANTHROPIC_API_KEY` from the [Anthropic console](https://console.anthropic.com). `AI_SUGGESTIONS_PER_HOUR` limits requests per user (default 10). Each request costs a few US cents. | Only the free "smart template" ideas are shown. |

## Commands (run from the project folder)

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the server and the website |
| `npm test` | Runs the server tests (uses a temporary database, never yours) |
| `npm run lint` | Checks the website code |
| `npm run build` | Builds the website for going live |
| `npm start` | Starts the server (in production it also hosts the built website) |
| `npm run seed` | Adds the demo seller and demo products |
| `npm run create-admin -- <email> <password> [name]` | Creates an admin, or makes an existing account an admin |

## Going live (one server)

1. Build the website so it talks to the same server: `VITE_API_URL=/api npm run build`
2. On the server set `NODE_ENV=production`, `CLIENT_URL=https://your-domain`, and the other settings.
3. `npm start`. The server hosts the website, the API and uploaded files.

Uploaded files are stored in `server/uploads/`. On hosts that wipe the disk on every deploy, use a
persistent disk (or move uploads to cloud storage; see the roadmap).

## Project layout

```
client/                 Website (React)
  src/design/           Design studio: canvas, layers, settings, suggestions, export, 3D preview
  src/pages/            Pages (shop, cart, checkout, orders, seller, admin...)
  src/components/       Shared pieces (navbar, product card, address form, print-area editor...)
  src/context/          Login, cart, likes, on-page messages
  public/models/        3D models
server/                 API (Express)
  routes/               API routes (auth, products, designs, orders, payments, admin, AI ideas)
  services/orders.js    Payment and order steps shared by routes, webhook and clean-up job
  models/               Database models
  utils/                Uploads, email, payments, rate limits, login tokens
  scripts/              Demo data and create-admin
  seed-assets/          Blank product photos used by the demo data
  tests/                Server tests (node:test + temporary MongoDB)
docs/ROADMAP.md         Plan for launching to real customers
```
