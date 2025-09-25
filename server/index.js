const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path'); // ✅ Required to resolve file paths
const productRoutes = require('./routes/products');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// === Serve Static Customization Images ===
app.use(
  '/uploads/customizations',
  express.static(path.join(__dirname, '..', 'uploads', 'customizations'))
);

// 🔥 Mount routes
app.use('/api/products', productRoutes);
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
const retailerRoutes = require('./routes/retailer');
app.use('/api/retailer', retailerRoutes);

// Basic test route
app.get('/', (req, res) => {
  console.log('API is running...');
  res.send('API is running...\n');
});

// Start server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// DB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));