const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'event_management',  // Use your existing 'e-commerce' or create new
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '#Mony221002795',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false,  // Set to true to see SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);
// Optional: test connection
sequelize.authenticate()
    .then(() => console.log("✅ MySQL connected successfully via Sequelize."))
    .catch(err => console.error("❌ MySQL connection failed:", err));

module.exports = sequelize;