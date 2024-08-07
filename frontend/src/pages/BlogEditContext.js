// BlogEditContext.js

import React, { createContext, useState, useContext } from 'react';

// BlogEditContext.js
const BlogEditContext = createContext();

export const BlogEditProvider = ({ children }) => {
  const [selectedBlogEdit, setSelectedBlog] = useState(null);

  const updateBlog = (updatedBlog) => {
    // console.log(updatedBlog);
    setSelectedBlog(updatedBlog);
  };

  const discardChanges = () => {
    setSelectedBlog(null);
  };

  return (
    <BlogEditContext.Provider value={{ selectedBlogEdit, updateBlog, discardChanges }}>
      {children}
    </BlogEditContext.Provider>
  );
};

export const useBlogEditContext = () => useContext(BlogEditContext);
