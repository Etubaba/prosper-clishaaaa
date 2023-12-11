const mysql = require('mysql2')
require('dotenv').config()

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  // port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
})

module.exports = pool.promise()

// let sql = "SELECT * FROM users;";
// pool.query(sql, (err, result) =>{
//     if(err) throw err
//     console.log(result);
// })
// const db = mysql.createConnection({
//     user: "kaywize",
//     host: "192.168.64.2",
//     port: "3306",
//     password: "kaywize",
//     database: "Xchange"
// });
