import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Error501Page from './components/Error501Page';
import Error404Page from './components/Error404Page';
import LoginRegisterForm from './pages/LoginRegisterForm';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import Contact from './components/Contact';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const FontLink = () => (
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&display=swap"
  />
);

const App = () => {
  const [token, setToken] = useState('');
  const [, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = sessionStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      setTimeout(() => {
        setLoading(false);
      }, 100);
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    setToken('');
    window.location.reload(); 
  };
  return (
    <Router>
      <div className="app-container">
        <FontLink /> {/* Apply background styles to this container */}
        <Header token={token} handleLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/501" element={<Error501Page />} />
          (token && 
            <Route path="/login" element={<LoginRegisterForm />} />
          )
          <Route
            path="/dashboard"
            element={<Dashboard token={token} setLoading={setLoading} />}
          />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<Error404Page />} />
          {/* Uncomment and configure other routes as needed */}
          {/* <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogDetail />} />
           */}
        </Routes>
        <ToastContainer />
        <Footer />
      </div>
    </Router>
  );
};

export default App;
