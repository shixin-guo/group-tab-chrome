/**
 * Records user activities on each tab to get rarely used tabs.
 */
(function(exports) {

  'use strict';

  var HOUR = 60 * 60 * 1000;
  var RARELY_DURATION_MS = 3 * HOUR;
  //var RARELY_DURATION_MS = 5 * 1000;

  var tabs = {};

  exports.getRarelyTabs = function() {
    var res = {};
    var now = Date.now();
    Object.keys(tabs).forEach(function(tabId) {
      if (now - tabs[tabId].activityTs > RARELY_DURATION_MS) {
        res[tabId] = true;
      }
    });
    return res;
  };

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status !== 'complete') {
      return;
    }
    //logj([].slice.call(arguments))
    updateTs(tab.id);
  });

  chrome.tabs.onActivated.addListener(function(activeInfo) {
    updateTs(activeInfo.tabId);
  });

  chrome.tabs.onRemoved.addListener(function(tabId) {
    if (tabs[tabId]) {
      delete tabs[tabId];
    }
  });

/*
  chrome.idle.setDetectionInterval(RARELY_DURATION_MS / 1000);
  // when system is activated after idle, mark all tabs as
  chrome.idle.onStateChanged.addListener(function(newState) {

  })
*/

  function updateTs(tabId) {
    //logj('updateTs', tabId);
    tabs[tabId] = tabs[tabId] || {};
    tabs[tabId].activityTs = Date.now();
  }

}(typeof window !== 'undefined' ? window : this));
