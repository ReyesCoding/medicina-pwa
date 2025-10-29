import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminPage from '@/admin/AdminPage';


// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // ⚡️ versión sincronizada con CACHE_VERSION en sw.js
    const ver = 'v2025-10-26-2';
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js?v=${ver}`)
      .then((registration) => {
        console.log(`SW registered (version ${ver}):`, registration);
      })
      .catch((registrationError) => {
        console.error('SW registration failed:', registrationError);
      });
  });
}


const isAdmin =
  new URLSearchParams(window.location.search).get('admin') === '1' ||
  localStorage.getItem('admin') === '1';

document.title = isAdmin ? 'Pensum Medicina — Admin' : 'Pensum Medicina';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isAdmin ? <AdminPage /> : <App />}
  </React.StrictMode>,
);
