import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import Draggable from "react-draggable";
import html2canvas from "html2canvas";
import { useCart } from "../context/CartContext";
import "../styles/ProductDetails.css";

const DEFAULT_LOGO_SIZE = 120;

const ProductDetails = () => {
  const { id } = useParams();
  const { addToCart } = useCart();
  const previewRef = useRef(null);
  const logoNodeRef = useRef(null);

  const [product, setProduct] = useState(null);
  const [selectedAngle, setSelectedAngle] = useState("front");
  const [logo, setLogo] = useState(null);
  const [logoSize, setLogoSize] = useState(DEFAULT_LOGO_SIZE);
  const [customPosition, setCustomPosition] = useState(null);
  const [customerId] = useState("CUSTOMER123");
  const [orderId] = useState("ORDER" + Date.now());

  // Fetch product data
  useEffect(() => {
    axios
      .get(`http://localhost:5050/api/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch((err) => console.error("Error fetching product:", err));
  }, [id]);

  // Handle logo upload and center in preview
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const imgObjUrl = URL.createObjectURL(file);
      setLogo(imgObjUrl);

      setTimeout(() => {
        const container = previewRef.current;
        if (container) {
          const { clientWidth, clientHeight } = container;
          setCustomPosition({
            x: (clientWidth - logoSize) / 2,
            y: (clientHeight - logoSize) / 2,
          });
        }
      }, 100);
    } else if (file) {
      alert("Please upload a valid image file.");
    }
  };

  // Re-center if logo size changes (on first upload)
  useEffect(() => {
    if (logo && previewRef.current && customPosition == null) {
      const { clientWidth, clientHeight } = previewRef.current;
      setCustomPosition({
        x: (clientWidth - logoSize) / 2,
        y: (clientHeight - logoSize) / 2,
      });
    }
    // eslint-disable-next-line
  }, [logo, logoSize]);

  // "Save" (download and upload)
  const captureAndSave = async () => {
    const canvas = await html2canvas(previewRef.current, { useCORS: true });
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    const file = new File([blob], "customized-product.png", { type: "image/png" });

    // Download to user
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);

    // Upload to server
    const formData = new FormData();
    formData.append("productId", product._id);
    formData.append("customerId", customerId);
    formData.append("orderId", orderId);
    formData.append("image", file);

    await axios.post("http://localhost:5050/api/orders", formData);
  };

  // Only compose (for cart) -- no download or upload!
  const captureForCart = async () => {
    const canvas = await html2canvas(previewRef.current, { useCORS: true });
    return canvas.toDataURL("image/png");
  };

  // Add to cart handler -- no download
  const handleAddToCart = async () => {
    const compositeImage = await captureForCart();
    addToCart({
      ...product,
      image: compositeImage, // show the customized image in the cart
      customization: {
        logo,
        position: customPosition,
        size: logoSize,
        angle: selectedAngle,
        orderId,
        customerId,
      },
      quantity: 1,
    });
    alert("Customized product added to cart!");
  };

  if (!product) {
    return <div className="text-white text-center mt-10">Loading...</div>;
  }

  const angleImage = product.images?.[selectedAngle] || product.image;

  return (
    <div className="page-content">
      <div className="product-details-ui">
        {/* Sidebar left */}
        <div className="sidebar">
          <h2 className="section-title">Logo Tools</h2>
          <label className="upload-label">
            Upload Logo:
            <input type="file" accept="image/*" onChange={handleLogoUpload} />
          </label>
          {logo && (
            <div className="resize-slider">
              <label>Resize Logo:</label>
              <input
                type="range"
                min={40}
                max={300}
                value={logoSize}
                step={1}
                onChange={(e) => setLogoSize(Number(e.target.value))}
              />
            </div>
          )}
          <button className="save-button" onClick={captureAndSave}>
            Save
          </button>
        </div>

        {/* Central preview */}
        <div className="preview-container">
          <div ref={previewRef} className="image-preview">
            <img
              src={angleImage}
              crossOrigin="anonymous"
              alt="Product Preview"
              className="main-image"
            />
            {logo && customPosition && (
              <Draggable
                nodeRef={logoNodeRef}
                bounds="parent"
                position={customPosition}
                onStop={(e, data) =>
                  setCustomPosition({ x: data.x, y: data.y })
                }
              >
                <img
                  ref={logoNodeRef}
                  src={logo}
                  crossOrigin="anonymous"
                  alt="Logo"
                  className="draggable-logo"
                  style={{
                    width: `${logoSize}px`,
                    height: `${logoSize}px`
                  }}
                  draggable={false}
                />
              </Draggable>
            )}
          </div>

          {/* Angle selection */}
          <div className="angle-selector">
            {["front", "side", "back"].map((angle) => (
              <button
                key={angle}
                className={`angle-button ${
                  selectedAngle === angle ? "active" : ""
                }`}
                onClick={() => setSelectedAngle(angle)}
              >
                {angle.charAt(0).toUpperCase() + angle.slice(1)}
              </button>
            ))}
          </div>

          <button className="cart-button" onClick={handleAddToCart}>
            Add to Cart with Customization
          </button>
        </div>

        {/* Sidebar right */}
        <div className="sidebar">
          <div className="product-info-box">
            <h2 className="section-title">Product Info</h2>
            <p className="info-label">{product.name}</p>
            <p className="info-label">Price: ${product.price}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;