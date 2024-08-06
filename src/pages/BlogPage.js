import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/blogpage.css';
import Tag from '../components/Tag';
import { FaArrowLeft, FaArrowUp, FaArrowRight } from 'react-icons/fa';
import LoadingScreen from '../components/LoadingScreen';
const BlogPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/blog/${id}`);
        if (response.ok) {
          const data = await response.json();
          setBlog(data);
          setLoading(false);
        } else {
          console.error('Error fetching blog:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching blog:', error);
      }
    };
    fetchBlog();
  }, [id]);
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scrolls to the top of the page smoothly
  };
  const handleBackClick = () => {
    scrollToTop();
    navigate(`/blog`);
  };

  const handleOlderPostClick = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/blog/${id}/previous`
      );
      if (response.ok) {
        scrollToTop();
        const data = await response.json();
        navigate(`/blog/${data.blog_id}`);
      } else {
        console.error('Error fetching older post:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching older post:', error);
    }
  };

  const handleNewerPostClick = async () => {
    try {
      scrollToTop();
      const response = await fetch(`http://localhost:5000/api/blog/${id}/next`);
      if (response.ok) {
        const data = await response.json();
        navigate(`/blog/${data.blog_id}`);
      } else {
        console.error('Error fetching newer post:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching newer post:', error);
    }
  };

  if (loading) {
    return <LoadingScreen></LoadingScreen>;
  }

  return (
    <div>
      <div className="blog-page">
        <h1>{blog.title}</h1>
        <p>{blog.description}</p>
        {blog.media_url && (
          <img src={blog.media_url} alt={blog.title} className="blog-image" />
        )}
        <div className="tags">
          Tags:
          {blog.tags && blog.tags.length > 0 ? (
            blog.tags.map((tag) => (
              <Tag key={tag.tag_id} tagName={tag.tag_name} />
            ))
          ) : (
            <span className="no-tags">N/A</span>
          )}
        </div>
        <div className="navigation-buttons">
          <button className="blogpage-button" onClick={handleOlderPostClick}>
            <FaArrowLeft /> Older Post
          </button>
          <button className="blogpage-button" onClick={handleBackClick}>
            <FaArrowUp /> Back to Blogs
          </button>
          <button className="blogpage-button" onClick={handleNewerPostClick}>
            Newer Post <FaArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlogPage;
