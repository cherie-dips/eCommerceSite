import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import api from "../utils/api";
import "../styles/Product.css";

const SORTS = [
  ["newest", "Newest"],
  ["popular", "Most popular"],
  ["rating", "Top rated"],
  ["price_asc", "Price: low to high"],
  ["price_desc", "Price: high to low"],
];

export default function Products() {
  // Search settings live in the address bar, so results can be shared and the back button works
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const sort = params.get("sort") || "newest";
  const page = Number(params.get("page")) || 1;

  const [searchInput, setSearchInput] = useState(search);
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState({ products: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    if (!("page" in changes)) next.delete("page");
    setParams(next);
  };

  useEffect(() => {
    api.get("/products/categories").then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  useEffect(() => setSearchInput(search), [search]);

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get("/products", { params: { search, category, sort, page, limit: 12 } })
      .then((res) => setResult(res.data))
      .catch(() => setError("Couldn't load products. Please try again."))
      .finally(() => setLoading(false));
  }, [search, category, sort, page]);

  return (
    <div className="page products-page">
      <div className="page-header">
        <div>
          <h1>{category || "All Products"}</h1>
          <p>{loading ? "Loading..." : `${result.total} product${result.total === 1 ? "" : "s"}`}</p>
        </div>
      </div>

      <div className="product-filters">
        <form
          className="product-search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ search: searchInput.trim() });
          }}
        >
          <input
            className="input"
            type="search"
            placeholder="Search mugs, T-shirts, bags..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button className="btn btn-primary">Search</button>
        </form>
        <select className="select" value={category} onChange={(e) => update({ category: e.target.value })} aria-label="Category">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select className="select" value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort by">
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {error && <div className="notice notice-danger">{error}</div>}
      {loading ? (
        <div className="spinner" />
      ) : result.products.length === 0 ? (
        <div className="empty">
          <h3>No products found</h3>
          <p>Try a different search or category.</p>
          {(search || category) && (
            <button className="btn btn-secondary" onClick={() => setParams({})}>Clear filters</button>
          )}
        </div>
      ) : (
        <div className="products-grid">
          {result.products.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      )}

      {result.pages > 1 && (
        <div className="pagination">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>← Previous</button>
          {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
            <button key={n} className={`btn btn-sm ${n === page ? "btn-primary" : "btn-secondary"}`} onClick={() => update({ page: String(n) })}>{n}</button>
          ))}
          <button className="btn btn-secondary btn-sm" disabled={page >= result.pages} onClick={() => update({ page: String(page + 1) })}>Next →</button>
        </div>
      )}
    </div>
  );
}
