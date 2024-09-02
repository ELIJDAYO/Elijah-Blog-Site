// Import required packages
const express = require('express');
const bcrypt = require('bcrypt');
const cluster = require('cluster');
const os = require('os'); // To get the number of CPU cores

// Dev
const pool = require('./db');

//Production
// const mysql = require('mysql2/promise');
// let pool;
require('dotenv').config();

const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();
const {
  authenticateUserToken,
  authenticateAdminToken,
} = require('./authMiddleware');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { v4: uuidv4 } = require('uuid'); // Import the uuid library

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

//deleting the contents of uploads after image file/s have been updated
const fs = require('fs');
const path = require('path');
const uploadsFolder = 'uploads';

// Function to delete the contents of the uploads folder
const deleteUploadsFolderContents = () => {
  fs.readdir(uploadsFolder, (err, files) => {
    if (err) {
      console.error('Error reading uploads folder:', err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(uploadsFolder, file);
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error('Error deleting file:', filePath, err);
        } else {
          console.log('File deleted:', filePath);
        }
      });
    });
  });
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.API_SECRET,
});

// Check if the current process is the master process
if (cluster.isMaster) {
  // Get the number of CPU cores
  const numCPUs = os.cpus().length;

  console.log(`Master ${process.pid} is running`);

  // Fork workers (create worker processes)
  for (let i = 0; i < 2; i++) {
    cluster.fork();
  }

  // Listen for dying workers and restart them if necessary
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    console.log('Starting a new worker');
    cluster.fork();
  });
} else {
  (async () => {
    console.log(`Worker ${process.pid} is running`);

    try {
      // Try to get a connection from the pool
      const connection = await pool.getConnection();
      console.log('Check if remote DB is connected');
      connection.release(); // Release the connection back to the pool
      console.log('Connected to the database');
    } catch (err) {
      console.error('Error connecting to the database:', err);
    }

    const corsOptions = {
      origin: process.env.CORS_ORIGIN,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'UPDATE'], // Include UPDATE method
    };
    
    // Middleware to parse JSON requests
    app.use(cors(corsOptions));
    app.use(express.json());
    // Deploy
    // Serve the static files from the React app
    app.use(express.static(path.join(__dirname, 'build')));
    // app.use(express.static('build'))
    // app.options('/api/posts/update', cors(corsOptions));

    app.get('/api/blog', async (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const blogsPerPage = 6;
      const offset = (page - 1) * blogsPerPage;
      const searchQuery = req.query.search || '';

      const sqlCount = `
        SELECT COUNT(*) AS total 
        FROM blog 
        WHERE title LIKE ? OR description LIKE ? 
      `;
      const sql = `
        SELECT * FROM blog 
        WHERE title LIKE ? OR description LIKE ? 
        ORDER BY datetime DESC 
        LIMIT ? OFFSET ?
      `;
      const likeSearchQuery = `%${searchQuery}%`;

      try {
        connection = await pool.getConnection();

        // Count the total number of blogs
        const [countResult] = await connection.query(sqlCount, [
          likeSearchQuery,
          likeSearchQuery,
        ]);
        var totalBlogs = countResult[0].total;
        if (totalBlogs === 0)
          totalBlogs = 1;

        // Query the blog posts
        const [blogResults] = await connection.query(sql, [
          likeSearchQuery,
          likeSearchQuery,
          blogsPerPage,
          offset,
        ]);

        // Process blog results to include tags
        const blogsWithTags = await Promise.all(
          blogResults.map(async (blog) => {
            try {
              const tags = await getTagsForBlog(blog.blog_id);
              blog.tags = tags;
            } catch (tagError) {
              console.error('Error fetching tags for blog:', tagError);
              blog.tags = [];
            }
            return blog;
          })
        );

        const responseObject = {
          listBlogs: blogsWithTags,
          countBlogs: totalBlogs,
        };

        res.status(200).json(responseObject);
      } catch (error) {
        console.error('Error handling request:', error);
        res.status(500).json({ error: 'Unable to fetch blog posts' });
      } finally {
        if (connection) connection.release();
      }
    });

    app.post('/api/track-visit', async (req, res) => {
      const { uniqueId } = req.body;
      const today = new Date().toISOString().split('T')[0];

      try {
        connection = await pool.getConnection();

        // Perform the insert or update operation
        await connection.query(
          'INSERT INTO visits (unique_id, date) VALUES (?, ?) ON DUPLICATE KEY UPDATE date = ?',
          [uniqueId, today, today]
        );

        res.status(200).json({ message: 'Visit recorded' });
      } catch (err) {
        console.error('Error handling request:', err);
        res.status(500).json({ error: 'Unable to record visit' });
      } finally {
        if (connection) connection.release();
      }
    });

    // API Routes
    app.get('/api/stats', async (req, res) => {
      const today = new Date().toISOString().split('T')[0];

      try {
        const connection = await pool.getConnection();
        const [uniqueUsersResult] = await connection.query(
          'SELECT COUNT(DISTINCT unique_id) AS unique_users FROM visits WHERE DATE(date) = ?',
          [today]
        );
        const uniqueUsers = uniqueUsersResult[0].unique_users;

        const [totalVisitsResult] = await connection.query(
          'SELECT COUNT(*) AS total_visits FROM visits'
        );
        connection.release();
        res.status(200).json({
          unique_users: uniqueUsers,
          total_visits: totalVisitsResult[0].total_visits,
        });
      } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'Unable to fetch stats' });
      }
    });

    app.post('/api/register', async (req, res) => {
      const { username, password } = req.body;

      try {
        connection = await pool.getConnection();

        // Check if username already exists
        const [results] = await connection.query(
          'SELECT * FROM user WHERE unique_username = ?',
          [username]
        );

        if (results.length > 0) {
          res.status(400).json({ error: 'Username already exists' });
          return;
        }

        // Hash the password
        const hash = await bcrypt.hash(password, 10);

        // Insert user into the database
        await connection.query(
          'INSERT INTO user (unique_username, password) VALUES (?, ?)',
          [username, hash]
        );

        res.status(201).json({ message: 'User registered successfully' });
      } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Internal server error' });
      } finally {
        if (connection) connection.release();
      }
    });

    app.post('/api/contact', async (req, res) => {
      const { firstName, lastName, message } = req.body;
      const content = `${firstName} ${lastName} sent a message:\n${message}`;

      const sql = 'INSERT INTO inbox (content, source_title) VALUES (?,?)';

      try {
        connection = await pool.getConnection();

        // Execute the query
        await connection.query(sql, [content, 'Origin: Contact Form']);

        res.status(200).json({ message: 'Message submitted successfully' });
      } catch (err) {
        console.error('Error handling contact form submission:', err);

        if (err.code === 'POOL_CON_ERROR') {
          res.status(500).json({ error: 'Database connection error' });
        } else {
          res.status(500).json({ error: 'Unable to submit message' });
        }
      } finally {
        if (connection) connection.release();
      }
    });

    const getMediaUrl = async (blog_id) => {
      const sql = 'SELECT media_url FROM blog WHERE blog_id = ?';

      try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(sql, [blog_id]);
        connection.release();
        return result;
      } catch (err) {
        console.error('Error fetching media_url from database:', err);
        throw err;
      }
    };

    const deleteCloudinary = async (currentMediaUrl) => {
      // Extract the public_id from the currentMediaUrl
      const publicId = currentMediaUrl.split('/').pop().split('.')[0]; // Assuming the URL structure is consistent

      try {
        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) {
              console.error('Error deleting image from Cloudinary:', error);
              reject(error);
            } else {
              resolve(result);
            }
          });
        });
        return result;
      } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
      }
    };

    const updatePost = async (blog_id, title, description, media_url) => {
      const postSql =
        'UPDATE blog SET title = ?, description = ?, media_url = ? WHERE blog_id = ?';
      const postValues = [title, description, media_url, blog_id];

      try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(postSql, postValues);
        connection.release();
        return result.affectedRows; // Return the number of affected rows
      } catch (err) {
        console.error('Error updating post data in the database:', err);
        throw err;
      }
    };

    app.post('/api/login', async (req, res) => {
      const { username, password } = req.body;

      try {
        connection = await pool.getConnection();

        // Retrieve user from database
        const [results] = await connection.query(
          'SELECT * FROM user WHERE unique_username = ?',
          [username]
        );

        if (results.length === 0) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, results[0].password);

        if (!isMatch) {
          res.status(401).json({ error: 'Invalid credentials' });
          return;
        }

        // User authenticated, generate token
        const token = jwt.sign({ username }, process.env.JWT_SECRET, {
          expiresIn: '3h',
        });
        res.status(200).json({ token });
      } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Internal server error' });
      } finally {
        if (connection) connection.release();
      }
    });

    app.post('/api/verify', async (req, res) => {
      const { last_token } = req.body;

      if (!last_token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      try {
        const decoded = await new Promise((resolve, reject) => {
          jwt.verify(last_token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
              reject(err);
            } else {
              resolve(decoded);
            }
          });
        });

        const { username } = decoded;
        const connection = await pool.getConnection();

        const [results] = await connection.query(
          'SELECT isAdmin FROM user WHERE unique_username = ?',
          [username]
        );

        connection.release();

        if (results.length === 0) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        const isAdmin = results[0].isAdmin;
        res.status(200).json({ isAdmin });
      } catch (err) {
        console.error('Error verifying token:', err);
        res.status(401).json({ error: 'Unauthorized' });
      }
    });

    app.get('/api/dashboard', authenticateUserToken, (req, res) => {
      // Access the user data from the request object
      const { username } = req.user;
      res.json({ message: `Welcome to the dashboard, ${username}!` });
    });

    const getTagsForBlog = async (blogId) => {
      const sql =
        'SELECT tag.tag_id, tag.tag_name FROM blog_tag JOIN tag ON blog_tag.tag_id = tag.tag_id WHERE blog_tag.blog_id = ?';

      try {
        const connection = await pool.getConnection();
        const [results] = await connection.query(sql, [blogId]);
        connection.release();
        return results;
      } catch (err) {
        console.error('Error fetching tags for blog:', err);
        throw err;
      }
    };

    app.get('/api/dashboard/blog', async (req, res) => {
      const page = parseInt(req.query.page) || 1; // Current page number, default is 1
      const blogsPerPage = 6; // Number of blog posts per page
      const offset = (page - 1) * blogsPerPage;

      const sqlCount = 'SELECT COUNT(*) AS total FROM blog'; // Query to count total number of blogs
      const sql = 'SELECT * FROM blog ORDER BY datetime DESC LIMIT ? OFFSET ?';

      try {
        connection = await pool.getConnection();

        // Count total number of blogs
        const [countResult] = await connection.query(sqlCount);
        const totalBlogs = countResult[0].total;

        // Fetch paginated blog posts
        const [blogResults] = await connection.query(sql, [
          blogsPerPage,
          offset,
        ]);
        connection.release();

        // Fetch tags for each blog
        for (const blog of blogResults) {
          blog.tags = await getTagsForBlog(blog.blog_id);
        }

        const responseObject = {
          listBlogs: blogResults,
          countBlogs: totalBlogs,
        };

        res.status(200).json(responseObject);
      } catch (err) {
        console.error('Error fetching blog posts or tags:', err);
        res.status(500).json({ error: 'Unable to fetch blog posts or tags' });
      }
    });

    // API endpoint to update a post
    app.put(
      '/api/posts/update',
      authenticateAdminToken,
      upload.single('media_url'),
      async (req, res) => {
        const { username, isAdmin } = req.user;
        const { blog_id, title, description, tags } = req.body;
        const media = req.file;
        const cloudUrl = 'https://res.cloudinary.com';

        if (!isAdmin) {
          return res
            .status(403)
            .json({ error: 'You are not authorized to perform this action' });
        }

        try {
          let mediaUrl = null;
          const [mediaUrlResult] = await getMediaUrl(blog_id);
          const currentMediaUrl = mediaUrlResult.media_url;

          if (media && media.path) {
            // New media uploaded
            if (currentMediaUrl && currentMediaUrl.startsWith(cloudUrl)) {
              await deleteCloudinary(currentMediaUrl); // Remove old media
            }
            const result = await uploadToCloudinary(media.path); // Upload new media
            mediaUrl = result.secure_url;
          } else if (currentMediaUrl && currentMediaUrl.startsWith(cloudUrl)) {
            // Media removed
            await deleteCloudinary(currentMediaUrl);
            mediaUrl = null;
          }

          const affectedRows = await updatePost(
            blog_id,
            title,
            description,
            mediaUrl
          );

          if (affectedRows > 0) {
            await deleteBlogTags(blog_id);
            await insertTags(blog_id, tags);
            deleteUploadsFolderContents();
            return res
              .status(200)
              .json({ message: 'Post updated successfully' });
          } else {
            return res.status(404).json({ error: 'Post was not updated' });
          }
        } catch (error) {
          console.error('Error updating the post:', error);
          return res.status(500).json({ error: 'Failed to update the post' });
        }
      }
    );

    // API endpoint to create a new post
    app.post(
      '/api/posts/create',
      upload.single('media_url'),
      authenticateAdminToken,
      async (req, res) => {
        const { username, isAdmin } = req.user;
        const { title, description, tags } = req.body;
        const media = req.file;

        if (!isAdmin) {
          return res
            .status(403)
            .json({ error: 'You are not authorized to perform this action' });
        }

        if (!title || !description) {
          return res
            .status(400)
            .json({ error: 'Title and description are required' });
        }

        try {
          const [uidResult] = await queryUserUid(username);
          const extractedUid = uidResult.uid;

          let mediaUrl = null;
          if (media && media.path) {
            const result = await uploadToCloudinary(media.path);
            mediaUrl = result.secure_url;
          }

          const postId = await insertPost(
            extractedUid,
            title,
            description,
            mediaUrl
          );
          await insertTags(postId, tags);

          return res.status(201).json({ message: 'Post created successfully' });
        } catch (error) {
          console.error('Error creating post:', error);
          return res.status(500).json({ error: 'Failed to create post' });
        }
      }
    );

    // Function to query user UID
    const queryUserUid = async (username) => {
      const uidSql = 'SELECT uid FROM user WHERE unique_username = ?';
      try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(uidSql, [username]);
        connection.release();
        return result;
      } catch (err) {
        console.error('Error retrieving uid:', err);
        throw err;
      }
    };

    // Function to query user admin status
    const queryUserAdminStatus = async (username) => {
      const isAdminSql = 'SELECT isAdmin FROM user WHERE unique_username = ?';
      try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(isAdminSql, [username]);
        connection.release();
        return result;
      } catch (err) {
        console.error('Error checking user admin status:', err);
        throw err;
      }
    };

    // Function to upload media file to Cloudinary
    const uploadToCloudinary = async (filePath) => {
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
    const insertPost = async (uid, title, description, media_url) => {
      const postSql = media_url
        ? 'INSERT INTO blog (uid, title, description, media_url) VALUES (?, ?, ?, ?)'
        : 'INSERT INTO blog (uid, title, description) VALUES (?, ?, ?)';
      const postValues = media_url
        ? [uid, title, description, media_url]
        : [uid, title, description];

      try {
        const connection = await pool.getConnection();
        const [result] = await connection.query(postSql, postValues);
        connection.release();
        return result.insertId;
      } catch (err) {
        console.error('Error inserting post data into database:', err);
        throw err;
      }
    };

    // Function to insert tags into blog_tag table
    const insertTags = async (blogId, tags) => {
      if (!tags) return;

      const tagArray = Array.isArray(tags)
        ? tags
        : tags.split(',').map((tag) => tag.trim());
      const uniqueTagNames = [...new Set(tagArray)];

      try {
        const connection = await pool.getConnection();
        const tagIds = await Promise.all(
          uniqueTagNames.map(async (tagName) => {
            const selectSql = 'SELECT tag_id FROM tag WHERE tag_name = ?';
            const [selectResult] = await connection.query(selectSql, [tagName]);

            if (selectResult.length > 0) {
              return selectResult[0].tag_id;
            } else {
              const insertSql = 'INSERT INTO tag (tag_name) VALUES (?)';
              const [insertResult] = await connection.query(insertSql, [
                tagName,
              ]);
              return insertResult.insertId;
            }
          })
        );

        const tagInsertSql = 'INSERT INTO blog_tag (blog_id, tag_id) VALUES ?';
        const tagValues = tagIds.map((tagId) => [blogId, tagId]);
        await connection.query(tagInsertSql, [tagValues]);
        connection.release();
      } catch (error) {
        console.error('Error inserting tags into database:', error);
        throw error;
      }
    };

    // function insertTags(blogId, tags) {
    //   return new Promise((resolve, reject) => {
    //     if (tags) {
    //       // Convert tags to an array if it's a single tag
    //       const tagArray = Array.isArray(tags)
    //         ? tags
    //         : tags.split(',').map((tag) => tag.trim());

    //       // Initialize an array to store unique tag names
    //       const uniqueTagNames = [];

    //       // Filter out duplicate tag names
    //       tagArray.forEach((tagName) => {
    //         if (!uniqueTagNames.includes(tagName)) {
    //           uniqueTagNames.push(tagName);
    //         }
    //       });

    //       // Query to check if tag exists and retrieve its tag_id or insert new tag
    //       const queries = uniqueTagNames.map((tagName) => {
    //         return new Promise((resolveQuery, rejectQuery) => {
    //           const selectSql = 'SELECT tag_id FROM tag WHERE tag_name = ?';

    //           pool.getConnection((err, connection) => {
    //             if (err) {
    //               console.error('Error getting connection from pool:', err);
    //               res.status(500).json({ error: 'Database connection error' });
    //               return;
    //             }

    //             connection.query(
    //               selectSql,
    //               [tagName],
    //               (selectErr, selectResult) => {
    //                 connection.release();
    //                 if (selectErr) {
    //                   rejectQuery(selectErr);
    //                 } else if (selectResult.length > 0) {
    //                   // Tag already exists, resolve without doing anything
    //                   resolveQuery();
    //                 } else {
    //                   // Tag does not exist, insert new tag and retrieve its tag_id
    //                   const insertSql = 'INSERT INTO tag (tag_name) VALUES (?)';
    //                   connection.query(
    //                     insertSql,
    //                     [tagName],
    //                     (insertErr, insertResult) => {
    //                       connection.release();
    //                       if (insertErr) {
    //                         rejectQuery(insertErr);
    //                       } else {
    //                         resolveQuery();
    //                       }
    //                     }
    //                   );
    //                 }
    //               }
    //             );
    //           });
    //         });
    //       });

    //       // Resolve all queries and insert tag_id into blog_tag table
    //       Promise.all(queries)
    //         .then(() => {
    //           const tagInsertSql =
    //             'INSERT INTO blog_tag (blog_id, tag_id) VALUES ?';

    //           // Get the tag_ids for the unique tag names
    //           const tagIdQueries = uniqueTagNames.map((tagName) => {
    //             return new Promise((resolveQuery, rejectQuery) => {
    //               const selectSql = 'SELECT tag_id FROM tag WHERE tag_name = ?';
    //               pool.getConnection((err, connection) => {
    //                 if (err) {
    //                   console.error('Error getting connection from pool:', err);
    //                   res
    //                     .status(500)
    //                     .json({ error: 'Database connection error' });
    //                   return;
    //                 }
    //                 connection.query(
    //                   selectSql,
    //                   [tagName],
    //                   (selectErr, selectResult) => {
    //                     connection.release();
    //                     if (selectErr) {
    //                       rejectQuery(selectErr);
    //                     } else if (selectResult.length > 0) {
    //                       resolveQuery(selectResult[0].tag_id);
    //                     } else {
    //                       // This should not happen as we've already inserted new tags
    //                       rejectQuery(
    //                         new Error('Failed to retrieve tag_id for new tag')
    //                       );
    //                     }
    //                   }
    //                 );
    //               });
    //             });
    //           });

    //           // Resolve all tag_id queries
    //           Promise.all(tagIdQueries)
    //             .then((tagIds) => {
    //               // Create values for bulk insertion
    //               const tagValues = tagIds.map((tagId) => [blogId, tagId]);

    //               pool.getConnection((err, connection) => {
    //                 if (err) {
    //                   console.error('Error getting connection from pool:', err);
    //                   res
    //                     .status(500)
    //                     .json({ error: 'Database connection error' });
    //                   return;
    //                 }
    //                 connection.query(
    //                   tagInsertSql,
    //                   [tagValues],
    //                   (tagInsertErr, tagInsertResult) => {
    //                     connection.release();
    //                     if (tagInsertErr) {
    //                       reject(tagInsertErr);
    //                     } else {
    //                       resolve();
    //                     }
    //                   }
    //                 );
    //               });
    //             })
    //             .catch((error) => {
    //               reject(error);
    //             });
    //         })
    //         .catch((error) => {
    //           reject(error);
    //         });
    //     } else {
    //       // No tags provided, resolve immediately
    //       resolve();
    //     }
    //   });
    // }

    app.get(
      '/api/dashboard/inbox',
      authenticateAdminToken,
      async (req, res) => {
        const { username, isAdmin } = req.user;
        const page = parseInt(req.query.page, 10) || 1; // Current page number, default is 1
        const messagesPerPage = 10; // Number of messages per page
        const offset = (page - 1) * messagesPerPage; // Calculate the offset

        const sqlCount = 'SELECT COUNT(*) AS total FROM inbox'; // Query to count total records
        const sqlMessages =
          'SELECT * FROM inbox ORDER BY created_at DESC LIMIT ? OFFSET ?';

        console.log('/api/dashboard/inbox 1');
        try {
          console.log('/api/dashboard/inbox 2');
          const connection = await pool.getConnection();

          try {
            console.log('/api/dashboard/inbox 3');
            // Count total messages
            const [countResult] = await connection.query(sqlCount);
            const totalMessages = countResult[0].total;

            // Fetch messages for the current page
            const [results] = await connection.query(sqlMessages, [
              messagesPerPage,
              offset,
            ]);

            if (isAdmin === 0) {
              results.forEach((message) => {
                message.content = '*'.repeat(message.content.length);
              });
            }

            const responseObject = {
              listMessages: results,
              countMessage: totalMessages,
            };

            res.status(200).json(responseObject);
          } finally {
            connection.release();
          }
        } catch (error) {
          console.error('Error fetching messages:', error);
          res.status(500).json({ error: 'Unable to fetch messages' });
        }
      }
    );

    const deleteBlogTags = async (blogId) => {
      const deleteTagsQuery = 'DELETE FROM blog_tag WHERE blog_id = ?';

      try {
        const connection = await pool.getConnection();
        try {
          await connection.query(deleteTagsQuery, [blogId]);
        } finally {
          connection.release();
        }
      } catch (error) {
        console.error('Error deleting blog tags:', error);
        throw new Error('Failed to delete blog tags');
      }
    };

    app.delete(
      '/api/blogs/:blogId',
      authenticateAdminToken,
      async (req, res) => {
        const { isAdmin } = req.user;
        const blogId = req.params.blogId;

        if (isAdmin !== 1) {
          return res
            .status(403)
            .json({ error: 'Unauthorized: Only admins can delete blogs' });
        }

        try {
          // Delete blog tags first
          await deleteBlogTags(blogId);

          const connection = await pool.getConnection();
          try {
            // Get the media URL of the blog
            const [results] = await connection.query(
              'SELECT media_url FROM blog WHERE blog_id = ?',
              [blogId]
            );
            const mediaUrl = results[0]?.media_url;

            if (mediaUrl) {
              // Extract the public ID from the Cloudinary URL
              const publicId = mediaUrl.split('/').pop().split('.')[0];

              // Delete the image from Cloudinary
              await cloudinary.uploader.destroy(publicId);
            }

            // Once image is deleted from Cloudinary or if no image exists, delete the blog record
            await connection.query('DELETE FROM blog WHERE blog_id = ?', [
              blogId,
            ]);

            console.log('Blog deleted successfully.');
            res.sendStatus(204); // No Content
          } finally {
            connection.release();
          }
        } catch (error) {
          console.error('Error deleting blog:', error);
          res.status(500).json({ error: 'Failed to delete blog' });
        }
      }
    );

    app.delete(
      '/api/messages/:messageId',
      authenticateAdminToken,
      async (req, res) => {
        const { isAdmin } = req.user;
        const messageId = req.params.messageId;

        if (isAdmin !== 1) {
          return res
            .status(403)
            .json({ error: 'Unauthorized: Only admins can delete messages' });
        }

        try {
          const connection = await pool.getConnection();
          try {
            // Delete the message from the database
            await connection.query('DELETE FROM inbox WHERE inbox_id = ?', [
              messageId,
            ]);

            console.log('Message deleted successfully.');
            res.sendStatus(204); // No Content
          } finally {
            connection.release();
          }
        } catch (error) {
          console.error('Error deleting message:', error);
          res.status(500).json({ error: 'Failed to delete message' });
        }
      }
    );

    app.get('/api/blog/:id', async (req, res) => {
      const blogId = req.params.id;
      const sql = 'SELECT * FROM blog WHERE blog_id = ?';

      try {
        const connection = await pool.getConnection();
        try {
          const [blogResults] = await connection.query(sql, [blogId]);
          connection.release();

          if (blogResults.length === 0) {
            return res.status(404).json({ error: 'Blog post not found' });
          }

          const blog = blogResults[0];
          blog.tags = await getTagsForBlog(blog.blog_id);

          res.status(200).json(blog);
        } finally {
          connection.release();
        }
      } catch (error) {
        console.error('Error fetching blog post:', error);
        res.status(500).json({ error: 'Unable to fetch the blog post' });
      }
    });

    app.get('/api/blog/:id/previous', async (req, res) => {
      const blogId = req.params.id;
      const sql = `
        SELECT * FROM blog 
        WHERE blog_id < ? 
        ORDER BY blog_id DESC 
        LIMIT 1
      `;

      try {
        const connection = await pool.getConnection();
        try {
          const [results] = await connection.query(sql, [blogId]);
          connection.release();

          if (results.length === 0) {
            return res
              .status(404)
              .json({ error: 'No previous blog post found' });
          }

          const blog = results[0];
          blog.tags = await getTagsForBlog(blog.blog_id);

          res.status(200).json(blog);
        } finally {
          connection.release();
        }
      } catch (error) {
        console.error('Error fetching previous blog post:', error);
        res.status(500).json({ error: 'Unable to fetch previous blog post' });
      }
    });

    app.get('/api/blog/:id/next', async (req, res) => {
      const blogId = req.params.id;
      const sql = `
        SELECT * FROM blog 
        WHERE blog_id > ? 
        ORDER BY blog_id ASC 
        LIMIT 1
      `;

      try {
        const connection = await pool.getConnection();
        try {
          const [results] = await connection.query(sql, [blogId]);
          connection.release();

          if (results.length === 0) {
            return res.status(404).json({ error: 'No next blog post found' });
          }

          const blog = results[0];
          blog.tags = await getTagsForBlog(blog.blog_id);

          res.status(200).json(blog);
        } finally {
          connection.release();
        }
      } catch (error) {
        console.error('Error fetching next blog post:', error);
        res.status(500).json({ error: 'Unable to fetch next blog post' });
      }
    });

    app.post('/api/checkout/paymaya', async (req, res) => {
      const { amount } = req.body;

      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount provided' });
      }

      const requestReferenceNumber = uuidv4();
      const url = 'https://pg-sandbox.paymaya.com/checkout/v1/checkouts';
      const options = {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: process.env.MAYA_AUTHORIZATION,
        },
        body: JSON.stringify({
          totalAmount: { value: amount, currency: 'PHP' },
          redirectUrl: {
            success: `${process.env.CORS_ORIGIN}/success`,
            failure: `${process.env.CORS_ORIGIN}/failure`,
            cancel: `${process.env.CORS_ORIGIN}/failure`,
          },
          items: [
            {
              totalAmount: { value: amount },
              description: 'donation',
              name: 'donation_blog',
            },
          ],
          requestReferenceNumber,
        }),
      };

      try {
        const response = await fetch(url, options);
        const json = await response.json();

        if (!response.ok) {
          console.error('PayMaya API Error:', json);
          return res
            .status(response.status)
            .json({ error: 'Failed to create payment' });
        }

        res.json(json);
      } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Something went wrong' });
      }
    });

    app.post('/api/checkout/paypal', async (req, res) => {
      const { amount } = req.body;

      // Validate amount
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount provided' });
      }

      const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
      ).toString('base64');
      const url = 'https://api.sandbox.paypal.com/v1/payments/payment';

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          intent: 'sale',
          redirect_urls: {
            return_url: `${process.env.CORS_ORIGIN}/success`,
            cancel_url: `${process.env.CORS_ORIGIN}/failure`,
          },
          payer: {
            payment_method: 'paypal',
          },
          transactions: [
            {
              amount: {
                total: amount,
                currency: 'PHP',
              },
              description: 'Donation',
            },
          ],
        }),
      };

      try {
        const response = await fetch(url, options);
        const json = await response.json();

        if (!response.ok) {
          console.error('PayPal API Error:', json);
          return res
            .status(response.status)
            .json({ error: 'Failed to create payment' });
        }

        res.json(json);
      } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Something went wrong' });
      }
    });
  })();

  // // User registration endpoint
  // app.post('/api/register', async (req, res) => {
  //   const { username, password } = req.body;

  //   try {
  //     // Get a connection from the pool
  //     const connection = await pool.getConnection();

  //     try {
  //       // Check if username already exists
  //       const [results] = await connection.query(
  //         'SELECT * FROM user WHERE unique_username = ?',
  //         [username]
  //       );

  //       if (results.length > 0) {
  //         res.status(400).json({ error: 'Username already exists' });
  //         return;
  //       }

  //       // Hash the password
  //       const hash = await bcrypt.hash(password, 10);

  //       // Insert user into the database
  //       await connection.query(
  //         'INSERT INTO user (unique_username, password) VALUES (?, ?)',
  //         [username, hash]
  //       );

  //       res.status(201).json({ message: 'User registered successfully' });
  //     } finally {
  //       connection.release();
  //     }
  //   } catch (err) {
  //     console.error('Database error:', err);
  //     res.status(500).json({ error: 'Internal server error' });
  //   }
  // });

  // // Submit contact form
  // app.post('/api/contact', async (req, res) => {
  //   const { firstName, lastName, message } = req.body;
  //   const content = `${firstName} ${lastName} sent a message:\n${message}`;

  //   const sql = 'INSERT INTO inbox (content, source_title) VALUES (?,?)';

  //   let connection;
  //   try {
  //     // Get a connection from the pool
  //     connection = await pool.getConnection();

  //     // Execute the query
  //     await connection.query(sql, [content, 'Origin: Contact Form']);

  //     // Release the connection early
  //     connection.release();

  //     console.log('Message submitted successfully');
  //     res.status(200).json({ message: 'Message submitted successfully' });
  //   } catch (err) {
  //     // Ensure connection is released in case of error
  //     if (connection) connection.release();

  //     console.error('Error handling contact form submission:', err);

  //     if (err.code === 'POOL_CON_ERROR') {
  //       res.status(500).json({ error: 'Database connection error' });
  //     } else {
  //       res.status(500).json({ error: 'Unable to submit message' });
  //     }
  //   }
  // });

  // // 1. getMediaUrl(blog_id)
  // const getMediaUrl = (blog_id) => {
  //   return new Promise((resolve, reject) => {
  //     const sql = 'SELECT media_url FROM blog WHERE blog_id = ?';

  //     pool.getConnection((err, connection) => {
  //       if (err) {
  //         console.error('Error getting connection from pool:', err);
  //         res.status(500).json({ error: 'Database connection error' });
  //         return;
  //       }

  //       connection.query(sql, [blog_id], (err, result) => {
  //         connection.release();
  //         if (err) {
  //           console.error('Error fetching media_url from database:', err);
  //           reject(err);
  //         } else {
  //           resolve(result);
  //         }
  //       });
  //     });
  //   });
  // };

  // // 2. deleteCloudinary(currentMediaUrl)
  // const deleteCloudinary = (currentMediaUrl) => {
  //   return new Promise((resolve, reject) => {
  //     // Extract the public_id from the currentMediaUrl
  //     const publicId = currentMediaUrl.split('/').pop().split('.')[0]; // Assuming the URL structure is consistent

  //     // Implement the code to delete the image from Cloudinary
  //     cloudinary.uploader.destroy(publicId, (error, result) => {
  //       if (error) {
  //         console.error('Error deleting image from Cloudinary:', error);
  //         reject(error);
  //       } else {
  //         // console.log("Success: ", result);
  //         resolve(result);
  //       }
  //     });
  //   });
  // };
  // const updatePost = (blog_id, title, description, media_url) => {
  //   return new Promise((resolve, reject) => {
  //     const postSql =
  //       'UPDATE blog SET title = ?, description = ?, media_url = ? WHERE blog_id = ?';
  //     const postValues = [title, description, media_url, blog_id];

  //     pool.getConnection((err, connection) => {
  //       if (err) {
  //         console.error('Error getting connection from pool:', err);
  //         res.status(500).json({ error: 'Database connection error' });
  //         return;
  //       }
  //       connection.query(postSql, postValues, (err, result) => {
  //         connection.release();
  //         if (err) {
  //           console.error('Error updating post data in the database:', err);
  //           reject(err);
  //         } else {
  //           resolve(result.affectedRows); // Return the number of affected rows
  //         }
  //       });
  //     });
  //   });
  // };

  // app.put(
  //   '/api/posts/update',
  //   authenticateAdminToken,
  //   upload.single('media_url'),
  //   async (req, res) => {
  //     const { username, isAdmin } = req.user;
  //     const { blog_id, title, description, tags } = req.body;
  //     var media = req.file;
  //     const cloudUrl = 'https://res.cloudinary.com';
  //     if (isAdmin) {
  //       try {
  //         let mediaUrl = null;
  //         let currentMediaUrl = null;
  //         // Fetch the current media_url from the database
  //         const [mediaUrlResult] = await getMediaUrl(blog_id);
  //         if (!media) {
  //           media = null;
  //         }

  //         currentMediaUrl = mediaUrlResult.media_url;
  //         // console.log(blog_id, title, description, tags, currentMediaUrl, media);

  //         // Check the cases and handle accordingly
  //         if (media && media.path) {
  //           // Case 1: New media uploaded
  //           if (currentMediaUrl && currentMediaUrl.startsWith(cloudUrl)) {
  //             // Delete the old image from Cloudinary
  //             await deleteCloudinary(currentMediaUrl);
  //           }
  //           // Upload the new media file to Cloudinary
  //           const result = await uploadToCloudinary(media.path);
  //           mediaUrl = result.secure_url;
  //         } else if (
  //           currentMediaUrl &&
  //           currentMediaUrl.startsWith(cloudUrl) &&
  //           media == null
  //         ) {
  //           console.log('Did it pass here?');
  //           // Case 4: Media removed
  //           await deleteCloudinary(currentMediaUrl);
  //           mediaUrl = null;
  //         }

  //         // Perform update operation
  //         const affectedRows = await updatePost(
  //           blog_id,
  //           title,
  //           description,
  //           mediaUrl
  //         );

  //         // Check if the update was successful
  //         if (affectedRows > 0) {
  //           // Delete existing blog tags
  //           await deleteBlogTags(blog_id);
  //           // Insert tags for the updated post
  //           await insertTags(blog_id, tags);
  //           deleteUploadsFolderContents();
  //           return res
  //             .status(200)
  //             .json({ message: 'Post updated successfully' });
  //         } else {
  //           return res.status(404).json({ error: 'Post was not updated' });
  //         }
  //       } catch (error) {
  //         console.error('Error updating the post:', error);
  //         return res.status(500).json({ error: 'Failed to update the post' });
  //       }
  //     } else {
  //       return res
  //         .status(403)
  //         .json({ error: 'You are not authorized to perform this action' });
  //     }
  //   }
  // );

  // // Handle POST request to create a new post
  // app.post(
  //   '/api/posts/create',
  //   upload.single('media_url'),
  //   authenticateAdminToken,
  //   async (req, res) => {
  //     const { username, isAdmin } = req.user;
  //     const { title, description, tags, token } = req.body;
  //     const media = req.file;

  //     try {
  //       // Validate form data (e.g., check if required fields are present)
  //       if (!title || !description) {
  //         return res
  //           .status(400)
  //           .json({ error: 'Title and description are required' });
  //       }

  //       // Retrieve user UID and check admin status
  //       const [uidResult, isAdminResult] = await Promise.all([
  //         queryUserUid(username),
  //         // queryUserAdminStatus(username),
  //       ]);

  //       const extractedUid = uidResult[0].uid;
  //       // const isAdmin = isAdminResult[0].isAdmin === 1;

  //       // Check if user is admin
  //       if (!isAdmin) {
  //         return res
  //           .status(403)
  //           .json({ error: 'You are not authorized to perform this action' });
  //       }

  //       let mediaUrl = null;
  //       if (media && media.path) {
  //         // Upload media file to Cloudinary
  //         const result = await uploadToCloudinary(media.path);
  //         mediaUrl = result.secure_url;
  //       }

  //       // Insert post data into MySQL database
  //       const postId = await insertPost(
  //         extractedUid,
  //         title,
  //         description,
  //         mediaUrl
  //       );

  //       // Insert tags into the blog_tag table
  //       await insertTags(postId, tags);

  //       return res.status(201).json({ message: 'Post created successfully' });
  //     } catch (error) {
  //       console.error('Error creating post:', error);
  //       return res.status(500).json({ error: 'Failed to create post' });
  //     }
  //   }
  // );

  // Function to query user UID
  // const queryUserUid = (username) => {
  //   const uidSql = 'SELECT uid FROM user WHERE unique_username = ?';
  //   return new Promise((resolve, reject) => {
  //     pool.getConnection((err, connection) => {
  //       if (err) {
  //         console.error('Error getting connection from pool:', err);
  //         res.status(500).json({ error: 'Database connection error' });
  //         return;
  //       }
  //       connection.query(uidSql, [username], (err, result) => {
  //         connection.release();
  //         if (err) {
  //           console.error('Error retrieving uid:', err);
  //           reject(err);
  //         } else {
  //           resolve(result);
  //         }
  //       });
  //     });
  //   });
  // };

  // // Function to query user admin status
  // const queryUserAdminStatus = (username) => {
  //   const isAdminSql = 'SELECT isAdmin FROM user WHERE unique_username = ?';
  //   return new Promise((resolve, reject) => {
  //     connection.query(isAdminSql, [username], (err, result) => {
  //       connection.release();
  //       if (err) {
  //         console.error('Error checking user admin status:', err);
  //         reject(err);
  //       } else {
  //         resolve(result);
  //       }
  //     });
  //   });
  // };

  // // Function to upload media file to Cloudinary
  // const uploadToCloudinary = (filePath) => {
  //   return new Promise((resolve, reject) => {
  //     cloudinary.uploader.upload(filePath, (error, result) => {
  //       if (error) {
  //         console.error('Error uploading media to Cloudinary:', error);
  //         reject(error);
  //       } else {
  //         resolve(result);
  //       }
  //     });
  //   });
  // };

  // // Function to insert post data into MySQL database
  // const insertPost = (uid, title, description, media_url) => {
  //   const postSql = media_url
  //     ? 'INSERT INTO blog (uid, title, description, media_url) VALUES (?, ?, ?, ?)'
  //     : 'INSERT INTO blog (uid, title, description) VALUES (?, ?, ?)';
  //   const postValues = media_url
  //     ? [uid, title, description, media_url]
  //     : [uid, title, description];
  //   return new Promise((resolve, reject) => {
  //     pool.getConnection((err, connection) => {
  //       if (err) {
  //         console.error('Error getting connection from pool:', err);
  //         res.status(500).json({ error: 'Database connection error' });
  //         return;
  //       }
  //       connection.query(postSql, postValues, (err, result) => {
  //         connection.release();
  //         if (err) {
  //           console.error('Error inserting post data into database:', err);
  //           reject(err);
  //         } else {
  //           resolve(result.insertId);
  //         }
  //       });
  //     });
  //   });
  // };

  // Function to insert tags into blog_tag table
  // function insertTags(blogId, tags) {
  //   return new Promise((resolve, reject) => {
  //     if (tags) {
  //       // Convert tags to an array if it's a single tag
  //       const tagArray = Array.isArray(tags)
  //         ? tags
  //         : tags.split(',').map((tag) => tag.trim());

  //       // Initialize an array to store unique tag names
  //       const uniqueTagNames = [];

  //       // Filter out duplicate tag names
  //       tagArray.forEach((tagName) => {
  //         if (!uniqueTagNames.includes(tagName)) {
  //           uniqueTagNames.push(tagName);
  //         }
  //       });

  //       // Query to check if tag exists and retrieve its tag_id or insert new tag
  //       const queries = uniqueTagNames.map((tagName) => {
  //         return new Promise((resolveQuery, rejectQuery) => {
  //           const selectSql = 'SELECT tag_id FROM tag WHERE tag_name = ?';

  //           pool.getConnection((err, connection) => {
  //             if (err) {
  //               console.error('Error getting connection from pool:', err);
  //               res.status(500).json({ error: 'Database connection error' });
  //               return;
  //             }

  //             connection.query(
  //               selectSql,
  //               [tagName],
  //               (selectErr, selectResult) => {
  //                 connection.release();
  //                 if (selectErr) {
  //                   rejectQuery(selectErr);
  //                 } else if (selectResult.length > 0) {
  //                   // Tag already exists, resolve without doing anything
  //                   resolveQuery();
  //                 } else {
  //                   // Tag does not exist, insert new tag and retrieve its tag_id
  //                   const insertSql = 'INSERT INTO tag (tag_name) VALUES (?)';
  //                   connection.query(
  //                     insertSql,
  //                     [tagName],
  //                     (insertErr, insertResult) => {
  //                       connection.release();
  //                       if (insertErr) {
  //                         rejectQuery(insertErr);
  //                       } else {
  //                         resolveQuery();
  //                       }
  //                     }
  //                   );
  //                 }
  //               }
  //             );
  //           });
  //         });
  //       });

  //       // Resolve all queries and insert tag_id into blog_tag table
  //       Promise.all(queries)
  //         .then(() => {
  //           const tagInsertSql =
  //             'INSERT INTO blog_tag (blog_id, tag_id) VALUES ?';

  //           // Get the tag_ids for the unique tag names
  //           const tagIdQueries = uniqueTagNames.map((tagName) => {
  //             return new Promise((resolveQuery, rejectQuery) => {
  //               const selectSql = 'SELECT tag_id FROM tag WHERE tag_name = ?';
  //               pool.getConnection((err, connection) => {
  //                 if (err) {
  //                   console.error('Error getting connection from pool:', err);
  //                   res
  //                     .status(500)
  //                     .json({ error: 'Database connection error' });
  //                   return;
  //                 }
  //                 connection.query(
  //                   selectSql,
  //                   [tagName],
  //                   (selectErr, selectResult) => {
  //                     connection.release();
  //                     if (selectErr) {
  //                       rejectQuery(selectErr);
  //                     } else if (selectResult.length > 0) {
  //                       resolveQuery(selectResult[0].tag_id);
  //                     } else {
  //                       // This should not happen as we've already inserted new tags
  //                       rejectQuery(
  //                         new Error('Failed to retrieve tag_id for new tag')
  //                       );
  //                     }
  //                   }
  //                 );
  //               });
  //             });
  //           });

  //           // Resolve all tag_id queries
  //           Promise.all(tagIdQueries)
  //             .then((tagIds) => {
  //               // Create values for bulk insertion
  //               const tagValues = tagIds.map((tagId) => [blogId, tagId]);

  //               pool.getConnection((err, connection) => {
  //                 if (err) {
  //                   console.error('Error getting connection from pool:', err);
  //                   res
  //                     .status(500)
  //                     .json({ error: 'Database connection error' });
  //                   return;
  //                 }
  //                 connection.query(
  //                   tagInsertSql,
  //                   [tagValues],
  //                   (tagInsertErr, tagInsertResult) => {
  //                     connection.release();
  //                     if (tagInsertErr) {
  //                       reject(tagInsertErr);
  //                     } else {
  //                       resolve();
  //                     }
  //                   }
  //                 );
  //               });
  //             })
  //             .catch((error) => {
  //               reject(error);
  //             });
  //         })
  //         .catch((error) => {
  //           reject(error);
  //         });
  //     } else {
  //       // No tags provided, resolve immediately
  //       resolve();
  //     }
  //   });
  // }

  // // User login endpoint
  // app.post('/api/login', (req, res) => {
  //   const { username, password } = req.body;

  //   pool.getConnection((err, connection) => {
  //     if (err) {
  //       console.error('Error getting connection from pool:', err);
  //       res.status(500).json({ error: 'Database connection error' });
  //       return;
  //     }
  //     // Retrieve user from database
  //     connection.query(
  //       'SELECT * FROM user WHERE unique_username = ?',
  //       [username],
  //       (err, results) => {
  //         connection.release();
  //         if (err) {
  //           console.error('Error retrieving user:', err);
  //           res.status(500).json({ error: 'Internal server error' });
  //           return;
  //         }

  //         // Check if user exists
  //         if (results.length === 0) {
  //           res.status(401).json({ error: 'Invalid credentials' });
  //           return;
  //         }

  //         // Compare passwords
  //         bcrypt.compare(password, results[0].password, (err, result) => {
  //           if (err || !result) {
  //             res.status(401).json({ error: 'Invalid credentials' });
  //             return;
  //           }

  //           // User authenticated, generate token
  //           const token = jwt.sign({ username }, process.env.JWT_SECRET, {
  //             expiresIn: '3h',
  //           });
  //           res.status(200).json({ token });
  //         });
  //       }
  //     );
  //   });
  // });

  // // Endpoint to verify token and determine if the user is an admin
  // app.post('/api/verify', (req, res) => {
  //   const { last_token } = req.body;

  //   if (!last_token) {
  //     return res.status(401).json({ error: 'Unauthorized' });
  //   }

  //   jwt.verify(last_token, process.env.JWT_SECRET, (err, decoded) => {
  //     if (err) {
  //       return res.status(401).json({ error: 'Unauthorized' });
  //     }

  //     const { username } = decoded;

  //     pool.getConnection((err, connection) => {
  //       if (err) {
  //         console.error('Error getting connection from pool:', err);
  //         res.status(500).json({ error: 'Database connection error' });
  //         return;
  //       }
  //       // Query the database to get user roles and permissions
  //       connection.query(
  //         'SELECT isAdmin FROM user WHERE unique_username = ?',
  //         [username],
  //         (err, results) => {
  //           connection.release();
  //           if (err) {
  //             console.error('Error fetching user data:', err);
  //             return res.status(500).json({ error: 'Internal server error' });
  //           }

  //           if (results.length === 0) {
  //             return res.status(403).json({ error: 'Forbidden' });
  //           }

  //           const isAdmin = results[0].isAdmin;

  //           // Send the isAdmin value to the client
  //           return res.status(200).json({ isAdmin });
  //         }
  //       );
  //     });
  //   });
  // });

  // app.get('/api/dashboard', authenticateUserToken, (req, res) => {
  //   // Access the user data from the request object
  //   const { username } = req.user;

  //   // You can now use the username in your route logic
  //   res.json({ message: `Welcome to the dashboard, ${username}!` });
  // });

  // const getTagsForBlog = (blogId) => {
  //   return new Promise((resolve, reject) => {
  //     const sql =
  //       'SELECT tag.tag_id, tag.tag_name FROM blog_tag JOIN tag ON blog_tag.tag_id = tag.tag_id WHERE blog_tag.blog_id = ?';

  //     pool.getConnection((err, connection) => {
  //       if (err) {
  //         console.error('Error getting connection from pool:', err);
  //         res.status(500).json({ error: 'Database connection error' });
  //         return;
  //       }
  //       connection.query(sql, [blogId], (err, results) => {
  //         connection.release();
  //         if (err) {
  //           reject(err);
  //         } else {
  //           // console.log(results);
  //           resolve(results);
  //         }
  //       });
  //     });
  //   });
  // };

  // app.get('/api/dashboard/blog', (req, res) => {
  //   const page = parseInt(req.query.page) || 1; // Current page number, default is 1
  //   const blogsPerPage = 6; // Number of blog posts per page
  //   const offset = (page - 1) * blogsPerPage;

  //   const sqlCount = 'SELECT COUNT(*) AS total FROM blog'; // Query to count total number of blogs
  //   const sql = 'SELECT * FROM blog ORDER BY datetime DESC LIMIT ? OFFSET ?';

  //   pool.getConnection((err, connection) => {
  //     if (err) {
  //       console.error('Error getting connection from pool:', err);
  //       res.status(500).json({ error: 'Database connection error' });
  //       return;
  //     }

  //     connection.query(sqlCount, (err, countResult) => {
  //       connection.release();
  //       if (err) {
  //         console.error('Error counting blog posts:', err);
  //         res.status(500).json({ error: 'Unable to fetch blog posts' });
  //         return;
  //       }

  //       const totalBlogs = countResult[0].total; // Total number of blogs

  //       connection.query(
  //         sql,
  //         [blogsPerPage, offset],
  //         async (err, blogResults) => {
  //           connection.release();
  //           if (err) {
  //             console.error('Error querying blog table:', err);
  //             res.status(500).json({ error: 'Unable to fetch blog posts' });
  //             return;
  //           }

  //           try {
  //             for (const blog of blogResults) {
  //               const tags = await getTagsForBlog(blog.blog_id);
  //               blog.tags = tags;
  //             }

  //             // console.log('Blog posts fetched successfully');
  //             // console.log(blogResults);
  //             const responseObject = {
  //               listBlogs: blogResults,
  //               countBlogs: totalBlogs,
  //             };
  //             // console.log(responseObject);
  //             res.status(200).json(responseObject);
  //           } catch (error) {
  //             console.error('Error fetching tags for blog posts:', error);
  //             res
  //               .status(500)
  //               .json({ error: 'Unable to fetch tags for blog posts' });
  //           }
  //         }
  //       );
  //     });
  //   });
  // });

  // Endpoint to fetch blog posts
  // app.get('/api/blog', (req, res) => {
  //   const page = parseInt(req.query.page) || 1;
  //   const blogsPerPage = 6;
  //   const offset = (page - 1) * blogsPerPage;
  //   const searchQuery = req.query.search || '';

  //   const sqlCount = `
  //     SELECT COUNT(*) AS total
  //     FROM blog
  //     WHERE title LIKE ? OR description LIKE ?
  //   `;
  //   const sql = `
  //     SELECT * FROM blog
  //     WHERE title LIKE ? OR description LIKE ?
  //     ORDER BY datetime DESC
  //     LIMIT ? OFFSET ?
  //   `;
  //   const likeSearchQuery = `%${searchQuery}%`;

  //   pool.getConnection((err, connection) => {
  //     if (err) {
  //       console.error('Error getting connection from pool:', err);
  //       res.status(500).json({ error: 'Database connection error' });
  //       return;
  //     }

  //     connection.query(
  //       sqlCount,
  //       [likeSearchQuery, likeSearchQuery],
  //       (err, countResult) => {
  //         if (err) {
  //           console.error('Error counting blog posts:', err);
  //           connection.release();
  //           res.status(500).json({ error: 'Unable to fetch blog posts' });
  //           return;
  //         }

  //         const totalBlogs = countResult[0].total;

  //         connection.query(
  //           sql,
  //           [likeSearchQuery, likeSearchQuery, blogsPerPage, offset],
  //           async (err, blogResults) => {
  //             if (err) {
  //               console.error('Error querying blog table:', err);
  //               connection.release();
  //               res.status(500).json({ error: 'Unable to fetch blog posts' });
  //               return;
  //             }

  //             try {
  //               const blogsWithTags = await Promise.all(
  //                 blogResults.map(async (blog) => {
  //                   try {
  //                     const tags = await getTagsForBlog(blog.blog_id);
  //                     blog.tags = tags;
  //                     return blog;
  //                   } catch (tagError) {
  //                     console.error('Error fetching tags for blog:', tagError);
  //                     blog.tags = [];
  //                     return blog;
  //                   }
  //                 })
  //               );

  //               const responseObject = {
  //                 listBlogs: blogsWithTags,
  //                 countBlogs: totalBlogs,
  //               };
  //               res.status(200).json(responseObject);
  //             } catch (error) {
  //               console.error('Error processing blog results:', error);
  //               res
  //                 .status(500)
  //                 .json({ error: 'Unable to process blog results' });
  //             } finally {
  //               connection.release();
  //             }
  //           }
  //         );
  //       }
  //     );
  //   });
  // });

  // app.get('/api/blog/:id', (req, res) => {
  //   const blogId = req.params.id;

  //   const sql = 'SELECT * FROM blog WHERE blog_id = ?';

  //   pool.getConnection((err, connection) => {
  //     if (err) {
  //       console.error('Error getting connection from pool:', err);
  //       res.status(500).json({ error: 'Database connection error' });
  //       return;
  //     }
  //     connection.query(sql, [blogId], async (err, blogResults) => {
  //       connection.release();
  //       if (err) {
  //         console.error('Error querying blog table:', err);
  //         res.status(500).json({ error: 'Unable to fetch the blog post' });
  //         return;
  //       }

  //       if (blogResults.length === 0) {
  //         res.status(404).json({ error: 'Blog post not found' });
  //         return;
  //       }

  //       try {
  //         const blog = blogResults[0];
  //         const tags = await getTagsForBlog(blog.blog_id);
  //         blog.tags = tags;

  //         res.status(200).json(blog);
  //       } catch (error) {
  //         console.error('Error fetching tags for the blog post:', error);
  //         res
  //           .status(500)
  //           .json({ error: 'Unable to fetch tags for the blog post' });
  //       }
  //     });
  //   });
  // });
  // // Fetch the older (previous) blog post
  // app.get('/api/blog/:id/previous', (req, res) => {
  //   const blogId = req.params.id;

  //   const sql = `
  //     SELECT * FROM blog
  //     WHERE blog_id < ?
  //     ORDER BY blog_id DESC
  //     LIMIT 1
  //   `;

  //   pool.getConnection((err, connection) => {
  //     if (err) {
  //       console.error('Error getting connection from pool:', err);
  //       res.status(500).json({ error: 'Database connection error' });
  //       return;
  //     }

  //     connection.query(sql, [blogId], async (err, results) => {
  //       connection.release();
  //       if (err) {
  //         console.error('Error fetching previous blog post:', err);
  //         res.status(500).json({ error: 'Unable to fetch previous blog post' });
  //         return;
  //       }

  //       if (results.length === 0) {
  //         res.status(404).json({ error: 'No previous blog post found' });
  //         return;
  //       }

  //       const blog = results[0];
  //       blog.tags = await getTagsForBlog(blog.blog_id);

  //       res.status(200).json(blog);
  //     });
  //   });
  // });

  // // Fetch the newer (next) blog post
  // app.get('/api/blog/:id/next', (req, res) => {
  //   const blogId = req.params.id;

  //   const sql = `
  //     SELECT * FROM blog
  //     WHERE blog_id > ?
  //     ORDER BY blog_id ASC
  //     LIMIT 1
  //   `;

  //   pool.getConnection((err, connection) => {
  //     if (err) {
  //       console.error('Error getting connection from pool:', err);
  //       res.status(500).json({ error: 'Database connection error' });
  //       return;
  //     }
  //     connection.query(sql, [blogId], async (err, results) => {
  //       connection.release();
  //       if (err) {
  //         console.error('Error fetching next blog post:', err);
  //         res.status(500).json({ error: 'Unable to fetch next blog post' });
  //         return;
  //       }

  //       if (results.length === 0) {
  //         res.status(404).json({ error: 'No next blog post found' });
  //         return;
  //       }

  //       const blog = results[0];
  //       blog.tags = await getTagsForBlog(blog.blog_id);

  //       res.status(200).json(blog);
  //     });
  //   });
  // });

  // Track Visit API
  // app.post('/api/track-visit', (req, res) => {
  //   const { uniqueId } = req.body;
  //   const today = new Date().toISOString().split('T')[0];

  //   pool.getConnection((err, connection) => {
  //     if (err) {
  //       console.error('Error getting connection from pool:', err);
  //       res.status(500).json({ error: 'Database connection error' });
  //       return;
  //     }

  //     connection.query(
  //       'INSERT INTO visits (unique_id, date) VALUES (?, ?) ON DUPLICATE KEY UPDATE date = ?',
  //       [uniqueId, today, today],
  //       (err) => {
  //         if (err) {
  //           console.error('Error recording visit:', err);
  //           res.status(500).json({ error: 'Unable to record visit' });
  //         } else {
  //           res.status(200).json({ message: 'Visit recorded' });
  //         }
  //         connection.release();
  //       }
  //     );
  //   });
  // });

  // app.get('/api/stats', (req, res) => {
  //   console.log('0. Received request at /api/stats');

  //   const today = new Date().toISOString().split('T')[0];

  //   pool.getConnection((err, connection) => {
  //     console.log('1. Received request at /api/stats');

  //     if (err) {
  //       console.error('Error getting connection from pool:', err);
  //       res.status(500).json({ error: 'Database connection error' });
  //       return;
  //     }

  //     connection.query(
  //       'SELECT COUNT(DISTINCT unique_id) AS unique_users FROM visits WHERE DATE(date) = ?',
  //       [today],
  //       (err, uniqueUsersResult) => {
  //         if (err) {
  //           console.error('Error fetching unique users:', err);
  //           connection.release();
  //           res.status(500).json({ error: 'Unable to fetch unique users' });
  //           return;
  //         }

  //         const uniqueUsers = uniqueUsersResult[0].unique_users;

  //         connection.query(
  //           'SELECT COUNT(*) AS total_visits FROM visits',
  //           (err, totalVisitsResult) => {
  //             if (err) {
  //               console.error('Error fetching total visits:', err);
  //               res.status(500).json({ error: 'Unable to fetch total visits' });
  //             } else {
  //               res.status(200).json({
  //                 unique_users: uniqueUsers,
  //                 total_visits: totalVisitsResult[0].total_visits,
  //               });
  //             }
  //             console.log('2. Received request at /api/stats');

  //             connection.release();
  //           }
  //         );
  //       }
  //     );
  //   });
  // });

  // app.get('/api/dashboard/inbox', authenticateAdminToken, (req, res) => {
  //   const { username, isAdmin } = req.user;
  //   const page = parseInt(req.query.page) || 1; // Current page number, default is 1
  //   const messagesPerPage = 10; // Number of messages per page

  //   // Calculate the offset to skip records based on the current page
  //   const offset = (page - 1) * messagesPerPage;

  //   const sqlCount = 'SELECT COUNT(*) AS total FROM inbox'; // Query to count total records

  //   pool.getConnection((err, connection) => {
  //     if (err) {
  //       console.error('Error getting connection from pool:', err);
  //       res.status(500).json({ error: 'Database connection error' });
  //       return;
  //     }

  //     connection.query(sqlCount, (err, countResult) => {
  //       connection.release();
  //       if (err) {
  //         console.error('Error counting records in inbox table:', err);
  //         res.status(500).json({ error: 'Unable to fetch messages' });
  //         return;
  //       }
  //       const totalMessages = countResult[0].total; // Total count of messages

  //       const sql =
  //         'SELECT * FROM inbox ORDER BY created_at DESC LIMIT ? OFFSET ?';
  //       connection.query(sql, [messagesPerPage, offset], (err, results) => {
  //         connection.release();
  //         if (err) {
  //           console.error('Error querying inbox table:', err);
  //           res.status(500).json({ error: 'Unable to fetch messages' });
  //           return;
  //         }
  //         console.log('Messages fetched successfully');

  //         if (isAdmin === 0) {
  //           results.forEach((message) => {
  //             message.content = '*'.repeat(message.content.length);
  //           });
  //         }

  //         const responseObject = {
  //           listMessages: results, // Assuming `results` contains the messages
  //           countMessage: totalMessages, // Assuming `totalMessages` is the total count
  //         };
  //         res.status(200).json(responseObject);
  //       });
  //     });
  //   });
  // });

  // // Function to delete blog tags associated with a blog
  // const deleteBlogTags = (blogId) => {
  //   return new Promise((resolve, reject) => {
  //     const deleteTagsQuery = 'DELETE FROM blog_tag WHERE blog_id = ?';

  //     pool.getConnection((err, connection) => {
  //       if (err) {
  //         console.error('Error getting connection from pool:', err);
  //         res.status(500).json({ error: 'Database connection error' });
  //         return;
  //       }
  //       connection.query(deleteTagsQuery, [blogId], (error, result) => {
  //         connection.release();
  //         if (error) {
  //           console.error('Error deleting blog tags:', error);
  //           reject(error);
  //         } else {
  //           resolve();
  //         }
  //       });
  //     });
  //   });
  // };

  // // Delete blog endpoint
  // app.delete('/api/blogs/:blogId', authenticateAdminToken, async (req, res) => {
  //   const { isAdmin } = req.user;
  //   const blogId = req.params.blogId;

  //   // Check if the user is an admin
  //   if (isAdmin === 1) {
  //     try {
  //       // Delete blog tags first
  //       await deleteBlogTags(blogId);

  //       // Get the media URL of the blog
  //       const getMediaUrlQuery = 'SELECT media_url FROM blog WHERE blog_id = ?';

  //       pool.getConnection((err, connection) => {
  //         if (err) {
  //           console.error('Error getting connection from pool:', err);
  //           res.status(500).json({ error: 'Database connection error' });
  //           return;
  //         }
  //         connection.query(
  //           getMediaUrlQuery,
  //           [blogId],
  //           async (error, results) => {
  //             connection.release();
  //             if (error) {
  //               console.error('Error fetching media URL:', error);
  //               res.status(500).json({ error: 'Failed to delete blog' });
  //               return;
  //             }

  //             // If media URL exists, delete the image from Cloudinary
  //             const mediaUrl = results[0].media_url;
  //             if (mediaUrl) {
  //               // Extract the public ID from the Cloudinary URL
  //               const publicId = mediaUrl.split('/').pop().split('.')[0];

  //               // Delete the image using the public ID
  //               try {
  //                 await cloudinary.uploader.destroy(publicId);
  //               } catch (cloudinaryError) {
  //                 console.error(
  //                   'Error deleting image from Cloudinary:',
  //                   cloudinaryError
  //                 );
  //                 res.status(500).json({ error: 'Failed to delete blog' });
  //                 return;
  //               }
  //             }

  //             // Once image is deleted from Cloudinary or if no image exists, delete the blog record
  //             const deleteBlogQuery = 'DELETE FROM blog WHERE blog_id = ?';
  //             connection.query(
  //               deleteBlogQuery,
  //               [blogId],
  //               (deleteError, deleteResult) => {
  //                 connection.release();
  //                 if (deleteError) {
  //                   console.error('Error deleting blog:', deleteError);
  //                   res.status(500).json({ error: 'Failed to delete blog' });
  //                   return;
  //                 }

  //                 console.log('Blog deleted successfully.');
  //                 // Send a success status without any content
  //                 res.sendStatus(204);
  //               }
  //             );
  //           }
  //         );
  //       });
  //     } catch (error) {
  //       console.error('Error deleting blog tags:', error);
  //       res.status(500).json({ error: 'Failed to delete blog' });
  //     }
  //   } else {
  //     // If the user is not an admin, return an unauthorized status
  //     res
  //       .status(403)
  //       .json({ error: 'Unauthorized: Only admins can delete blogs' });
  //   }
  // });

  // app.delete('/api/messages/:messageId', authenticateAdminToken, (req, res) => {
  //   const { isAdmin } = req.user;
  //   const messageId = req.params.messageId;

  //   // Check if the user is an admin
  //   if (isAdmin === 1) {
  //     // Implement logic to delete the message with the given messageId from the database
  //     const sql = 'DELETE FROM inbox WHERE inbox_id = ?';

  //     pool.getConnection((err, connection) => {
  //       if (err) {
  //         console.error('Error getting connection from pool:', err);
  //         res.status(500).json({ error: 'Database connection error' });
  //         return;
  //       }
  //       connection.query(sql, [messageId], (err, result) => {
  //         connection.release();
  //         if (err) {
  //           console.error('Error deleting message:', err);
  //           res.status(500).json({ error: 'Failed to delete message' });
  //           return;
  //         }

  //         console.log('Message deleted successfully.');
  //         res.sendStatus(204); // Send a success status without any content
  //       });
  //     });
  //   } else {
  //     // If the user is not an admin, return an unauthorized status
  //     res
  //       .status(403)
  //       .json({ error: 'Unauthorized: Only admins can delete messages' });
  //   }
  // });

  // app.post('/api/checkout/paymaya', async (req, res) => {
  //   const { amount } = req.body; // Expect card details from the request body
  //   const requestReferenceNumber = uuidv4(); // Generate a unique requestReferenceNumber

  //   const url = 'https://pg-sandbox.paymaya.com/checkout/v1/checkouts';
  //   const options = {
  //     method: 'POST',
  //     headers: {
  //       accept: 'application/json',
  //       'content-type': 'application/json',
  //       authorization: process.env.MAYA_AUTHORIZATION,
  //     },
  //     body: JSON.stringify({
  //       totalAmount: { value: amount, currency: 'PHP' },
  //       redirectUrl: {
  //         success: `${process.env.CORS_ORIGIN}/success`,
  //         failure: `${process.env.CORS_ORIGIN}/failure`,
  //         cancel: `${process.env.CORS_ORIGIN}/failure`,
  //       },
  //       items: [
  //         {
  //           totalAmount: { value: amount },
  //           description: 'donation',
  //           name: 'donation_blog',
  //         },
  //       ],
  //       requestReferenceNumber,
  //     }),
  //   };

  //   try {
  //     const response = await fetch(url, options);
  //     const json = await response.json();
  //     res.json(json);
  //     // TODO maybe save to MySQL in the future version
  //   } catch (err) {
  //     console.error('Error:', err);
  //     res.status(500).json({ error: 'Something went wrong' });
  //   }
  // });

  // app.post('/api/checkout/paypal', async (req, res) => {
  //   const { amount } = req.body;

  //   const auth = Buffer.from(
  //     `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  //   ).toString('base64');
  //   const url = 'https://api.sandbox.paypal.com/v1/payments/payment';

  //   const options = {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       Authorization: `Basic ${auth}`,
  //     },
  //     body: JSON.stringify({
  //       intent: 'sale',
  //       redirect_urls: {
  //         return_url: `${process.env.CORS_ORIGIN}/success`,
  //         cancel_url: `${process.env.CORS_ORIGIN}/failure`,
  //       },
  //       payer: {
  //         payment_method: 'paypal',
  //       },
  //       transactions: [
  //         {
  //           amount: {
  //             total: amount,
  //             currency: 'PHP',
  //           },
  //           description: 'Donation',
  //         },
  //       ],
  //     }),
  //   };

  //   try {
  //     const response = await fetch(url, options);
  //     const json = await response.json();
  //     res.json(json);
  //   } catch (err) {
  //     console.error('Error:', err);
  //     res.status(500).json({ error: 'Something went wrong' });
  //   }
  // });

  // Start the server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}
