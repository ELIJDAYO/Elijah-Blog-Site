import React from 'react';
import '../styles/errorPage.css'; // Import CSS file for styling

const Error404Page = () => {
  return (
    <div className="error-container">
      <div className="error-content">
        <h1>Error 404 - Not Found</h1>
        <p>Requested resource could not be found.</p>
      </div>
    </div>
  );
};

export default Error404Page;
