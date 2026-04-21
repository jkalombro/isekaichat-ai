import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './shared/context/AuthContext';
import { ThemeProvider } from './shared/context/ThemeContext';
import { ChatProvider } from './shared/context/ChatContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <App />
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
