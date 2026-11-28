import '@fontsource-variable/ibm-plex-sans/index.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/site.css';
import './styles/plain.css';

import { safeStorage } from './agent-build/storage';
import { bindPlainToggle } from './plain-view';

const storage = safeStorage(window);

const plainToggle = document.getElementById('plain-toggle');
if (plainToggle instanceof HTMLButtonElement) {
  bindPlainToggle(plainToggle, document, storage);
}
