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

import { startPwa } from './lib/pwa';

// Keep the installed worker for this session. Waiting updates are announced by
// PwaInstallPanel and activate naturally once all app tabs/windows are closed.
// Forcing activation or reloading here would discard a live class clock.
startPwa({ registerServiceWorker: import.meta.env.PROD });
void bootstrapCloudSession();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
