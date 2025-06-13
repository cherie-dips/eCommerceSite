const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// 🔥 Mount your auth routes here
const authRoutes = require('./routes/auth'); // 👈 adjust path if needed
app.use('/api/auth', authRoutes);            // 👈 mounts /register at /api/auth/register

// Basic test route
app.get('/', (req, res) => {
    console.log('API is running...');
    res.send('API is running...\n');
});

// Start server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// DB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error(err));
