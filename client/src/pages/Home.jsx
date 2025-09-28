import React from "react";
import heroVideo from "../assets/hero.mov";
import mug from "../assets/mug.png";
import totebag from "../assets/totebag.png";
import { AiFillHeart } from "react-icons/ai";
import { FaCartPlus } from "react-icons/fa";
import "../styles/Home.css";

export default function Home() {
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
          <button className="hero-button">Start Customizing</button>
        </div>
      </section>

      {/* Most Loved Products */}
      <section className="products-section">
        <h2>Most Loved Products In Corporate</h2>
        <div className="products-grid">
          {Array(8).fill(0).map((_, idx) => (
            <div className="product-card" key={`mug-${idx}`}>

              <div className="pc-imgwrap">
                <img src={mug} alt="Branded Mug" className="pc-img" />
              </div>

              <h3 className="pc-name">Branded Mug</h3>
              <p className="pc-price">Starting at ₹1,199</p>

              <div className="pc-actions">
                <button className="pc-action-btn" aria-label="Like">
                  <AiFillHeart className="pc-action-icon liked" />
                </button>
                <button className="pc-action-btn" aria-label="Add to cart">
                  <FaCartPlus className="pc-action-icon" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Categories */}
      <section className="categories-section">
        <h2>Custom Product Categories</h2>
        <div className="category-cards">
          {["Apparel", "Drinkware", "Office Kits", "Tech Gadgets", "T-shirts"].map((text, idx) => (
            <div className="category-card" key={idx}>{text}</div>
          ))}
        </div>
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
      <section className="products-section">
        <h2>Fresh Merch, Hot Off the Press</h2>
        <div className="products-grid">
          {Array(4).fill(0).map((_, idx) => (
            <div className="product-card" key={`totebag-${idx}`}>
              <div className="pc-imgwrap">
                <img src={totebag} alt="Eco Tote Bag" className="pc-img" />
              </div>

              <h3 className="pc-name">Eco Tote Bag</h3>
              <p className="pc-price">₹849</p>

              <div className="pc-actions">
                <button className="pc-action-btn" aria-label="Like">
                  <AiFillHeart className="pc-action-icon liked" />
                </button>
                <button className="pc-action-btn" aria-label="Add to cart">
                  <FaCartPlus className="pc-action-icon" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

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
              <a href="#">Read more →</a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}