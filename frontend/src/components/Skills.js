import React from 'react';
import '../styles/skills.css'; // Import CSS file for styling

const skills = [
  'Python',
  'HTML/CSS',
  'C++',
  'JavaScript',
  'React',
  'Next',
  'Documentation',
  'Express.js',
  'MongoDB',
  'Django',
  'Bootstrap/Tailwind',
  'Git',
  'SQL',
  'Machine Leaning Programming',
  'Deep Leaning Programming',
  'Redux',
  'TypeScript',
  'RESTful APIs',
  'Responsive Design',
  'UI Design',
  'GIS Programming',
  'Agile Methodologies',
];

const Skills = () => {
  return (
    <div>
      <div className="skills-container">
        {skills.map((skill, index) => (
          <div className="skill" key={index}>
            {skill}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Skills;
