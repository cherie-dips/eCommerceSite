import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CustomizationPage() {
  const [selectedProduct, setSelectedProduct] = useState("tshirt");
  const [uploadedLogo, setUploadedLogo] = useState(null);
  const [position, setPosition] = useState("center");

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedLogo(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const productOptions = ["tshirt", "mug", "totebag"];
  const positionOptions = ["center", "left", "right", "top", "bottom"];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Customize Your Product</h2>

      <div className="mb-4">
        <label className="block mb-2 font-medium">Choose Product</label>
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="border p-2 rounded w-full"
        >
          {productOptions.map((product) => (
            <option key={product} value={product}>
              {product.charAt(0).toUpperCase() + product.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-medium">Upload Logo</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="w-full"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-medium">Select Logo Position</label>
        <select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          className="border p-2 rounded w-full"
        >
          {positionOptions.map((pos) => (
            <option key={pos} value={pos}>
              {pos.charAt(0).toUpperCase() + pos.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-medium">Preview</label>
        <div className="relative w-64 h-64 border bg-gray-100 flex items-center justify-center">
          <img
            src={`/${selectedProduct}.png`}
            alt="Product Preview"
            className="absolute w-full h-full object-contain"
          />
          {uploadedLogo && (
            <img
              src={uploadedLogo}
              alt="Logo Preview"
              className={`absolute w-16 h-16 object-contain ${position}-logo`}
            />
          )}
        </div>
      </div>

      <Button className="mt-4">Add to Cart</Button>
    </div>
  );
}