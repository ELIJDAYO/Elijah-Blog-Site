import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBlogEditContext } from './BlogEditContext';
import { Form, Button } from 'react-bootstrap';
import '../styles/blogEditPage.css';
import LoadingScreen from '../components/LoadingScreen';
import { toast } from 'react-toastify';
import 'bootstrap-icons/font/bootstrap-icons.css';

function arrayToString(array, key) {
  return array.map((item) => item[key]).join(',');
}
const stringToArray = (str) => {
  if (!str) return [];
  return str.split(',').map((tag) => tag.trim());
};

const BlogEditPage = () => {
  const [formData, setFormData] = useState({
    blog_id: '',
    title: '',
    description: '',
    tags: [],
    media_url: null, // To store media content
  });
  const [isChanged, setIsChanged] = useState(false);
  const { blogId } = useParams();
  const { selectedBlogEdit, discardChanges, updateBlog } = useBlogEditContext();
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    if (selectedBlogEdit) {
      // Update formData when selectedBlogEdit changes
      setFormData({
        blog_id: selectedBlogEdit.blog_id,
        title: selectedBlogEdit.title,
        description: selectedBlogEdit.description,
        tags: arrayToString(selectedBlogEdit.tags, 'tag_name'),
        media_url: selectedBlogEdit.media_url,
      });
      setLoading(false);
    } else {
      const savedBlog = JSON.parse(sessionStorage.getItem('blogToEdit'));
      if (savedBlog) {
        setFormData({
          blog_id: savedBlog.blog_id,
          title: savedBlog.title,
          description: savedBlog.description,
          tags: savedBlog.tags,
          media_url: savedBlog.media_url,
        });
        setLoading(false);
      } else {
        // If blogToEdit is null, navigate to the dashboard
        navigate('/dashboard');
      }
    }
  }, [navigate, selectedBlogEdit]); // Run this effect whenever selectedBlogEdit changes

  useEffect(() => {
    if (selectedBlogEdit) {
      // This effect runs whenever formData changes
      // console.log('global context: ', formData);
      sessionStorage.setItem('blogToEdit', JSON.stringify(formData));
    }
  }, [formData, selectedBlogEdit]); // Run this effect whenever formData changes

  const handleDiscardChanges = () => {
    // Prompt user to confirm discarding changes
    const confirmDiscard = window.confirm('Discard changes?');
    if (confirmDiscard) {
      // Discard changes and navigate back
      discardChanges();
      sessionStorage.removeItem('blogToEdit');
      setIsChanged(false);
      navigate('/dashboard');
    }
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
  const handleTagInputChange = (e) => {
    const tags = e.target.value.split(',').map((tag) => tag.trim());
    setFormData({ ...formData, tags });
    setIsChanged(1);
  };
  const handleSubmit = async (event) => {
    event.preventDefault();

    const formDataToSubmit = new FormData();
    formDataToSubmit.append('blog_id', formData.blog_id);
    formDataToSubmit.append('title', formData.title);
    formDataToSubmit.append('description', formData.description);

    // Check if formData.media is not null or undefined before appending it
    if (formData.media_url) {
      formDataToSubmit.append('media_url', formData.media_url);
    }

    let tags = formData.tags || [];
    if (typeof tags === 'string') {
      tags = stringToArray(tags);
    }
    formDataToSubmit.append('tags', tags.join(','));
    try {
      const response = await fetch('http://localhost:5000/api/posts/update', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token')}`,
        },
        body: formDataToSubmit,
      });

      if (response.ok) {
        // alert('Post created successfully!');
        toast.success('Post created successfully!');
        // setFormData({
        //   title: '',
        //   description: '',
        //   tags: [],
        //   media_url: null,
        // });
        discardChanges();
        sessionStorage.removeItem('blogToEdit');
        setIsChanged(false);
        navigate('/dashboard');
      } else {
        toast.error('Blog eiting is not available for guest account');
        console.error('Failed to edit the selected post:', response.statusText);
      }
    } catch (error) {
      console.error('Error while editing the post:', error);
    }
  };
  const handleMediaChange = (event) => {
    const file = event.target.files[0];
    const maxSizeInBytes = 7 * 1024 * 1024; // 7MB
    if (file && file.size > maxSizeInBytes) {
      alert(
        'File size exceeds the limit of 5MB. Please choose a smaller file.'
      );
      // Clear the file input
      event.target.value = '';
      return;
    }

    // Update the formData state with the selected file
    setFormData({ ...formData, media_url: file });
  };

  const handleRemoveMedia = () => {
    // Update the formData state to remove the media file
    setFormData({ ...formData, media_url: null });
  };
  if (loading) {
    return <LoadingScreen />;
  } else {
    return (
      <div className="blog-edit-container">
        <div className="container">
          <Form className="form-control" onSubmit={handleSubmit}>
            <Form.Group controlId="title">
              <Form.Label className="mt-4">Title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </Form.Group>

            <Form.Group controlId="description" className="mt-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                required
              />
            </Form.Group>

            <Form.Group>
              <Form.Label htmlFor="tags" className="mt-3">
                Tags
              </Form.Label>
              <Form.Control
                type="text"
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={handleTagInputChange}
              />
              <Form.Text className="custom-text">
                Separate tags with commas (e.g., tag1, tag2, tag3)
              </Form.Text>
            </Form.Group>

            <Form.Group>
              <Form.Label className="mt-3">Media</Form.Label>
              {/* Use a file input to allow the user to select the media file */}
              <Form.Control
                type="file"
                id="custom-file"
                name="media"
                accept=".png, .jpg, .jpeg"
                onChange={handleMediaChange}
              />
              {formData.media_url && (
                <div className="image-preview">
                  <img
                    className=""
                    src={
                      typeof formData.media_url === 'string' &&
                      formData.media_url.startsWith(
                        'https://res.cloudinary.com/dbwrmhwuf/image'
                      )
                        ? formData.media_url
                        : URL.createObjectURL(formData.media_url)
                    }
                    alt="Media Preview"
                  />
                  <button
                    className="remove-media-button m-4"
                    onClick={handleRemoveMedia}
                  >
                    <i className="bi bi-x-circle"></i> Remove
                  </button>
                </div>
              )}
              <Form.Text className="custom-text">
                Drop or attach your media content here.
              </Form.Text>
            </Form.Group>

            <Button variant="primary" type="submit" className="mt-3">
              Submit
            </Button>
          </Form>
          <button
            onClick={handleDiscardChanges}
            className="btn btn-danger mb-5"
          >
            Discard Changes
          </button>
        </div>
      </div>
    );
  }
};

export default BlogEditPage;
