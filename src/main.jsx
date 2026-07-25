import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/home.css';
import useRoute from './hooks/useRoute.js';
import Home from './pages/Home.jsx';

/* Home is imported eagerly and the other two are not, because Home is what
   almost every arrival renders — the front page, every state, every district.
   Splitting it would add a round trip to the common case and save nothing.

   Parliament and About are the opposite: rarely an entry point, and neither
   draws the India map. In the main chunk they still shipped with it: one
   bundle meant every reader of /about downloaded 68 kB (gzipped) of map
   geometry that page has no use for. Split out, they cost only themselves. */
const Parliament = lazy(() => import('./pages/Parliament.jsx'));
const Ministry = lazy(() => import('./pages/Ministry.jsx'));
const About = lazy(() => import('./pages/About.jsx'));

function App() {
  const route = useRoute();

  switch (route.page) {
    case 'parliament':
      /* A ministry named in the URL is its own page, in its own chunk. It
         shares nothing with the union budget page but the nav, and a reader
         opening one ministry has no use for the other thirteen's tables. */
      return (
        <Suspense fallback={null}>
          {route.ministrySlug ? (
            <Ministry key={route.ministrySlug} slug={route.ministrySlug} />
          ) : (
            <Parliament />
          )}
        </Suspense>
      );
    case 'about':
      return (
        <Suspense fallback={null}>
          <About />
        </Suspense>
      );
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
