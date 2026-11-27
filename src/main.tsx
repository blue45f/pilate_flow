import React from 'react';
import ReactDOM from 'react-dom/client';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import '@fontsource/instrument-serif/latin-400.css';
import './styles/studio.css';
import './styles/atelier-v2.css';
import './styles/atelier-vnext.css';
import './styles/design-tokens.css';
import './styles/responsive-studio.css';
import './styles/atelier-luxury-v2.css';
import './styles/mobile-first-atelier-v3.css';
import './styles/atelier-clean-declutter-v5.css';
import './styles/mobile-subpages-user-first-v6.css';
import './styles/flow-studio.css';
import './styles/atelier-calm-luxury-polish.css';
import { App } from './App';
import './styles/atelier-unslop-system.css';
import './styles/pf-motion-studio.css';
import './styles/atelier-covers.css';
import './styles/mobile-readability-unslop-v17.css';
import './styles/movement-workspace.css';
import { bootstrapCloudSession } from './lib/cloudSync';
import { initAllStudioTrackAdapters } from './utils/registerAllStudioAdapters';

import { startPwa } from './lib/pwa';

initAllStudioTrackAdapters();

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
