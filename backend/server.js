// Import required packages
const express = require('express');
const bcrypt = require('bcrypt');
const connection = require('./db');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const { authenticateToken } = require('./authMiddleware');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.API_SECRET,
});

// Connect to MySQL database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Middleware to parse JSON requests
app.use(cors());
app.use(express.json());

// User registration endpoint
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  // Check if username already exists
  connection.query(
    'SELECT * FROM user WHERE unique_username = ?',
    [username],
    (err, results) => {
      if (err) {
        console.error('Error checking username uniqueness:', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // If username already exists, return error
      if (results.length > 0) {
        res.status(400).json({ error: 'Username already exists' });
        return;
      }

      // Hash the password
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          console.error('Error hashing password:', err);
          res.status(500).json({ error: 'Internal server error' });
          return;
        }

        // Insert user into database
        connection.query(
          'INSERT INTO user (unique_username, password) VALUES (?, ?)',
          [username, hash],
          (err, result) => {
            if (err) {
              console.error('Error registering user:', err);
              res.status(500).json({ error: 'Internal server error' });
              return;
            }
            res.status(201).json({ message: 'User registered successfully' });
          }
        );
      });
    }
  );
});



// Handle POST request to create a new post
app.post('/api/posts/create', upload.single('media'), async (req, res) => {
  const { title, description, tags, token } = req.body;
  const media = req.file;

  try {
    // Validate form data (e.g., check if required fields are present)
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Extract username from the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const username = decodedToken.username;

    // Retrieve user UID and check admin status
    const [uidResult, isAdminResult] = await Promise.all([
      queryUserUid(username),
      queryUserAdminStatus(username)
    ]);

    const extractedUid = uidResult[0].uid;
    const isAdmin = isAdminResult[0].isAdmin === 1;

    // Check if user is admin
    if (!isAdmin) {
      return res.status(403).json({ error: 'You are not authorized to perform this action' });
    }

    let mediaUrl = null;
    if (media && media.path) {
      // Upload media file to Cloudinary
      const result = await uploadToCloudinary(media.path);
      mediaUrl = result.secure_url;
    }

    // Insert post data into MySQL database
    const postId = await insertPost(extractedUid, title, description, mediaUrl);

    // Insert tags into the blog_tag table
    await insertTags(postId, tags);

    return res.status(201).json({ message: 'Post created successfully' });
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

// Function to query user UID
const queryUserUid = (username) => {
  const uidSql = 'SELECT uid FROM user WHERE unique_username = ?';
  return new Promise((resolve, reject) => {
    connection.query(uidSql, [username], (err, result) => {
      if (err) {
        console.error('Error retrieving uid:', err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

// Function to query user admin status
const queryUserAdminStatus = (username) => {
  const isAdminSql = 'SELECT isAdmin FROM user WHERE unique_username = ?';
  return new Promise((resolve, reject) => {
    connection.query(isAdminSql, [username], (err, result) => {
      if (err) {
        console.error('Error checking user admin status:', err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

// Function to upload media file to Cloudinary
const uploadToCloudinary = (filePath) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(filePath, (error, result) => {
      if (error) {
        console.error('Error uploading media to Cloudinary:', error);
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

// Function to insert post data into MySQL database
const insertPost = (uid, title, description, mediaUrl) => {
  const postSql = mediaUrl ?
    'INSERT INTO blog (uid, title, description, media_url) VALUES (?, ?, ?, ?)' :
    'INSERT INTO blog (uid, title, description) VALUES (?, ?, ?)';
  const postValues = mediaUrl ?
    [uid, title, description, mediaUrl] :
    [uid, title, description];
  return new Promise((resolve, reject) => {
    connection.query(postSql, postValues, (err, result) => {
      if (err) {
        console.error('Error inserting post data into database:', err);
        reject(err);
      } else {
        resolve(result.insertId);
      }
    });
  });
};

// Function to insert tags into blog_tag table
function insertTags(blogId, tags) {
  return new Promise((resolve, reject) => {
    // Check if tags are provided
    if (tags) {
      // Convert tags to an array if it's a single tag
      // console.log(tags);
      const tagArray = Array.isArray(tags)
        ? tags
        : tags.split(',').map((tag) => tag.trim());
      // console.log(tagArray);
      // Query to check if tag exists and retrieve its tag_id or insert new tag
      const queries = tagArray.map((tagName) => {
        return new Promise((resolveQuery, rejectQuery) => {
          const selectSql = 'SELECT tag_id FROM tag WHERE tag_name = ?';
          connection.query(selectSql, [tagName], (selectErr, selectResult) => {
            if (selectErr) {
              rejectQuery(selectErr);
            } else if (selectResult.length > 0) {
              // Tag already exists, retrieve its tag_id
              resolveQuery(selectResult[0].tag_id);
            } else {
              // Tag does not exist, insert new tag and retrieve its tag_id
              const insertSql = 'INSERT INTO tag (tag_name) VALUES (?)';
              connection.query(
                insertSql,
                [tagName],
                (insertErr, insertResult) => {
                  if (insertErr) {
                    rejectQuery(insertErr);
                  } else {
                    resolveQuery(insertResult.insertId);
                  }
                }
              );
            }
          });
        });
      });

      // Resolve all queries and insert tag_id into blog_tag table
      Promise.all(queries)
        .then((tagIds) => {
          const tagInsertSql =
            'INSERT INTO blog_tag (blog_id, tag_id) VALUES ?';
          const tagValues = tagIds.map((tagId) => [blogId, tagId]);
          connection.query(
            tagInsertSql,
            [tagValues],
            (tagInsertErr, tagInsertResult) => {
              if (tagInsertErr) {
                reject(tagInsertErr);
              } else {
                resolve();
              }
            }
          );
        })
        .catch((error) => {
          reject(error);
        });
    } else {
      // No tags provided, resolve immediately
      resolve();
    }
  });
}

// User login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // Retrieve user from database
  connection.query(
    'SELECT * FROM user WHERE unique_username = ?',
    [username],
    (err, results) => {
      if (err) {
        console.error('Error retrieving user:', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      // Check if user exists
      if (results.length === 0) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Compare passwords
      bcrypt.compare(password, results[0].password, (err, result) => {
        if (err || !result) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }

        // User authenticated, generate token
        const token = jwt.sign({ username }, process.env.JWT_SECRET, {
          expiresIn: '1h',
        });
        res.status(200).json({ token });
      });
    }
  );
});

// Endpoint to verify token and determine if the user is an admin
app.post('/api/verify', (req, res) => {
  const { last_token } = req.body;

  if (!last_token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(last_token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { username } = decoded;

    // Query the database to get user roles and permissions
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

        // Send the isAdmin value to the client
        return res.status(200).json({ isAdmin });
      }
    );
  });
});

app.get('/api/dashboard', authenticateToken, (req, res) => {
  // Access the user data from the request object
  const { username } = req.user;

  // You can now use the username in your route logic
  res.json({ message: `Welcome to the dashboard, ${username}!` });
});



// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
