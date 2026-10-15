import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PiArrowRight, PiCube, PiMagicWand, PiPrinter, PiArrowsLeftRight, PiFloppyDisk, PiCreditCard } from "react-icons/pi";
import api from "../utils/api";
import ProductGallery from "../components/ProductGallery";
import "../styles/Home.css";

const ProductViewer = lazy(() => import("../components/three/ProductViewer"));

// Products in the hero's 3D preview (the demo products' built-in models)
const HERO_PRODUCTS = [
  ["tshirt", "T-shirt"],
  ["mug", "Mug"],
  ["tote", "Tote"],
  ["cap", "Cap"],
  ["bottle", "Bottle"],
];

const MARQUEE = ["T-shirts", "Mugs", "Tote bags", "Notebooks", "Caps", "Water bottles", "Phone cases", "Mouse pads"];

const STEPS = [
  ["01", "Pick a product", "T-shirts, mugs, totes and more. Every one is a 3D model you can turn around before you start."],
  ["02", "Make it yours", "Upload your logo or photo and get layouts that match its colours and shape. Then fine-tune text, colour and position."],
  ["03", "See it, then order", "Check your design on the 3D product, pay securely, and it's printed from a print-ready file."],
];

// A sample "your logo" badge printed on the hero product
async function sampleLogo() {
  await Promise.all([
    document.fonts?.load('italic 150px "Instrument Serif"'),
    document.fonts?.load('500 58px "Geist Mono"'),
  ]).catch(() => {});
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#131316";
  ctx.beginPath();
  ctx.arc(256, 256, 248, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d8f54a";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(256, 256, 214, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = 'italic 150px "Instrument Serif", Georgia, serif';
  ctx.fillText("your", 256, 226);
  ctx.fillStyle = "#d8f54a";
  ctx.font = '500 58px "Geist Mono", monospace';
  ctx.fillText("L O G O", 256, 330);
  return canvas.toDataURL("image/png");
}

export default function Home() {
  const [heroKey, setHeroKey] = useState("tshirt");
  const [logo, setLogo] = useState(null);
  const [popular, setPopular] = useState([]);

  useEffect(() => {
    sampleLogo().then(setLogo);
    api
      .get("/products", { params: { sort: "popular", limit: 4 } })
      .then((res) => setPopular(res.data.products))
      .catch(() => {});
  }, []);

  return (
    <div className="home">
      {/* ---------- Hero ---------- */}
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">3D merch studio</span>
          <h1 className="display">
            Your brand,
            <br />
            <em>in every</em> dimension.
          </h1>
          <p className="hero-lead">
            Put your logo on T-shirts, mugs, totes and more. Turn the product around in 3D, see your design on it,
            and order it printed.
          </p>
          <div className="hero-ctas">
            <Link to="/customize" className="btn btn-primary btn-lg">
              Start designing <PiArrowRight className="arrow" />
            </Link>
            <a href="#how-it-works" className="btn btn-secondary btn-lg">How it works</a>
          </div>
          <ul className="hero-facts">
            <li>Live 3D preview</li>
            <li>Print-ready files</li>
            <li>UPI, cards &amp; wallets</li>
          </ul>
        </div>

        <div className="hero-stage">
          <span className="hero-label hero-label-left"><i /> Live 3D preview</span>
          <span className="hero-label hero-label-right">Drag to rotate</span>
          <Suspense fallback={<div className="spinner" />}>
            <ProductViewer
              product={{ model3d: heroKey }}
              designs={logo ? { front: logo } : undefined}
              autoRotate
              zoom={false}
              height="100%"
              className="hero-viewer"
            />
          </Suspense>
          <div className="hero-switch glass" role="group" aria-label="Preview product">
            {HERO_PRODUCTS.map(([key, label]) => (
              <button key={key} className={key === heroKey ? "active" : ""} onClick={() => setHeroKey(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Product marquee ---------- */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span key={i}>
              {item} <b>✦</b>
            </span>
          ))}
        </div>
      </div>

      {/* ---------- How it works ---------- */}
      <section className="home-section" id="how-it-works">
        <div className="section-head">
          <span className="eyebrow">How it works</span>
          <h2 className="display">From logo to doorstep in <em>three steps.</em></h2>
        </div>
        <div className="steps">
          {STEPS.map(([n, title, text]) => (
            <article className="step" key={n}>
              <span className="step-n">{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- Collection preview ---------- */}
      {popular.length > 0 && (
        <section className="home-section">
          <div className="section-head section-head-row">
            <div>
              <span className="eyebrow">The collection</span>
              <h2 className="display">Made to be <em>customised.</em></h2>
            </div>
            <Link to="/customize" className="btn btn-secondary">
              See all products <PiArrowRight className="arrow" />
            </Link>
          </div>
          <ProductGallery products={popular} />
        </section>
      )}

      {/* ---------- Features ---------- */}
      <section className="home-section">
        <div className="section-head">
          <span className="eyebrow">Inside the studio</span>
          <h2 className="display">Everything you need to <em>get it right.</em></h2>
        </div>
        <div className="bento">
          <article className="tile tile-dark tile-wide">
            <PiMagicWand className="tile-icon" />
            <h3>Ideas from your logo</h3>
            <p>Upload a logo and get layouts that match its colours and shape in a second. Pick one, then change anything.</p>
          </article>
          <article className="tile tile-studio">
            <PiCube className="tile-icon" />
            <h3>See it in 3D</h3>
            <p>Switch to 3D view to see your front and back designs on the real product.</p>
          </article>
          <article className="tile">
            <PiPrinter className="tile-icon" />
            <h3>Print-ready, every time</h3>
            <p>High-resolution print files go to the seller with every order. You're warned if an image is too small to print sharply.</p>
          </article>
          <article className="tile">
            <PiArrowsLeftRight className="tile-icon" />
            <h3>Front and back</h3>
            <p>Design both sides of products that print on both.</p>
          </article>
          <article className="tile">
            <PiFloppyDisk className="tile-icon" />
            <h3>Saved as you go</h3>
            <p>Unfinished designs are kept in your browser, and saved designs live in your account.</p>
          </article>
          <article className="tile tile-accent tile-full">
            <PiCreditCard className="tile-icon" />
            <div>
              <h3>Pay your way</h3>
              <p>UPI, cards, net banking and wallets through Razorpay, with refunds handled for you if an order is cancelled.</p>
            </div>
            <span className="tile-tags">UPI · Cards · Net banking · Wallets</span>
          </article>
        </div>
      </section>

      {/* ---------- Call to action ---------- */}
      <section className="home-cta">
        <h2 className="display">
          Your logo looks better <em>in 3D.</em>
        </h2>
        <Link to="/customize" className="btn btn-accent btn-lg">
          Start designing <PiArrowRight className="arrow" />
        </Link>
      </section>
    </div>
  );
}
