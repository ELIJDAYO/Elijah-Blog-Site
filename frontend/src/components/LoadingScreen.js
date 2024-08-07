import React from 'react';
import '../styles/loadingScreen.css';

function LoadingScreen() {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <div className="loading-text">Loading...</div>
    </div>
  );
}

export default LoadingScreen;
