const mysql = require('mysql2')
require('dotenv').config()

module.exports = {
  host:  process.env.DB_HOST,
  dialect:  process.env.DIALECT,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password:  process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,

  pool: {
    max: 5,
    min: 0,
    acquire: 4 * 30000, 
    idle: 10000,
  },
}