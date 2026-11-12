import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/studio.css';
import './styles/atelier-v2.css';
import './styles/atelier-vnext.css';
import './styles/design-tokens.css';
import './styles/responsive-studio.css';
import { App } from './App';
import './styles/atelier-luxury-v2.css';
import './styles/mobile-first-atelier-v3.css';
import './styles/atelier-clean-declutter-v5.css';
import './styles/mobile-subpages-user-first-v6.css';
import { bootstrapCloudSession } from './lib/cloudSync';

import { registerPwaServiceWorker, startPwa } from './lib/pwa';

startPwa({ registerServiceWorker: false });
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
  registerPwaServiceWorker({
    onUpdateReady(registration) {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    },
  });
}
void bootstrapCloudSession();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
