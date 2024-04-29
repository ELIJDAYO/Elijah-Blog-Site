import '../styles/footer.css';
import React from 'react';
import { FaGithub, FaLinkedin } from 'react-icons/fa'; // Import icons from react-icons library
import { SiPaypal } from 'react-icons/si';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const handleDonate = () => {
    // Redirect user to the donation page
    // You can implement this according to your chosen payment method
  };
  return (
    <footer className="footer bg-dark text-light text-center p-3">
      <div className="container mt-3">
        <div className="row align-items-center-top">
          <div className="col-md-6 d-flex flex-column align-items-center ">
            <p>Follow me on:</p>
            <div className="d-flex align-items-center custom-height">
              <a
                href="https://github.com/ELIJDAYO"
                className="me-3"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaGithub size={24} className="icon" />
              </a>
              <a
                href="https://www.linkedin.com/in/elijah-aaron-dayon-62323a274"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FaLinkedin size={24} className="icon" />
              </a>
            </div>
          </div>
          <div className="col-md-6 d-flex flex-column align-items-center">
            <p>Donate to inspire me to make projects:</p>
            <div className="d-flex align-items-center ">
              <button className="btn btn-secondary" onClick={handleDonate}>
                Donate
              </button>
              <div className="d-flex align-items-center custom-height">
                <SiPaypal
                  size={26}
                  className="ms-3"
                //  onClick={() => handleDonate('paypal')}
                />
                <img
                  src={require('../assets/paymaya.png')}
                  alt="Paymaya"
                  className="ms-3 paymaya-icon"
                />
              </div>
            </div>
          </div>
          <p className='mt-3'>&copy; {currentYear} ELIJDAYO</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
