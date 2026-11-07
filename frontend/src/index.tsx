import { render } from 'solid-js/web';
import '@/styles/globals.css';
import App from './App';
import { initRuntimeConfig } from '@/config/runtimeConfig';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

initRuntimeConfig().finally(() => {
  render(() => <App />, root);
});

