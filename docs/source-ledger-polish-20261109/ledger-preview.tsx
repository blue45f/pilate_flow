import React from 'react';
import {createRoot} from 'react-dom/client';
import {ExtendedMotionVerificationPanel} from './src/components/ExtendedMotionVerificationPanel';
import {INITIAL_EXERCISES} from './src/data/pilatesCatalog';
import './src/styles/design-tokens.css';
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:850,margin:'auto',padding:12,fontFamily:'sans-serif'}}><ExtendedMotionVerificationPanel exercise={INITIAL_EXERCISES.find(x=>x.id==='original-mat-swan-prep')!}/></main>);
