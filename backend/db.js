// Dev
// const mysql = require('mysql');
// Deployment
const mysql = require('mysql2/promise');
require('dotenv').config();

// Dev
// const connection = mysql.createConnection({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_DATABASE
// });
// Dev
// const connection = mysql.createConnection(process.env.DATABASE_URL);

// module.exports = connection;

// Deployment

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 5,
});

// pool.getConnection()
//   .then(connection => {
//     console.log("Successfully connected to JawsDB!");
//     connection.release();  // Release the connection back to the pool
//   })
//   .catch(err => {
//     console.error("Failed to connect to JawsDB:", err);
//   });

//   pool.on('acquire', () => {
//     console.log('Connection acquired from pool');
//   });
  
//   pool.on('release', () => {
//     console.log('Connection released back to pool');
//   });


module.exports = pool;