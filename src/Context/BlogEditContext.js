// BlogEditContext.js

import React, { createContext, useState, useContext } from 'react';

const BlogEditContext = createContext();

export const BlogEditProvider = ({ children }) => {
  const [blog, setBlog] = useState(null);

  const updateBlog = (updatedBlog) => {
    setBlog(updatedBlog);
  };

  const discBefoardChanges = () => {
    setBlog(null);
  };

  return (
    <BlogEditContext.Provider value={{ blog, updateBlog, discardChanges }}>
      {children}
    </BlogEditContext.Provider>
  );
};

export const useBlogEdit = () => useContext(BlogEditContext);
