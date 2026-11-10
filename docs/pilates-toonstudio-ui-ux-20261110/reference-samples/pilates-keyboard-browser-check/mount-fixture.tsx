import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { PilatesKeyboardBrowserFixtureApp } from './PilatesKeyboardBrowserFixtureApp';

const container = document.getElementById('pilates-keyboard-fixture-root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <PilatesKeyboardBrowserFixtureApp />
    </StrictMode>,
  );
}
