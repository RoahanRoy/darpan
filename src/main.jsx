import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/home.css';
import useRoute from './hooks/useRoute.js';
import Home from './pages/Home.jsx';
import Parliament from './pages/Parliament.jsx';

function App() {
  const path = useRoute();
  // Anything that is not /parliament is the state page, including an
  // unknown path — there is no content behind a 404 worth building.
  return path === '/parliament' ? <Parliament /> : <Home />;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
