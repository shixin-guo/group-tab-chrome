/**
 * Add items to context-menu
 */
(function(exports) {

  'use strict';

  var contextMenu = exports.contextMenu = {
    init: function() {
      storage.load(function(savedGroups, settings) {
        if (settings.showContextMenuItem) {
          contextMenu.showItem();
        } else {
          contextMenu.hideItem();
        }
      });
    },
    showItem: function() {
      chrome.contextMenus.removeAll(function() {
        chrome.contextMenus.create({
          type: 'normal',
          title: chrome.i18n.getMessage('contextMenu_makeGroups'),
          contexts: ['all'],
          onclick: exports.makeGroups
        });
      });
    },
    hideItem: function() {
      chrome.contextMenus.removeAll();
    }
  };

  contextMenu.init();

// old code: addgroups to context-menu, looks useless
/*
  var UPDATE_TIMEOUT_MS = 500;
  var timeout;

  // listen tabs update to sync context menu items
  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'loading') {
      update();
    }
  });

  // listen tabs remove to sync context menu items
  chrome.tabs.onRemoved.addListener(update);

  function update() {
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      chrome.contextMenus.removeAll(addItems);
    }, UPDATE_TIMEOUT_MS);
  }

  function addItems() {
    // top item
    chrome.contextMenus.create({
      type: 'normal',
      title: chrome.i18n.getMessage('contextMenu_makeGroups'),
      contexts: ['all'],
      onclick: exports.makeGroups
    });

    // visible groups
    chrome.tabs.query({
      windowId: chrome.windows.WINDOW_ID_CURRENT
    }, function(tabs) {
      var visibleGoups = exports.getVisibleGroups(tabs);
      var keys = Object.keys(visibleGoups);
      // separator
      if (keys.length) {
        chrome.contextMenus.create({
          type: 'separator',
          contexts: ['all']
        });
      }
      // visible groups
      keys.forEach(function(key) {
        var tabId = visibleGoups[key].id;
        chrome.contextMenus.create({
          type: 'normal',
          title: getTitleFromKey(key),
          contexts: ['all'],
          onclick: function() {
            chrome.tabs.update(tabId, {active: true});
          }
        });
      });
    });
  }

  function getTitleFromKey(key) {
    var host;
    var text;
    var p = key.indexOf('&text=');
    if (p === -1) {
      host = key;
    } else {
      host = key.substring(0, p);
      text = key.substring(p + 6);
      text = text.replace(/\+([^\s])/gi, ' $1');
      text = decodeURIComponent(text);
    }

    host = decodeURIComponent(host);

    if (host === 'rarely') {
      return chrome.i18n.getMessage('rarelyUsed');
    } else if (text) {
      return host + ' - ' + text;
    } else {
      return host;
    }
  }

*/
}(typeof window !== 'undefined' ? window : this));
