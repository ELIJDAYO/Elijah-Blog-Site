import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const BlogModal = ({ blog, onClose }) => {
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
    <Modal show={!!blog} onHide={onClose} size="lg" className='text-black'>
      <Modal.Header closeButton>
        <Modal.Title>{blog && blog.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div>
          <strong>Image:</strong>
          {blog && blog.media_url ? (
            <img
              src={blog.media_url}
              className="img-fluid image-preview mx-5"
              alt={blog.title}
            />
          ) : (
            'N/A'
          )}
        </div>
        <br />
        <div>
          <strong>Description:</strong> {blog && blog.description}
        </div>
        <div>
          <br />
          <strong>Tags:</strong>{' '}
          {blog && blog.tags && blog.tags.map((tag) => tag.tag_name).join(', ')}
        </div>
        <div>
          <br />
          <strong>Datetime:</strong> {blog && formatDate(blog.datetime)}
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

export default BlogModal;
