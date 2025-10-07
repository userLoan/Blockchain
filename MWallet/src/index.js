import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Import Bulma chính thức
import 'bulma/css/bulma.min.css';

// Polyfill import PHẢI để cùng với các import khác
import { Buffer } from 'buffer';
import process from 'process';
import * as serviceWorker from './serviceWorker';

// Gắn polyfill vào window sau khi đã import
window.Buffer = Buffer;
window.process = process;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

serviceWorker.unregister();
