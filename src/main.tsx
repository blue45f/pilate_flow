import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/studio.css';
import './styles/atelier-v2.css';
import './styles/atelier-vnext.css';
import './styles/design-tokens.css';
import { bootstrapCloudSession } from './lib/cloudSync';

void bootstrapCloudSession();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
