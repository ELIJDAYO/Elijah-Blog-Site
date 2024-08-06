import React, { useEffect, useState } from 'react';
import { Form, Button, Tab, Tabs, Card } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';
import { toast } from 'react-toastify';
import MessageModal from '../modal/MessageModal';
import BlogModal from '../modal/BlogModal';
import { BsThreeDotsVertical, BsTrash } from 'react-icons/bs';
import Tag from './Tag';
import { useBlogEditContext } from '../pages/BlogEditContext';
import LoadingScreen from '../components/LoadingScreen';

const Dashboard = ({ token }) => {
  const [activePageBlog, setActivePageBlog] = useState(1);
  const [activePageMessage, setActivePageMessage] = useState(1);
  const blogsPerPage = 6;
  const messagesPerPage = 10;
  const [loading, setLoading] = useState(true);
  const [blogs, setBlogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [totalPagesBlog, setTotalPagesBlog] = useState(1);
  const [totalPagesMessage, setTotalPagesMessage] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [],
    media_url: null
  });
  const [selectedTab] = useState(sessionStorage.getItem('tab') || 'view');
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const { updateBlog } = useBlogEditContext();
  const apiUrl = process.env.REACT_APP_API_URL;

  const navigate = useNavigate();
  useEffect(() => {
    const authenticateUser = async () => {
      try {
        const last_token = token ? token : sessionStorage.getItem('token');
        const response = await fetch(`${apiUrl}/api/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ last_token }),
        });

        if (response.ok) {
          setLoading(false);
        } else {
          // alert('Session expired');
          sessionStorage.removeItem('token');
          window.location.reload();
          navigate('/login');
        }
      } catch (error) {
        console.error('Error authenticating user:', error);
        toast.error('Invalid Entry');
        sessionStorage.removeItem('token');
        navigate('/login');
      }
    };

    if (!token && !sessionStorage.getItem('token')) {
      // Redirect to login page if token is not present
      navigate('/login');
    } else {
      // Authenticate the user
      authenticateUser();
    }
  }, [token, navigate]);
  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/dashboard/blog?page=${activePageBlog}`
        );
        if (response.ok) {
          const data = await response.json();
          setBlogs(data.listBlogs);
          setTotalPagesBlog(data.countBlogs);
          setLoading(false);
          // Extract total pages from response header
          const totalPages = Math.ceil(data.countBlogs / blogsPerPage);
          setTotalPagesBlog(Math.max(totalPages, 1));
        } else {
          console.error('Error fetching messages:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    fetchBlogs();
  }, [activePageBlog]);
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(
          `${apiUrl}/api/dashboard/inbox?page=${activePageMessage}`,
          {
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem('token')}`,
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(data.listMessages);
          setLoading(false);
          // Extract total pages from response header
          const totalPages = Math.ceil(data.countMessage / messagesPerPage);
          setTotalPagesMessage(Math.max(totalPages, 1));
        } else {
          console.error('Error fetching messages:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    fetchMessages();
  }, [activePageMessage]);
  
  const handleTabSelect = (eventKey) => {
    sessionStorage.setItem('tab', eventKey);
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  const handleTagInputChange = (e) => {
    const tags = e.target.value.split(',').map((tag) => tag.trim());
    setFormData({ ...formData, tags });
  };
  const handleMediaChange = (event) => {
    const file = event.target.files[0];
    const maxSizeInBytes = 7 * 1024 * 1024; // 7MB

    if (file && file.size > maxSizeInBytes) {
      alert(
        'File size exceeds the limit of 5MB. Please choose a smaller file.'
      );
      // Clear the file input
      event.target.value = '';
      return;
    }

    // Update the formData state with the selected file
    setFormData({ ...formData, media_url: file });
  };
  const handleSubmit = async (event) => {
    event.preventDefault();

    const formDataToSubmit = new FormData();
    formDataToSubmit.append('title', formData.title);
    formDataToSubmit.append('description', formData.description);

    if (formData.media_url) {
      formDataToSubmit.append('media_url', formData.media_url);
    }

    const tags = formData.tags || [];
    formDataToSubmit.append('tags', tags.join(','));

    try {
      const response = await fetch(`${apiUrl}/api/posts/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
        body: formDataToSubmit,
      });

      if (response.ok) {
        // alert('Post created successfully!');
        toast.success('Post created successfully!');
        // Reset form data
        setFormData({
          title: '',
          description: '',
          tags: [],
          media_url: null,
        });
      } else {
        toast.error('Blog posting is not available for guest account');
        console.error('Failed to create post:', response.statusText);
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };
  const handlePrevPageBlog = () => {
    setActivePageBlog((prevPage) => {
      const newPage = Math.max(prevPage - 1, 1);
      scrollToTop();
      return newPage;
    });
  };
  const handleNextPageBlog = () => {
    setActivePageBlog((prevPage) => {
      const newPage = Math.min(prevPage + 1, totalPagesBlog);
      scrollToTop();
      return newPage;
    });
  };
  const handlePrevPageMessage = () => {
    setActivePageMessage((prevPage) => {
      const newPage = Math.max(prevPage - 1, 1);
      scrollToTop();
      return newPage;
    });
  };
  const handleNextPageMessage = () => {
    setActivePageMessage((prevPage) => {
      const newPage = Math.min(prevPage + 1, totalPagesMessage);
      scrollToTop();
      return newPage;
    });
  };
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scrolls to the top of the page smoothly
  };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };
  const handleBlogClick = (blog) => {
    setSelectedBlog(blog);
  };
  const handleOptionClick = async (e) => {
    e.stopPropagation();
    e.preventDefault();
  };
  const handleMessageClick = (message) => {
    setSelectedMessage(message);
  };
  const handleCloseModal = () => {
    setSelectedBlog(null);
    setSelectedMessage(null);
  };
  const handleBlogDelete = async (blogId, e) => {
    e.stopPropagation(); // Prevent event propagation
    try {
      const response = await fetch(
        `${apiUrl}/api/blogs/${blogId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        // Remove the deleted message from the messages array
        setBlogs((prevBlogs) =>
          prevBlogs.filter((blog) => blog.blog_id !== blogId)
        );
        // Show success message after deleting the message
        toast.success('Blog post deleted successfully.');
      } else {
        toast.error('Unauhorized Operation');
        console.error('Failed to delete blog:', response.statusText);
      }
    } catch (error) {
      toast.error('Blog was not deleted');
      console.error('Error deleting blog:', error);
    }
  };
  const handleBlogEdit = async (blog, e) => {
    e.stopPropagation();
    // console.log(blog)
    updateBlog(blog);
    navigate(`/edit/${blog.blog_id}`);
  };
  const handleMessageDelete = async (messageId, e) => {
    e.stopPropagation(); // Prevent event propagation

    try {
      const response = await fetch(
        `${apiUrl}/api/messages/${messageId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        // Remove the deleted message from the messages array
        setMessages((prevMessages) =>
          prevMessages.filter((message) => message.inbox_id !== messageId)
        );
        // Show success message after deleting the message
        toast.success('Message deleted successfully.');
      } else {
        toast.error('Unauhorized Operation');
        console.error('Failed to delete message:', response.statusText);
      }
    } catch (error) {
      toast.error('Message was not deleted');
      console.error('Error deleting message:', error);
    }
  };
  if (loading) {
    return <LoadingScreen />;
  }
  return (
    <div className="container mt-4 dashboard-container">
      <h1>Dashboard</h1>
      <Tabs
        defaultActiveKey={selectedTab}
        id="dashboard-tabs"
        onSelect={handleTabSelect}
      >
        <Tab eventKey="view" title="View">
          <div className="mt-4">
            <div className="row">
              {blogs.map((blogPost) => (
                <div key={blogPost.blog_id} className="col-lg-4 col-md-6 mb-4">
                  <Card
                    // key={blogPost.blog_id}
                    className="mb-3 position-relative"
                    onClick={() => handleBlogClick(blogPost)}
                  >
                    <Card.Body>
                      <Card.Title>{blogPost.title}</Card.Title>
                      <Card.Text>{blogPost.description}</Card.Text>
                      <Card.Text>
                        Tags:{' '}
                        {blogPost.tags && blogPost.tags.length > 0 ? (
                          blogPost.tags.map((tag) => (
                            <Tag key={tag.tag_id} tagName={tag.tag_name} />
                          ))
                        ) : (
                          <span className="no-tags">N/A</span>
                        )}
                      </Card.Text>
                      <Card.Text>{formatDate(blogPost.datetime)}</Card.Text>

                      <div className="dropdown">
                        <BsThreeDotsVertical
                          className="dropdown-toggle"
                          id={`dropdownMenuButton-${blogPost.blog_id}`}
                          role="button"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                          onClick={(e) => handleOptionClick(e)}
                        />
                        <ul
                          className="dropdown-menu"
                          aria-labelledby={`dropdownMenuButton-${blogPost.blog_id}`}
                        >
                          <li>
                            <span
                              className="dropdown-item"
                              onClick={(e) => handleBlogEdit(blogPost, e)}
                            >
                              Edit
                            </span>
                          </li>
                          <li>
                            <span
                              className="dropdown-item"
                              onClick={(e) => handleBlogDelete(blogPost.blog_id, e)}
                            >
                              Delete
                            </span>
                          </li>
                        </ul>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              ))}
              <BlogModal blog={selectedBlog} onClose={handleCloseModal} />
            </div>
            <div className="pagination-icons">
              <FaChevronLeft
                className="pagination-icon"
                onClick={handlePrevPageBlog}
              />
              <span>
                Page {activePageBlog} of {totalPagesBlog}
              </span>
              <FaChevronRight
                className="pagination-icon"
                onClick={handleNextPageBlog}
              />
            </div>
          </div>
        </Tab>
        <Tab eventKey="create" title="Create">
          <Form onSubmit={handleSubmit} className='create-container'>
            <Form.Group controlId="title">
              <Form.Label className="mt-4">Title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="description" className="mt-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Form.Group>
              <Form.Label htmlFor="tags" className="mt-3">
                Tags
              </Form.Label>
              <Form.Control
                type="text"
                id="tags"
                name="tags"
                value={formData.tags.length > 0 ? formData.tags.join(',') : ''}
                onChange={handleTagInputChange}
              />
              <Form.Text className="custom-text">
                Separate tags with commas (e.g., tag1, tag2, tag3)
              </Form.Text>
            </Form.Group>

            <Form.Group>
              <Form.Label className="mt-3">Media</Form.Label>
              {/* Use a file input to allow the user to select the media file */}
              <Form.Control
                type="file"
                id="custom-file"
                name="media_url"
                accept=".png, .jpg, .jpeg" // Limit file types to PNG, JPG, and JPEG
                onChange={handleMediaChange}
              />
              {/* Display the preview of the uploaded image */}
              {formData.media_url && (
                <div className="image-preview">
                  <img
                    className=""
                    src={URL.createObjectURL(formData.media_url)}
                    alt="Media Preview"
                  />
                </div>
              )}
              <Form.Text className="custom-text">
                Drop or attach your media content here.
              </Form.Text>
            </Form.Group>

            <Button variant="primary" type="submit" className="mt-3">
              Submit
            </Button>
          </Form>
        </Tab>
        <Tab eventKey="inbox" title="Inbox">
          <div className="row mt-5">
            <div
              className="col-md-12 mb-3"
              style={{ overflowY: 'auto', maxHeight: '90vh' }}
            >
              {messages.map((message) => (
                <Card
                  key={message.inbox_id}
                  className="mb-3 position-relative"
                  onClick={() => handleMessageClick(message)}
                >
                  <Card.Body>
                    <Card.Title>{message.source_title}</Card.Title>
                    <Card.Text>{message.content.substring(0, 50)}...</Card.Text>
                    <Card.Text>{formatDate(message.created_at)}</Card.Text>
                    <BsTrash
                      className="position-absolute top-0 end-0 m-2"
                      style={{ cursor: 'pointer', fontSize: '32px' }} // Adjust the fontSize here
                      onClick={(e) => handleMessageDelete(message.inbox_id, e)}
                    />
                  </Card.Body>
                </Card>
              ))}
            </div>
            <MessageModal
              message={selectedMessage}
              onClose={handleCloseModal}
            />
          </div>
          <div className="pagination-icons">
            <FaChevronLeft
              className="pagination-icon"
              onClick={handlePrevPageMessage}
            />
            <span>
              Page {activePageMessage} of {totalPagesMessage}
            </span>
            <FaChevronRight
              className="pagination-icon"
              onClick={handleNextPageMessage}
            />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
};

export default Dashboard;
