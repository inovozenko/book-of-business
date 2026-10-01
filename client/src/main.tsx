import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import {I18nProvider} from 'react-aria-components';

import './styles/fonts.scss';
import './styles/tokens.scss';
import './index.scss';
import {App}        from './App.tsx';
import {APP_LOCALE} from './lib/locale.ts';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider locale={APP_LOCALE}>
      <App />
    </I18nProvider>
  </StrictMode>
);
