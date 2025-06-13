import { Link } from 'react-router-dom';

const ProductCard = ({ product }) => {
  return (
    <div className="border p-4 rounded shadow hover:shadow-lg transition">
      <img src={product.image} alt={product.name} className="h-48 w-full object-cover" />
      <h2 className="text-lg font-bold mt-2">{product.name}</h2>
      <p className="text-gray-700">${product.price}</p>
      <Link to={`/product/${product._id}`} className="text-blue-500 mt-2 inline-block">
        View Details
      </Link>
    </div>
  );
};

export default ProductCard;