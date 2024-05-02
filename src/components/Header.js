import React from 'react';
import { NavLink } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../styles/header.css';

const Header = ({ token, handleLogout }) => {
  return (
    <header className="header">
      <nav className="navbar navbar-expand-lg navbar-dark">
        <div className="container">
          <NavLink
            to="/"
            exact="true"
            className="navbar-brand"
            style={{ textDecoration: 'none' }}
          >
            ELIJDAYO
          </NavLink>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <NavLink
                  to="/"
                  exact="true"
                  className="nav-link"
                  activeclassname="active" //eslint-disable-next-line
                  style={{ textDecoration: 'none' }}
                >
                  About
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/501"
                  className="nav-link"
                  activeclassname="active" //eslint-disable-next-line
                  style={{ textDecoration: 'none' }}
                >
                  Blog
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink
                  to="/contact"
                  className="nav-link"
                  activeclassname="active" //eslint-disable-next-line
                  style={{ textDecoration: 'none' }}
                >
                  Contact
                </NavLink>
              </li>
              <li className="nav-item dropdown">
                <NavLink
                  className="nav-link dropdown-toggle"
                  activeclassname="active" //eslint-disable-next-line
                  to="#"
                  id="navbarDropdown"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Websites
                </NavLink>
                <ul className="dropdown-menu" aria-labelledby="navbarDropdown">
                  <li>
                    <NavLink
                      to="/501"
                      className="dropdown-item"
                      style={{ textDecoration: 'none' }}
                    >
                      AILab
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/501"
                      className="dropdown-item"
                      style={{ textDecoration: 'none' }}
                    >
                      CreativesLab
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/501"
                      className="dropdown-item"
                      style={{ textDecoration: 'none' }}
                    >
                      DataLab
                    </NavLink>
                  </li>
                </ul>
              </li>
              {token ? (
                <li className="nav-item dropdown">
                  <NavLink
                    className="nav-link btn-link dropdown-toggle"
                    activeclassname="active" //eslint-disable-next-line
                    id="navbarDropdown"
                    role="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    to="#"
                  >
                    User
                  </NavLink>
                  <ul
                    className="dropdown-menu"
                    aria-labelledby="navbarDropdown"
                  >
                    <li>
                      <NavLink
                        to="/dashboard"
                        className="dropdown-item"
                        style={{ textDecoration: 'none' }}
                      >
                        Dashboard
                      </NavLink>
                    </li>
                    <li>
                      <button className="dropdown-item" onClick={handleLogout}>
                        Logout
                      </button>
                    </li>
                  </ul>
                </li>
              ) : (
                <li className="nav-item">
                  <NavLink
                    to="/login"
                    className="nav-link"
                    activeclassname="active" //eslint-disable-next-line
                    style={{ textDecoration: 'none' }}
                  >
                    Login
                  </NavLink>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
