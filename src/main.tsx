import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

console.log('main.tsx: starting, root element:', document.getElementById('root'));

try {
  const root = createRoot(document.getElementById('root')!);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
} catch (e) {
  console.error('main.tsx: render error', e);
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `<pre style="color:red; padding:16px">Render error: ${String(e)}</pre>`;
  }
}