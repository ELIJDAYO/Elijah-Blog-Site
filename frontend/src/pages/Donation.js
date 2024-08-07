import React, { useState } from 'react';
import '../styles/donation.css';
import { useNavigate } from 'react-router-dom'; // Import useNavigate


const Donation = () => {
  const [amount, setAmount] = useState(20);
  const [paymentChannel, setPaymentChannel] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const navigate = useNavigate(); // Initialize useNavigate
  const apiUrl = process.env.REACT_APP_API_URL;

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
  };

  const handlePaymentChannelChange = (e) => {
    setPaymentChannel(e.target.value);
  };

  const handlePaymentModeChange = (e) => {
    setPaymentMode(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
// Paymaya
    // const mockCardDetails = {
    //   cardType: 'VISA',
    //   number: '4123450131004443',
    //   expMonth: '12',
    //   expYear: '25',
    //   csc: '123'
    //   passKey: 'mctest1'
    // };

// Paypal
    // const mockCardDetails = {
    //   email: 'sb-ivkma25348970@personal.example.com',
    //   password: '8i5)<kWj',
    // };


    const openMockCredentialsPage = () => {
      const newWindow = window.open('/mock-credentials', '_blank');
      if (newWindow) newWindow.opener = null; // Ensures the new window is opened
    };

    if (paymentChannel === 'paymaya' && paymentMode === 'sandbox') {
      try {
        const response = await fetch(`${apiUrl}/api/checkout/paymaya`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ amount })
        });
        const data = await response.json();
        if (data.redirectUrl) {
          openMockCredentialsPage(); // Open mock credentials in a new tab
          window.location.href = data.redirectUrl; // Redirect to the sandbox checkout page
        } else {
          console.error('No redirect URL found in response:', data);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    } else if (paymentChannel === 'paypal' && paymentMode === 'sandbox') {
      try {
        const response = await fetch(`${apiUrl}/api/checkout/paypal`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ amount })
        });
        const data = await response.json();
        if (data.links) {
          const approvalUrl = data.links.find(link => link.rel === 'approval_url').href;
          openMockCredentialsPage(); // Open mock credentials in a new tab
          window.location.href = approvalUrl; // Redirect to the sandbox checkout page
        } else {
          console.error('No approval URL found in response:', data);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    } 
    else if (paymentChannel === 'paypal' && paymentMode === 'live') {
      // Construct the PayPal URL
      const paypalUrl = `https://paypal.me/buildrocket?amount=${amount}&currency=PHP`;
      // Open the PayPal URL in a new tab or window
      window.open(paypalUrl, '_blank');
    } else {
      alert('Please select PayPal as payment channel and Live as payment mode.');
    }
  };

  return (
    <div className="donation-container">
      <div className="box-container mb-3">
        <h2>Donate</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="amount" className="form-label">
              Choose amount (₱20 - ₱200):
            </label>
            <input
              type="range"
              className="form-range"
              id="amount"
              name="amount"
              min="20"
              max="200"
              value={amount}
              onChange={handleAmountChange}
            />
            <span>₱{amount}</span>
          </div>

          <div className="mb-3">
            <label htmlFor="paymentChannel" className="form-label">
              Select payment channel:
            </label>
            <select
              className="form-select"
              id="paymentChannel"
              name="paymentChannel"
              value={paymentChannel}
              onChange={handlePaymentChannelChange}
            >
              <option value="">Select payment channel</option>
              <option value="paymaya">PayMaya</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label">Select payment mode:</label>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="paymentMode"
                id="sandboxMode"
                value="sandbox"
                checked={paymentMode === 'sandbox'}
                onChange={handlePaymentModeChange}
              />
              <label className="form-check-label" htmlFor="sandboxMode">
                Sandbox (for testing)
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="paymentMode"
                id="liveMode"
                value="live"
                checked={paymentMode === 'live'}
                onChange={handlePaymentModeChange}
              />
              <label className="form-check-label" htmlFor="liveMode">
                Live (actual payment)
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!paymentChannel || !paymentMode}
          >
            Donate
          </button>
        </form>
      </div>
    </div>
  );
};

export default Donation;