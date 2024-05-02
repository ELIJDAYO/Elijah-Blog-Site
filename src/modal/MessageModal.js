import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const MessageModal = ({ message, onClose }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };
  return (
    <Modal show={!!message} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{message && message.source_title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div>
          <strong>Content</strong><br></br>{message && message.content}
        </div>
        <div><br></br>
          <strong>Posted at: </strong> {message && formatDate(message.created_at)}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MessageModal;
