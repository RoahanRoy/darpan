import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/home.css';
import useRoute from './hooks/useRoute.js';
import Home from './pages/Home.jsx';
import Parliament from './pages/Parliament.jsx';
import About from './pages/About.jsx';

function App() {
  const route = useRoute();

  switch (route.page) {
    case 'parliament':
      return <Parliament />;
    case 'about':
      return <About />;
    default:
      // Everything else names a state, real or not. Home decides which, once
      // /api/regions has told it which states exist — an unknown slug gets a
      // "no records for this state" page rather than a silent fallback.
      return <Home route={route} />;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
