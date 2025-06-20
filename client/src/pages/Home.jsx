import React from "react";

export default function Home() {
  return (
    <div className="page-content scrollable">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-text">
          <h1>Grow your business with us</h1>
          <button>Shop all</button>
        </div>
      </section>

      {/* Partner Logos */}
      <section className="partners">
        <div className="partner-row">
          {Array(6).fill("Insert partner logo").map((text, idx) => (
            <div className="partner-logo" key={idx}>{text}</div>
          ))}
        </div>
      </section>

      {/* Bestsellers */}
      <section className="products-section">
        <h2>Proven Bestsellers</h2>
        <div className="products">
          {/* Repeat this product-card */}
          {Array(5).fill(0).map((_, idx) => (
            <div className="product-card" key={idx}>
              <img src="/tshirt.png" alt="Example product" />
              <h3>Example product title</h3>
              <p>₹1,199</p>
            </div>
          ))}
        </div>
      </section>

      {/* Top Categories */}
      <section className="categories-section">
        <h2>Shop our top categories</h2>
        <div className="category-cards">
          {Array(5).fill("Your collection's name").map((text, idx) => (
            <div className="category-card" key={idx}>{text}</div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials-section">
        {Array(4).fill("Add a customer testimonial").map((text, idx) => (
          <div className="testimonial-card" key={idx}>{text}</div>
        ))}
      </section>

      {/* New Arrivals */}
      <section className="products-section">
        <h2>New Arrivals</h2>
        <div className="products">
          {Array(5).fill(0).map((_, idx) => (
            <div className="product-card" key={idx}>
              <img src="/tshirt.png" alt="Example product" />
              <h3>Example product title</h3>
              <p>₹1,199</p>
            </div>
          ))}
        </div>
      </section>

      {/* Educational Content */}
      <section className="education-section">
        <h2>You’re set up for success</h2>
        <div className="education-cards">
          {Array(4).fill("Add educational content").map((text, idx) => (
            <div className="education-card" key={idx}>
              <h4>{text}</h4>
              <p>Provide content for your customers here...</p>
              <a href="#">Read more →</a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}