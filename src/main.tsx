import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Reshaped } from 'reshaped';
import 'reshaped/themes/slate/theme.css';
import App from './App.tsx';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </StrictMode>,
);
