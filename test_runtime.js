const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');

const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' });

// Mock global APIs
dom.window.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
dom.window.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
dom.window.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };

try {
    dom.window.eval(script);
    console.log("Script evaluated successfully!");
    
    // Simulate DOMContentLoaded
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    console.log("DOMContentLoaded triggered!");
    
} catch (e) {
    console.error("RUNTIME ERROR:", e);
}
