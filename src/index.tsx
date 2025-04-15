// src/index.tsx
import React from 'react';
import { createRoot } from 'react-dom/client'; // Nova API do React 18
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './Routes';
import './index.css';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement!); // O "!" indica que sabemos que rootElement não será null

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </React.StrictMode>
);