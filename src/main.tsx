import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Reshaped } from 'reshaped';
import 'reshaped/themes/slate/theme.css';
import App from './App.tsx';
import { CertificateVerifyPage } from './components/verify/CertificateVerifyPage';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import './index.css';

const ThemedApp = () => {
  const { resolvedTheme } = useTheme();
  return (
    <Reshaped theme="slate" colorMode={resolvedTheme}>
      <App />
    </Reshaped>
  );
};

// The public certificate verify page needs no sign-in, so it is served outside the app.
const isVerifyPage = /^\/verify(\/|$)/.test(window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isVerifyPage ? (
      <CertificateVerifyPage />
    ) : (
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    )}
  </StrictMode>,
);
