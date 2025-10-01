import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import { ThemeProvider } from './contexts/ThemeContext';
import { MonthProvider } from './contexts/MonthContext';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <MonthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </MonthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
