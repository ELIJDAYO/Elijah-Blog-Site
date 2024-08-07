import React from 'react';
import '../styles/errorPage.css'; // Import CSS file for styling

const Error501Page = () => {
  return (
    <div className="error-container">
      <div className="error-content">
        <h1>Error 501 - Not Implemented</h1>
        <p>This feature is not yet implemented. Please try again later.</p>
      </div>
    </div>
  );
};

export default Error501Page;