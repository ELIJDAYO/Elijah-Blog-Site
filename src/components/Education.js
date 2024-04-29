import React from 'react';
import { Grid, Typography, Divider } from '@mui/material';
import '../styles/education.css';

const Education = () => {
  return (
    <Grid container spacing={2}>
      {/* First education entry */}
      <Grid item xs={12} container spacing={2} className="grid-row-text mt-2">
        <Grid item xs={3}>
          <Typography variant="body2">2021 - 2024 (Oct)</Typography>
        </Grid>
        <Divider orientation="vertical" flexItem />
        <Grid item xs={8} className="info">
          <Typography variant="h5" component="h2">
            De La Salle University
          </Typography>
          <Typography variant="body2">
            Bachelor of Science in Computer Science
          </Typography>
          <Typography variant="body2">Major in Software Technology</Typography>
          <Typography variant="body2">Malate, Manila</Typography>
        </Grid>
      </Grid>
      {/* Divider */}
      <Grid item xs={12}>
        <Divider className="divider" />
      </Grid>
      {/* Repeat the above layout for additional education entries */}
      {/* Second education entry */}
      <Grid item xs={12} container spacing={2} className="grid-row-text mt-2">
        <Grid item xs={3}>
          <Typography variant="body2">2019 - 2021</Typography>
        </Grid>
        <Divider orientation="vertical" flexItem />
        <Grid item xs={8} className="info">
          <Typography variant="h5" component="h2">
            De La Salle University
          </Typography>
          <Typography variant="body2">
            Bachelor of Science in Information Technology
          </Typography>
          <Typography variant="body2">Malate, Manila</Typography>
        </Grid>
      </Grid>
      {/* Divider */}
      <Grid item xs={12}>
        <Divider className="divider" />
      </Grid>
      {/* Third education entry */}
      <Grid item xs={12} container spacing={2} className="grid-row-text mt-2">
        <Grid item xs={3}>
          <Typography variant="body2">2017 - 2019</Typography>
        </Grid>
        <Divider orientation="vertical" flexItem />
        <Grid item xs={8} className="info">
          <Typography variant="h5" component="h2">
            University of Santo Tomas SHS
          </Typography>
          <Typography variant="body2">
            Science, Technology, Engineering, and Mathematics (STEM)
          </Typography>
          <Typography variant="body2">Sampaloc, Manila</Typography>
        </Grid>
      </Grid>
      {/* Divider */}
      <Grid item xs={12}>
        <Divider className="divider" />
      </Grid>
      {/* Fourth education entry */}
      <Grid item xs={12} container spacing={2} className="grid-row-text mt-2">
        <Grid item xs={3}>
          <Typography variant="body2">2013 - 2017</Typography>
        </Grid>
        <Divider orientation="vertical" flexItem />
        <Grid item xs={8} className="info">
          <Typography variant="h5" component="h2">
            PAREF Westbridge JHS
          </Typography>
          <Typography variant="body2">Iloilo City</Typography>
        </Grid>
      </Grid>
      {/* Divider */}
      <Grid item xs={12}>
        <Divider className="divider" />
      </Grid>
      {/* Fifth education entry */}
      <Grid item xs={12} container spacing={2} className="grid-row-text mt-2">
        <Grid item xs={3}>
          <Typography variant="body2">2007 - 2013</Typography>
        </Grid>
        <Divider orientation="vertical" flexItem />
        <Grid item xs={8} className="info">
          <Typography variant="h5" component="h2">
            南葛西小学校 (Minami-Kasai Elementary School)
          </Typography>
          <Typography variant="body2">Edogawa-ward, Tokyo</Typography>
        </Grid>
      </Grid>
      {/* Divider */}
      <Grid item xs={12}>
        <Divider className="divider" />
      </Grid>
      {/* Repeat the above layout for additional education entries */}
    </Grid>
  );
};

export default Education;
