import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Error501Page from './components/Error501Page';
import Error404Page from './components/Error404Page';
import Error406Page from './components/Error406Page';
import MockCredentialsPage from './pages/MockCredentialsPage';
import SuccessPage from './components/SuccessPage';
import LoginRegisterForm from './pages/LoginRegisterForm';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import Contact from './components/Contact';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import BlogEditPage from './pages/BlogEditPage';
import Donation from './pages/Donation';
import Blog from './pages/Blog';
import BlogPage from './pages/BlogPage';
import { BlogEditProvider } from './pages/BlogEditContext';

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
    sessionStorage.removeItem('blogToEdit');
    setToken('');
    window.location.href = '/login';
  };
  return (
    <Router>
      <BlogEditProvider>
        <div className="app-container">
          <FontLink /> {/* Apply background styles to this container */}
          <Header token={token} handleLogout={handleLogout} />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/501" element={<Error501Page />} />
            <Route path="/donation" element={<Donation />} />

            (token &&
            <Route path="/login" element={<LoginRegisterForm />} />
            )
            <Route
              path="/dashboard"
              element={<Dashboard token={token} setLoading={setLoading} />}
            />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<Error404Page />} />
            <Route path="/failure" element={<Error406Page />} />
            <Route path="/success" element={<SuccessPage /> } />
            <Route path="/mock-credentials" element={<MockCredentialsPage />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogPage />} />

            {/* <Route path="/blog/:id" element={<BlogDetail />} /> */}
            (token &&        
              <Route path="/edit/:blogId" element={<BlogEditPage /> } setLoading={setLoading} />
            )
          </Routes>
          <ToastContainer />
          <Footer />
        </div>
      </BlogEditProvider>
    </Router>
  );
};

export default App;
