import { render } from 'solid-js/web';
import './index.css';
import { ShowcaseApp } from './ShowcaseApp';

const root = document.getElementById('root');
if (root) {
  render(() => <ShowcaseApp />, root);
}
