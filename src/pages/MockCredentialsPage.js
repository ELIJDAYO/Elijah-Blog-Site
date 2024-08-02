import React from 'react';

const MockCredentialsPage = () => {
  const paymayaMockCardDetails = {
    cardType: 'VISA',
    number: '4123450131004443',
    expMonth: '12',
    expYear: '25',
    csc: '123',
    passKey: 'mctest1'
  };

  const paypalMockCardDetails = {
    email: 'sb-ivkma25348970@personal.example.com',
    password: '8i5)<kWj'
  };

  return (
    <div className='m-5'>
      <h2>Mock Credentials</h2>
      <h3>Paymaya</h3>
      <ul>
        <li>Card Type: {paymayaMockCardDetails.cardType}</li>
        <li>Number: {paymayaMockCardDetails.number}</li>
        <li>Expiry Month: {paymayaMockCardDetails.expMonth}</li>
        <li>Expiry Year: {paymayaMockCardDetails.expYear}</li>
        <li>CSC: {paymayaMockCardDetails.csc}</li>
        <li>PassKey: {paymayaMockCardDetails.passKey}</li>
      </ul>
      <h3>Paypal</h3>
      <ul>
        <li>Email: {paypalMockCardDetails.email}</li>
        <li>Password: {paypalMockCardDetails.password}</li>
      </ul>
    </div>
  );
};

export default MockCredentialsPage;
