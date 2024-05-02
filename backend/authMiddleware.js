const jwt = require('jsonwebtoken');
require('dotenv').config();
const connection = require('./db');

// not in usse
const authenticateUserToken = (req, res, next) => {
  const token =
    req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden
    req.user = user;
    next();
  });
};

function authenticateAdminToken(req, res, next) {
  // Extract the authorization header
  const authHeader = req.headers['authorization'];

  // Check if the authorization header exists and has a valid format
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // Extract the token from the header
      const token = authHeader.substring(7); // Remove 'Bearer ' from the beginning

      // Verify the token
      jwt.verify(token, process.env.JWT_SECRET, async (err, decodedToken) => {
        if (err) {
          // If token verification fails, send a 403 Forbidden response
          console.error('Token verification failed:', err);
          return res.sendStatus(403);
        }
        // If token is valid, extract user details from the decoded token
        const { username } = decodedToken;

        // Query the database to get user role
        connection.query(
          'SELECT isAdmin FROM user WHERE unique_username = ?',
          [username],
          (err, results) => {
            if (err) {
              console.error('Error fetching user data:', err);
              return res.status(500).json({ error: 'Internal server error' });
            }

            if (results.length === 0) {
              return res.status(403).json({ error: 'Forbidden' });
            }

            const isAdmin = results[0].isAdmin;
            req.user = { username, isAdmin };

            // Call next middleware or route handler
            next();
          }
        );
      });
    } catch (error) {
      console.error('Error authenticating token:', error);
      // If an error occurs, send a 500 Internal Server Error response
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } else {
    // If authorization header is missing or has invalid format, send a 401 Unauthorized response
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }
}

module.exports = { authenticateUserToken, authenticateAdminToken };
