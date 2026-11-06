import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/studio.css';
import './styles/atelier-v2.css';
import './styles/atelier-vnext.css';
import './styles/design-tokens.css';
import './styles/responsive-studio.css';
import { bootstrapCloudSession } from './lib/cloudSync';

import { startPwa } from './lib/pwa';

startPwa({ registerServiceWorker: import.meta.env.PROD });
void bootstrapCloudSession();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
