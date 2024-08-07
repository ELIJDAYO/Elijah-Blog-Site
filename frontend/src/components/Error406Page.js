import '../styles/errorPage.css'; // Import CSS file for styling

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const Error406Page = () => {
  const location = useLocation();
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    // Validate the token or perform any required check
    if (token === 'valid-failure-token') {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  }, [location]);

  if (!isValid) {
    return <>
      <div className="error-container">
        <div className="error-content">
          <h1>Access Denied</h1>
        </div>
    </div>
    </>
  }

  return (
    <div className="error-container">
      <div className="error-content">
        <h1>Error 406 - Not Acceptable</h1>
        <p>Payment Failure. The server failed to process your request.</p>
      </div>
    </div>
  );
};

export default Error406Page;
