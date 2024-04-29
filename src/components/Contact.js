import React, { useState } from 'react';
import { Form, Button } from 'react-bootstrap';
import '../styles/contact.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    message: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const message = formData.get('message');

    try {
      const response = await fetch('http://localhost:5000/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, lastName,  message}),
      });
      if (response.ok) {
        window.location.reload();
      } else {
        console.error('Submission failed:', response.statusText);
        toast.error('Submission Failed');
      }
    } catch (error) {
      console.error('Unable to submit:', error);
      toast.error('Unable to submit. Please try again later.');
    }
  };

  return (
    <div className="contact-form-container">
      <div className="contact-form my-5">
        <h2>Contact Us</h2>
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="firstName">
            <Form.Label>First Name</Form.Label>
            <Form.Control
              className="mb-3"
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group controlId="lastName">
            <Form.Label>Last Name</Form.Label>
            <Form.Control
              className="mb-3"
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </Form.Group>

          <Form.Group controlId="message">
            <Form.Label>Message</Form.Label>
            <Form.Control
              className="mb-4"
              as="textarea"
              rows={3}
              name="message"
              value={formData.message}
              onChange={handleChange}
              minLength={50} // Set minimum character length
              required
            />
          </Form.Group>

          <Button variant="primary" type="submit">
            Submit
          </Button>
        </Form>
      </div>
    </div>
  );
};

export default Contact;
