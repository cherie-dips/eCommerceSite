import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import heroVideo from "../assets/hero.mp4";
import showcaseMugs from "../assets/showcase-mugs.jpg";
import showcaseTote from "../assets/showcase-tote.jpg";
import ProductCard from "../components/ProductCard";
import api from "../utils/api";
import "../styles/Home.css";

const CATEGORIES = [
  ["Apparel", "T-shirts & hoodies"],
  ["Drinkware", "Mugs & bottles"],
  ["Bags", "Totes & backpacks"],
  ["Stationery", "Notebooks & pens"],
  ["Office Kits", "Onboarding kits"],
];

const STEPS = [
  ["1", "Pick a product", "Mugs, T-shirts, tote bags, notebooks and more."],
  ["2", "Add your logo or photo", "Get 3 instant design ideas, then fine-tune text, colours and layout."],
  ["3", "Preview and order", "See it on the product (in 3D for mugs). We print and deliver it."],
];

export default function Home() {
  const [popular, setPopular] = useState([]);
  const [newest, setNewest] = useState([]);

  useEffect(() => {
    api
      .get("/products", { params: { sort: "popular", limit: 8 } })
      .then((res) => setPopular(res.data.products))
      .catch((err) => console.error("Error fetching products:", err));
    api
      .get("/products", { params: { sort: "newest", limit: 4 } })
      .then((res) => setNewest(res.data.products))
      .catch(() => {});
  }, []);

  return (
    <div className="page-content-main scrollable">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-video-wrap">
          <video
            className="hero-video"
            src={heroVideo}
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
        <div className="hero-text">
          <h1>Make Your Brand Unforgettable</h1>
          <p className="hero-sub">Design custom merch in minutes: upload your logo, pick a suggested layout, and order.</p>
          <Link to="/customize" className="hero-button">
            Start Designing
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="steps-section">
        {STEPS.map(([n, title, text]) => (
          <div className="step-card" key={n}>
            <span className="step-number">{n}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>

      {/* Most Loved Products */}
      {popular.length > 0 && (
        <section className="products-section">
          <h2>Most Loved Products In Corporate</h2>
          <div className="products-grid">
            {popular.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Top Categories */}
      <section className="categories-section">
        <h2>Custom Product Categories</h2>
        <div className="category-cards">
          {CATEGORIES.map(([category, hint]) => (
            <Link to={`/products?category=${encodeURIComponent(category)}`} className="category-card" key={category}>
              <strong>{category}</strong>
              <span>{hint}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Showcase */}
      <section className="showcase-section">
        <div className="showcase-text">
          <h2>Your logo, on everything</h2>
          <p>From team mugs to event totes, every order is printed with your design and checked before it ships.</p>
          <Link to="/products" className="btn btn-primary">Browse products</Link>
        </div>
        <img src={showcaseMugs} alt="Branded mugs" loading="lazy" />
        <img src={showcaseTote} alt="Branded tote bag" loading="lazy" />
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        {[
          "“Flagzen made our onboarding kits stand out!”",
          "“Excellent quality, seamless delivery.”",
          "“A branding game-changer for our events.”",
          "“Highly recommend for B2B merch!”"
        ].map((text, idx) => (
          <div className="testimonial-card" key={idx}>{text}</div>
        ))}
      </section>

      {/* New Arrivals */}
      {newest.length > 0 && (
        <section className="products-section">
          <h2>Fresh Merch, Hot Off the Press</h2>
          <div className="products-grid">
            {newest.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Educational Content */}
      <section className="education-section">
        <h2>Merch Strategy That Works</h2>
        <div className="education-cards">
          {[
            "How Custom Swag Elevates Your Brand",
            "The Psychology Behind Corporate Gifting",
            "Streamline Employee Onboarding with Kits"
          ].map((title, idx) => (
            <div className="education-card" key={idx}>
              <h4>{title}</h4>
              <p>
                Insights, trends, and strategies for building stronger brand presence through customized merchandise.
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
