// Donation.js
import React, { useState } from 'react';
import '../styles/donation.css';

const Donation = () => {
  const [amount, setAmount] = useState(20);
  const [paymentChannel, setPaymentChannel] = useState('');
  const [paymentMode, setPaymentMode] = useState('');

  const handleAmountChange = (e) => {
    setAmount(e.target.value);
  };

  const handlePaymentChannelChange = (e) => {
    setPaymentChannel(e.target.value);
  };

  const handlePaymentModeChange = (e) => {
    setPaymentMode(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here, e.g., send data to backend or process payment
    console.log('Submitted:', { amount, paymentChannel, paymentMode });
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
