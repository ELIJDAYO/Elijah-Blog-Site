import React, { useState, useEffect } from 'react';

const BlogEditPage = ({ blog }) => {
  const [formData, setFormData] = useState({
    title: blog.title,
    description: blog.description,
    tags: blog.tags,
  });

  const [originalData, setOriginalData] = useState({
    title: blog.title,
    description: blog.description,
    tags: blog.tags,
  });

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDataChanged()) {
        e.preventDefault();
        e.returnValue = ''; // For Chrome
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const isDataChanged = () => {
    return (
      formData.title !== originalData.title ||
      formData.description !== originalData.description ||
      formData.tags !== originalData.tags
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSaveChanges = () => {
    // Implement logic to save changes
  };

  return (
    <div>
      <h1>Edit Blog Post</h1>
      <form>
        <div>
          <label>Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label>Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
          />
        </div>
        <div>
          <label>Tags</label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleInputChange}
          />
        </div>
        <button onClick={handleSaveChanges}>Save Changes</button>
      </form>
    </div>
  );
};

export default BlogEditPage;
