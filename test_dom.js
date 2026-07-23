const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('index.html', 'utf8');

const virtualConsole = new (require('jsdom')).VirtualConsole();
virtualConsole.sendTo(console);

const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost/',
    virtualConsole
});

dom.window.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
dom.window.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
dom.window.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };

// Catch any unhandled promise rejections
dom.window.addEventListener('unhandledrejection', (event) => {
    console.error("Unhandled Rejection:", event.reason);
});

// We want to catch unhandled errors in JSDOM
dom.window.addEventListener('error', event => {
    console.error("DOM Window Error:", event.error);
});

dom.window.document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded fired on DOM!");
});

setTimeout(() => {
    console.log("Finished running for 3 seconds.");
    process.exit(0);
}, 3000);
