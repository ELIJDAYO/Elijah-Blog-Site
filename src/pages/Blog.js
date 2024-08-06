import React, { useState, useEffect } from 'react';
import '../styles/blog.css';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Card } from 'react-bootstrap';
import Tag from '../components/Tag';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
import { v4 as uuidv4 } from 'uuid';

const generateDailyUuid = () => {
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  const storedDate = localStorage.getItem('uuidDate');
  let uniqueId;

  if (storedDate === today) {
    uniqueId = localStorage.getItem('uniqueId');
  } else {
    uniqueId = uuidv4();
    localStorage.setItem('uniqueId', uniqueId);
    localStorage.setItem('uuidDate', today);
  }

  return uniqueId;
};


const Blog = () => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPagesBlog, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [uniqueUsers, setUniqueUsers] = useState(0);
  const [totalVisits, setTotalVisits] = useState(0);
  const navigate = useNavigate();
  const [activePageBlog, setActivePage] = useState(() => {
    return parseInt(sessionStorage.getItem('activePageBlog')) || 1;
  });
  const blogsPerPage = 6;
  const uniqueId = localStorage.getItem('uniqueId') || generateDailyUuid();

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/blog?page=${activePageBlog}&search=${searchQuery}`
        );
        if (response.ok) {
          const data = await response.json();
          setBlogs(data.listBlogs);
          setTotalPages(Math.ceil(data.countBlogs / blogsPerPage));
          setLoading(false);
        } else {
          console.error('Error fetching blogs:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching blogs:', error);
      }
    };
    fetchBlogs();
  }, [activePageBlog, searchQuery]);

  useEffect(() => {
    fetch('http://localhost:5000/api/track-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uniqueId }),
    })
      .then(response => response.json())
      .catch(error => console.error('Error tracking visit:', error));

    fetch('http://localhost:5000/api/stats')
      .then(response => response.json())
      .then(data => {
        setUniqueUsers(data.unique_users);
        setTotalVisits(data.total_visits);
      })
      .catch(error => console.error('Error fetching analytics:', error));
  });

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  useEffect(() => {
    sessionStorage.setItem('activePageBlog', activePageBlog);
  }, [activePageBlog]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBlogClick = (blog) => {
    navigate(`/blog/${blog.blog_id}`);
  };

  const handleNextPageBlog = () => {
    setActivePage((prevPage) => {
      const newPage = Math.min(prevPage + 1, totalPagesBlog);
      scrollToTop();
      return newPage;
    });
  };

  const handlePrevPageBlog = () => {
    setActivePage((prevPage) => {
      const newPage = Math.max(prevPage - 1, 1);
      scrollToTop();
      return newPage;
    });
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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="blog-page-container">
      <div className="grid-container">
        <div className="main-content">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div className="blog-list">
                {blogs.map((blog, index) => (
                  <div
                    key={index}
                    className="blog-item"
                    onClick={() => handleBlogClick(blog)}
                  >
                    <Card>
                      <Card.Title className="pt-3">{blog.title}</Card.Title>
                      <Card.Text>{blog.description}</Card.Text>
                      <Card.Text>
                        Tags:
                        {blog.tags && blog.tags.length > 0 ? (
                          blog.tags.map((tag) => (
                            <Tag key={tag.tag_id} tagName={tag.tag_name} />
                          ))
                        ) : (
                          <span className="no-tags">N/A</span>
                        )}
                      </Card.Text>
                      <Card.Text className="pb-4">
                        {formatDate(blog.datetime)}
                      </Card.Text>
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
            </>
          )}
        </div>
        <div className="sidebar">
          <input
            type="text"
            placeholder="Search..."
            className="search-bar"
            value={searchQuery}
            onChange={handleSearchChange}
          />
          <div className="analytics-container">
            <div className="analytics-card">
              <div className="analytics-title">Total Visitors Today</div>
              <div className="analytics-value">{uniqueUsers}</div>
            </div>
            <div className="analytics-card">
              <div className="analytics-title">Total Visits</div>
              <div className="analytics-value">{totalVisits}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;
