import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { t } from '@/entrypoints/utils/i18n';

// index.html's <title> is the manifest placeholder (see there); pages don't get
// __MSG_ substitution, so the popup's own title is set here.
document.title = t('extName');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
