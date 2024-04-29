import React, { useEffect, useState } from 'react';
import {
  Form,
  Button,
  Tab,
  Tabs,
  Card,
  DropdownButton,
  Dropdown,
} from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';
import { toast } from 'react-toastify';

const Dashboard = ({ token }) => {
  const [activePageBlog, setActivePageBlog] = useState(1);
  const [activePageMessage, setActivePageMessage] = useState(1);
  const blogsPerPage = 6;
  const messagesPerPage = 10;
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [],
    media: null, // To store media content
  });
  const [selectedTab, setSelectedTab] = useState(sessionStorage.getItem('tab') || 'view');
  const navigate = useNavigate();
  useEffect(() => {
    const authenticateUser = async () => {
      try {
        const last_token = token ? token : sessionStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({last_token}),
        });

        if (response.ok) {
          setLoading(false);
        } else {
          alert('Session expired');
          sessionStorage.removeItem('token');
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

  if (loading) {
    return <div>Loading...</div>;
  }

  // Sample blog data
  const blogs = [
    {
      id: 1,
      title: 'Blog 1',
      description: 'Description of Blog 1',
      tags: ['Tag1', 'Tag2'],
    },
    {
      id: 2,
      title: 'Blog 2',
      description: 'Description of Blog 2',
      tags: ['Tag1', 'Tag3'],
    },
    {
      id: 3,
      title: 'Blog 1',
      description: 'Description of Blog 1',
      tags: ['Tag1', 'Tag2'],
    },
    {
      id: 4,
      title: 'Blog 2',
      description: 'Description of Blog 2',
      tags: ['Tag1', 'Tag3'],
    },
    {
      id: 5,
      title: 'Blog 1',
      description: 'Description of Blog 1',
      tags: ['Tag1', 'Tag2'],
    },
    {
      id: 6,
      title: 'Blog 2',
      description: 'Description of Blog 2',
      tags: ['Tag1', 'Tag3'],
    },
    {
      id: 7,
      title: 'Blog 1',
      description: 'Description of Blog 1',
      tags: ['Tag1', 'Tag2'],
    },
    {
      id: 8,
      title: 'Blog 2',
      description: 'Description of Blog 2',
      tags: ['Tag1', 'Tag3'],
    },
  ];
  const messages = [
    {
      id: 1,
      name: 'John Doe',
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      datetime: '2024-04-13T12:00:00',
    },
    {
      id: 2,
      name: 'Jane Smith',
      description:
        'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
      datetime: '2024-04-12T09:30:00',
    },
  ];
  const totalBlogs = blogs.length;
  const totalPagesBlog = Math.ceil(totalBlogs / blogsPerPage);
  const indexOfLastBlog = activePageBlog * blogsPerPage;
  const indexOfFirstBlog = indexOfLastBlog - blogsPerPage;
  const currentBlogs = blogs.slice(indexOfFirstBlog, indexOfLastBlog);

  const totalMessages = messages.length;
  const totalPagesMessage = Math.ceil(totalMessages / messagesPerPage);
  const indexOfLastMessage = activePageMessage * messagesPerPage;
  const indexOfFirstMessage = indexOfLastMessage - messagesPerPage;
  const currentMessages = messages.slice(
    indexOfFirstMessage,
    indexOfLastMessage
  );
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
    setFormData({ ...formData, media: file });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formDataToSubmit = new FormData();
    formDataToSubmit.append('title', formData.title);
    formDataToSubmit.append('description', formData.description);

    // Check if formData.media is not null or undefined before appending it
    if (formData.media) {
      formDataToSubmit.append('media', formData.media);
    }

    const tags = formData.tags || [];
    formDataToSubmit.append('tags', tags.join(','));
    formDataToSubmit.append('token', token);

    try {
      const response = await fetch('http://localhost:5000/api/posts/create', {
        method: 'POST',
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
          media: null,
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
    if (activePageBlog > 1) {
      setActivePageBlog(activePageBlog - 1);
    }
  };
  const handleNextPageBlog = () => {
    if (activePageBlog < totalPagesBlog) {
      setActivePageBlog(activePageBlog + 1);
    }
  };
  const handlePrevPageMessage = () => {
    if (activePageMessage > 1) {
      setActivePageMessage(activePageMessage - 1);
    }
  };
  const handleNextPageMessage = () => {
    if (activePageMessage < totalPagesMessage) {
      setActivePageBlog(activePageMessage + 1);
    }
  };
  return (
    <div className="container mt-4 dashboard-container">
      <h1>Dashboard</h1>
      <Tabs defaultActiveKey={selectedTab} id="dashboard-tabs" onSelect={handleTabSelect}>
        <Tab eventKey="view" title="View">
          <div className="mt-4">
            <div className="row">
              {currentBlogs.map((blog) => (
                <div key={blog.id} className="col-lg-4 col-md-6 mb-4">
                  <Card>
                    <Card.Body>
                      <Card.Title>{blog.title}</Card.Title>
                      <Card.Text>{blog.description}</Card.Text>
                      <Card.Text>Tags: {blog.tags.join(', ')}</Card.Text>
                      <DropdownButton id="dropdown-basic-button" title="...">
                        <Dropdown.Item>Edit</Dropdown.Item>
                        <Dropdown.Item>Delete</Dropdown.Item>
                      </DropdownButton>
                    </Card.Body>
                  </Card>
                </div>
              ))}
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
          <h2 className="mt-3">Create Post</h2>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="title">
              <Form.Label className="mt-3">Title</Form.Label>
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
                name="media"
                accept=".png, .jpg, .jpeg" // Limit file types to PNG, JPG, and JPEG
                onChange={handleMediaChange}
              />
              {/* Display the preview of the uploaded image */}
              {formData.media && (
                <div className="image-preview">
                  <img
                    className=""
                    src={URL.createObjectURL(formData.media)}
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
          <h2>Inbox</h2>
          <div className="row">
            {currentMessages.map((message) => (
              <div key={message.id} className="col-md-12 mb-3">
                <Card>
                  <Card.Body>
                    <Card.Title>{message.name}</Card.Title>
                    <Card.Text>
                      {message.description.substring(0, 50)}...
                    </Card.Text>
                    <Card.Text>{message.datetime}</Card.Text>
                  </Card.Body>
                </Card>
              </div>
            ))}
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
