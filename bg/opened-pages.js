/**
 * Save opened groups on every tabs change to reopen them when extension updated
  */
(function(exports) {

  'use strict';

  var DELAY = 3 * 1000;
  var prefix = chrome.runtime.getURL('/');
  var timeout;

  exports.restoreOpenedPages = function() {
    storage.loadKeys('openedPages', function(res) {
      var pages = res.openedPages || [];
      if (!pages.length) {
        return;
      }
      chrome.windows.getAll({populate: false}, function(windows) {
        windows.forEach(function(win) {
          var tabs = pages.filter(function(page) {
            return page.windowId === win.id;
          });
          tabs.forEach(function(tab) {
            chrome.tabs.create({
              url: tab.url,
              windowId: tab.windowId,
              index: tab.index
            });
          });
        });
      });
    });
  };

  function saveOpenedPages() {
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      var pages = [];
      chrome.windows.getAll({populate: true}, function(windows) {
        windows.forEach(function(win) {
          win.tabs.forEach(function(tab) {
            var isOptions = tab.url === chrome.runtime.getURL('/options/options.html');
            if (tab.url.indexOf(prefix) === 0 && !isOptions) {
              pages.push({
                url: tab.url,
                windowId: tab.windowId,
                index: tab.index
              });
            }
          });
        });

        storage.save({openedPages: pages});
      });
    }, DELAY);
  }

  chrome.tabs.onCreated.addListener(saveOpenedPages);
  chrome.tabs.onRemoved.addListener(saveOpenedPages);

  // save on start
  saveOpenedPages();
}(typeof window !== 'undefined' ? window : this));
