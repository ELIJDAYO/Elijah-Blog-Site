import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/errorPage.css'; // Import CSS file for styling

const SuccessPage = () => {
  const location = useLocation();
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    // Validate the token or perform any required check
    if (token === 'valid-success-token') {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  }, [location]);

  if (!isValid) {
    <div className="error-container">
      <div className="error-content">
        <h1>Access Denied</h1>
      </div>
    </div>  }

  return (
    // I'm lazy to change the classname
    <div className="error-container">
      <div className="error-content">
        <h1>202 - Success</h1>
        <p>Thanks, I just gained motivation!</p>
      </div>
    </div>
  );
};

export default SuccessPage;
