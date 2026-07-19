import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/home.css';
import Home from './pages/Home.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Home />
  </React.StrictMode>
);
