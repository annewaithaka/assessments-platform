// client/src/main.jsx

/*
  This is the entry point — the very first file that runs.
  
  It does ONE thing: mounts the App component into the HTML page.
  React "takes over" the div with id="root" in index.html 
  and renders everything inside it.
  
  StrictMode is a development helper that warns you about 
  potential problems (like deprecated code). It doesn't affect 
  production builds.
*/

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);