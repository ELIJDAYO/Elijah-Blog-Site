import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import profileImage from '../assets/profile2.jpg';
import youtubeVideos from '../assets/projects/youtube_video.json';
import facebookVideos from '../assets/projects/facebook_video.json';
import randomPosts from '../assets/projects/random_post.json';
import githubProjects from '../assets/projects/github_projects.json';
import aboutMe from '../assets/aboutme.json';
import Education from '../components/Education';
import Skills from '../components/Skills';
import '../styles/home.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';

const Home = () => {
  const [showButton, setShowButton] = useState(false);

  // Function to handle scroll event
  const handleScroll = () => {
    // Show the button when user scrolls down
    if (window.scrollY > 100) {
      setShowButton(true);
    } else {
      setShowButton(false);
    }
  };

  // Function to scroll to the top of the page
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth', // Smooth scroll animation
    });
  };

  useEffect(() => {
    // Get a reference to the strip columns
    const stripColumn1 = document.querySelector('.strip-column1');
    const stripColumn2 = document.querySelector('.strip-column2');

    // Check if both strip columns are present
    if (stripColumn1 && stripColumn2) {
      // Calculate the initial opacity based on the initial scroll position
      const initialOpacity =
        0.2 +
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) *
          0.6;

      // Set the initial background-color with the calculated opacity
      stripColumn1.style.backgroundColor = `rgba(4, 0, 71, ${initialOpacity})`;
      stripColumn2.style.backgroundColor = `rgba(80, 0, 71,, ${initialOpacity})`;

      // Add an event listener for the scroll event
      const handleScroll = () => {
        // Calculate the opacity based on the scroll position
        const opacity =
          0.3 +
          (window.scrollY / (document.body.scrollHeight - window.innerHeight)) *
            0.4;

        // Set the background-color with the calculated opacity
        stripColumn1.style.backgroundColor = `rgba(4, 0, 71, ${opacity})`;
        stripColumn2.style.backgroundColor = `rgba(80, 0, 71, ${opacity})`;
      };

      window.addEventListener('scroll', handleScroll);

      // Remove the event listener when the component unmounts
      return () => {
        window.removeEventListener('scroll', handleScroll);
      };
    } else {
      console.error('Strip columns not found.');
    }
  }, []); // Empty dependency array to run the effect only once

  // Add scroll event listener when component mounts
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="mt-5 container-fluid mb-5">
      <div className="row text-center mb-5 intro">
        <div className="col">
          <img
            src={profileImage}
            className="img-fluid rounded-circle mb-3 profile-image"
            alt="Profile"
            style={{ maxWidth: '300px', maxHeight: '300px'}}
          />
          <h2 className="mt-3">ELIJAH DAYON</h2>
          <p>Graduating Computer Science Student & Lead Developer</p>
        </div>
      </div>

      <div className="row">
        {/* Left Column */}
        <div className="col-md-6 px-0">
          <div className="strip-column1">
            {/* List of Works */}
            <h3 className="text-center mb-4">List of Works</h3>

            {/* GitHub Projects */}
            {githubProjects.map((project, index) => (
              <div className="col-md" key={index}>
                <div className="card mb-4">
                  <div className="card-body">
                    <div className="row align-items-center">
                      {/* Media Embedding */}
                      <div className="col-md-4 d-flex justify-content-center align-items-center">
                        <a
                          href={project.webLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={require(`../assets/projects/${project.image}`)}
                            className="img-fluid content-img"
                            alt={project.title}
                          />
                        </a>
                      </div>
                      {/* Title and Description */}
                      <div className="col-md-8 py-3 px-1">
                        <h5 className="card-title">{project.title}</h5>
                        <p className="card-text">{project.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Post from Various Sources */}
            {randomPosts.map((post, index) => (
              <div className="col-md" key={index}>
                <div className="card mb-4">
                  <div className="card-body">
                    <div className="row align-items-center ">
                      {/* Media Embedding */}
                      <div className="col-md-4 d-flex justify-content-center align-items-center">
                        <a
                          href={post.webLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={require(`../assets/projects/${post.image}`)}
                            className="img-fluid content-img"
                            alt={post.title}
                          />
                        </a>
                      </div>
                      {/* Title and Description */}
                      <div className="col-md-8 py-3 px-1">
                        <h5 className="card-title">{post.title}</h5>
                        <p className="card-text">{post.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* YouTube Video */}
            {youtubeVideos.map((video, index) => (
              <div className="col-md" key={index}>
                <div className="card mb-4">
                  {/* Media Embedding */}
                  <div className="embed-responsive embed-responsive-16by9">
                    <iframe
                      title={video.title}
                      className="embed-responsive-item"
                      src={video.videoUrl}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div className="card-body text-center">
                    <h5 className="card-title">{video.title}</h5>
                    <p className="card-text">{video.description}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Facebook Video */}
            {facebookVideos.map((video, index) => (
              <div className="col-md" key={index}>
                <div className="card mb-4">
                  {/* Media Embedding */}
                  <div className="embed-responsive embed-responsive-16by9">
                    <iframe
                      title={video.title}
                      className="embed-responsive-item"
                      src={video.videoUrl}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                  <div className="card-body text-center">
                    <h5 className="card-title">{video.title}</h5>
                    <p className="card-text">{video.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="col-md-6 px-0">
          <div className="strip-column2">
            {/* Add content for the right column */}
            {/* About Me */}
            <h3 className="text-center mb-4">About Me</h3>

            <div className="card mb-4 px-1">
              <div className="card-body">
                <p className="text-center card-title mt-3">
                  {aboutMe[0].title}
                </p>
                <p
                  className="text-center card-text about-description px-5 py-2"
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {aboutMe[0].description}
                </p>
              </div>
            </div>
            {/* Education */}
            <h3>Education</h3>
            {/* Add education details here */}
            <Education />
            {/* List of Skills */}
            <h3 className="my-4">List of Skills</h3>
            {/* Add list of skills using flex row and flex wrap */}
            <Skills />
          </div>
        </div>
      </div>
      <div className="home-container">
        {/* Your Home page content here */}

        {/* Go to top button */}
        {showButton && (
          <button className="go-top-button" onClick={scrollToTop}>
            <FontAwesomeIcon icon={faArrowUp} />
          </button>
        )}
      </div>
    </div>
  );
};

export default Home;
