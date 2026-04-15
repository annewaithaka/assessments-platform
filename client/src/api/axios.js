// client/src/api/axios.js

/*
  Centralized axios instance.
  
  Why not just call axios.get('http://localhost:5000/api/...') everywhere?
  Because:
  1. If your API URL changes, you'd have to update every single file
  2. When we add authentication, we need to attach the JWT token 
     to every request — doing it here means we do it ONCE
  3. Error handling can be standardized in one place
  
  This is a pattern called "single source of truth."
*/

import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',  // Your Flask server
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;