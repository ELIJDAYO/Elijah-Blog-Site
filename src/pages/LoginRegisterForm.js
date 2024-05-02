import React, { useState, useEffect } from 'react';
import '../styles/loginRegisterForm.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const LoginRegisterForm = () => {
  const [loginForm, setLoginForm] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      setLoggedIn(true);
    }
    setLoading(false); // Remove loading spinner after checking token
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        const { token } = await response.json(); // Extract username from the response
        sessionStorage.setItem('token', token);
        setLoggedIn(true);
        window.location.reload();
      } else {
        console.error('Login failed:', response.statusText);
        toast.error('Login failed. Please check your username and password.');
      }
    } catch (error) {
      console.error('Error logging in:', error);
      toast.error('Error logging in. Please try again later.');
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');
    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        // Redirect to login page after successful registration
        setLoggedIn(true);
      } else {
        console.error('Registration failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error registering:', error);
    }
  };

  return (
    <div>
      {loading ? (
        // Show loading spinner or splash screen while waiting
        <div className="loading-spinner welcome-container">Loading...</div>
      ) : loggedIn ? (
        // Show welcome message and logout button if logged in
        <div className="welcome-container">
          <p>Welcome!</p>
        </div>
      ) : (
        <div className="login-register-container">
          <div className="login-register-form my-5">
            <h2>{loginForm ? 'Log In' : 'Register'}</h2>
            <form
              onSubmit={loginForm ? handleLoginSubmit : handleRegisterSubmit}
            >
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  pattern=".{5,}"
                  title="Username must be at least 5 characters long"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  pattern=".{6,}"
                  title="Password must be at least 6 characters long"
                  required
                  className="password-input"
                />
                <div className="password-container">
                  <input
                    type="checkbox"
                    id="showPassword"
                    onChange={() => setShowPassword(!showPassword)}
                  />
                  <label htmlFor="showPassword" className="show-password-label">
                    Show Password
                  </label>
                </div>
              </div>
              {!loginForm && (
                <div className="form-group">
                  <label htmlFor="confirm-password">Confirm Password</label>
                  <input
                    type="password"
                    id="confirm-password"
                    name="confirm-password"
                    required
                  />
                </div>
              )}
              <button type="submit" className="my-3">
                {loginForm ? 'Log In' : 'Register'}
              </button>
            </form>

            <p>
              {loginForm
                ? "Don't have an account? "
                : 'Already have an account? '}
              <span onClick={() => setLoginForm(!loginForm)}>
                {loginForm ? 'Register' : 'Log In'}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginRegisterForm;
