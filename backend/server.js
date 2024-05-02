// Import required packages
const express = require('express');
const bcrypt = require('bcrypt');
const connection = require('./db');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();
const {
  authenticateUserToken,
  authenticateAdminToken,
} = require('./authMiddleware');
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

// Submit contact form
app.post('/api/contact', (req, res) => {
  const { firstName, lastName, message } = req.body;
  const content = `${firstName} ${lastName} sent a message:
  ${message}`;

  const sql = 'INSERT INTO inbox (content, source_title) VALUES (?,?)';
  connection.query(sql, [content, 'Origin: Contact Form'], (err, result) => {
    if (err) {
      console.error('Error inserting into inbox table:', err);
      res.status(500).json({ error: 'Unable to submit message' });
      return;
    }
    console.log('Message submitted successfully');
    res.status(200).json({ message: 'Message submitted successfully' });
  });
});

// Handle POST request to create a new post
app.post('/api/posts/create', upload.single('media'), async (req, res) => {
  const { title, description, tags, token } = req.body;
  const media = req.file;

  try {
    // Validate form data (e.g., check if required fields are present)
    if (!title || !description) {
      return res
        .status(400)
        .json({ error: 'Title and description are required' });
    }

    // Extract username from the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const username = decodedToken.username;

    // Retrieve user UID and check admin status
    const [uidResult, isAdminResult] = await Promise.all([
      queryUserUid(username),
      queryUserAdminStatus(username),
    ]);

    const extractedUid = uidResult[0].uid;
    const isAdmin = isAdminResult[0].isAdmin === 1;

    // Check if user is admin
    if (!isAdmin) {
      return res
        .status(403)
        .json({ error: 'You are not authorized to perform this action' });
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
  const postSql = mediaUrl
    ? 'INSERT INTO blog (uid, title, description, media_url) VALUES (?, ?, ?, ?)'
    : 'INSERT INTO blog (uid, title, description) VALUES (?, ?, ?)';
  const postValues = mediaUrl
    ? [uid, title, description, mediaUrl]
    : [uid, title, description];
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

app.get('/api/dashboard', authenticateUserToken, (req, res) => {
  // Access the user data from the request object
  const { username } = req.user;

  // You can now use the username in your route logic
  res.json({ message: `Welcome to the dashboard, ${username}!` });
});

const getTagsForBlog = (blogId) => {
  return new Promise((resolve, reject) => {
    const sql =
      'SELECT tag.tag_id, tag.tag_name FROM blog_tag JOIN tag ON blog_tag.tag_id = tag.tag_id WHERE blog_tag.blog_id = ?';
    connection.query(sql, [blogId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        // console.log(results);
        resolve(results);
      }
    });
  });
};
app.get('/api/dashboard/blog', (req, res) => {
  const page = parseInt(req.query.page) || 1; // Current page number, default is 1
  const blogsPerPage = 6; // Number of blog posts per page
  const offset = (page - 1) * blogsPerPage;

  const sqlCount = 'SELECT COUNT(*) AS total FROM blog'; // Query to count total number of blogs
  const sql = 'SELECT * FROM blog ORDER BY datetime DESC LIMIT ? OFFSET ?';

  connection.query(sqlCount, (err, countResult) => {
    if (err) {
      console.error('Error counting blog posts:', err);
      res.status(500).json({ error: 'Unable to fetch blog posts' });
      return;
    }

    const totalBlogs = countResult[0].total; // Total number of blogs

    connection.query(sql, [blogsPerPage, offset], async (err, blogResults) => {
      if (err) {
        console.error('Error querying blog table:', err);
        res.status(500).json({ error: 'Unable to fetch blog posts' });
        return;
      }

      try {
        for (const blog of blogResults) {
          const tags = await getTagsForBlog(blog.blog_id);
          blog.tags = tags;
        }

        console.log('Blog posts fetched successfully');
        // console.log(blogResults);
        const responseObject = {
          listBlogs: blogResults,
          countBlogs: totalBlogs,
        };
        // console.log(responseObject);
        res.status(200).json(responseObject);
      } catch (error) {
        console.error('Error fetching tags for blog posts:', error);
        res.status(500).json({ error: 'Unable to fetch tags for blog posts' });
      }
    });
  });
});

app.get('/api/dashboard/inbox', authenticateAdminToken, (req, res) => {
  const { username, isAdmin } = req.user;
  const page = parseInt(req.query.page) || 1; // Current page number, default is 1
  const messagesPerPage = 10; // Number of messages per page

  // Calculate the offset to skip records based on the current page
  const offset = (page - 1) * messagesPerPage;

  const sqlCount = 'SELECT COUNT(*) AS total FROM inbox'; // Query to count total records
  connection.query(sqlCount, (err, countResult) => {
    if (err) {
      console.error('Error counting records in inbox table:', err);
      res.status(500).json({ error: 'Unable to fetch messages' });
      return;
    }
    const totalMessages = countResult[0].total; // Total count of messages

    const sql = 'SELECT * FROM inbox ORDER BY created_at DESC LIMIT ? OFFSET ?';
    connection.query(sql, [messagesPerPage, offset], (err, results) => {
      if (err) {
        console.error('Error querying inbox table:', err);
        res.status(500).json({ error: 'Unable to fetch messages' });
        return;
      }
      console.log('Messages fetched successfully');

      if (isAdmin === 0) {
        results.forEach((message) => {
          message.content = '*'.repeat(message.content.length);
        });
      }

      const responseObject = {
        listMessages: results, // Assuming `results` contains the messages
        countMessage: totalMessages, // Assuming `totalMessages` is the total count
      };
      res.status(200).json(responseObject);
    });
  });
});
// Function to delete blog tags associated with a blog
const deleteBlogTags = (blogId) => {
  return new Promise((resolve, reject) => {
    const deleteTagsQuery = 'DELETE FROM blog_tag WHERE blog_id = ?';
    connection.query(deleteTagsQuery, [blogId], (error, result) => {
      if (error) {
        console.error('Error deleting blog tags:', error);
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

// Delete blog endpoint
app.delete('/api/blogs/:blogId', authenticateAdminToken, async (req, res) => {
  const { isAdmin } = req.user;
  const blogId = req.params.blogId;

  // Check if the user is an admin
  if (isAdmin === 1) {
    try {
      // Delete blog tags first
      await deleteBlogTags(blogId);

      // Get the media URL of the blog
      const getMediaUrlQuery = 'SELECT media_url FROM blog WHERE blog_id = ?';
      connection.query(getMediaUrlQuery, [blogId], async (error, results) => {
        if (error) {
          console.error('Error fetching media URL:', error);
          res.status(500).json({ error: 'Failed to delete blog' });
          return;
        }

        // If media URL exists, delete the image from Cloudinary
        const mediaUrl = results[0].media_url;
        if (mediaUrl) {
          // Extract the public ID from the Cloudinary URL
          const publicId = mediaUrl.split('/').pop().split('.')[0];

          // Delete the image using the public ID
          try {
            await cloudinary.uploader.destroy(publicId);
          } catch (cloudinaryError) {
            console.error(
              'Error deleting image from Cloudinary:',
              cloudinaryError
            );
            res.status(500).json({ error: 'Failed to delete blog' });
            return;
          }
        }

        // Once image is deleted from Cloudinary or if no image exists, delete the blog record
        const deleteBlogQuery = 'DELETE FROM blog WHERE blog_id = ?';
        connection.query(
          deleteBlogQuery,
          [blogId],
          (deleteError, deleteResult) => {
            if (deleteError) {
              console.error('Error deleting blog:', deleteError);
              res.status(500).json({ error: 'Failed to delete blog' });
              return;
            }

            console.log('Blog deleted successfully.');
            // Send a success status without any content
            res.sendStatus(204);
          }
        );
      });
    } catch (error) {
      console.error('Error deleting blog tags:', error);
      res.status(500).json({ error: 'Failed to delete blog' });
    }
  } else {
    // If the user is not an admin, return an unauthorized status
    res
      .status(403)
      .json({ error: 'Unauthorized: Only admins can delete blogs' });
  }
});

app.delete('/api/messages/:messageId', authenticateAdminToken, (req, res) => {
  const { isAdmin } = req.user;
  const messageId = req.params.messageId;

  // Check if the user is an admin
  if (isAdmin === 1) {
    // Implement logic to delete the message with the given messageId from the database
    const sql = 'DELETE FROM inbox WHERE inbox_id = ?';
    connection.query(sql, [messageId], (err, result) => {
      if (err) {
        console.error('Error deleting message:', err);
        res.status(500).json({ error: 'Failed to delete message' });
        return;
      }

      console.log('Message deleted successfully.');
      res.sendStatus(204); // Send a success status without any content
    });
  } else {
    // If the user is not an admin, return an unauthorized status
    res
      .status(403)
      .json({ error: 'Unauthorized: Only admins can delete messages' });
  }
});
// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
