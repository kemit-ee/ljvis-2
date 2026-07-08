import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CookiesProvider } from 'react-cookie';
import '@tedi-design-system/react/index.css';
import './index.css';
import './i18n';
import App from './App';
import { AppProviders } from './AppProviders';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CookiesProvider>
      <BrowserRouter>
        <AppProviders>
          <App />
        </AppProviders>
      </BrowserRouter>
    </CookiesProvider>
  </StrictMode>,
);
