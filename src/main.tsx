import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { preloadCachedIcons } from './utils/iconGenerator';

// Preload custom branding icons (favicon, apple-touch-icon, PWA)
preloadCachedIcons();

createRoot(document.getElementById('root')!).render(<App />);

