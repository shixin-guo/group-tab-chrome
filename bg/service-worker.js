// Service worker for Chrome Extension V3
// Load all the necessary background scripts in the correct order

// Load utility scripts first
importScripts('utils.js');
importScripts('storage.js');

// Load feature-specific scripts
importScripts('serp.js');
importScripts('rarely.js');
importScripts('opened-pages.js');
importScripts('onupdate.js');
importScripts('onmessage.js');
importScripts('debug.js');

// Load UI-related scripts
importScripts('context-menu.js');
importScripts('button.js');

// Load the main background script last
importScripts('background.js');
