// Tag.js
import React from 'react';
import '../styles/tag.css';

const Tag = ({ tagName }) => {
  return (
    <span className="tag">{tagName}</span>
  );
};

export default Tag;
