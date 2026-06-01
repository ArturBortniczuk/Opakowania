// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // WAŻNE: Ten import musi być PRZED App
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Wyłączenie logów (log, info, debug) w wersji produkcyjnej, chyba że włączono tryb debugowania w localStorage
if (
  process.env.NODE_ENV === 'production' &&
  typeof window !== 'undefined' &&
  localStorage.getItem('debug') !== 'true'
) {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.debug = noop;
}


const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);