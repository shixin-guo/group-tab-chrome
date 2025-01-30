/**
 * Operations performed on update:
 * - restore opened tabs
 * - show whatsNew
 */
(function() {

  'use strict';

  // list of versions where we show whatsnew
  var showWhatsNewOnVersions = [
  '1.3'
  ];

  function tryShowWhatsNew(details) {
    var newVersion = chrome.runtime.getManifest().version;
    var oldVersion = details.previousVersion;
    var show = showWhatsNewOnVersions.some(function(ver) {
      return ver > oldVersion && ver <= newVersion;
    });
    if (show) {
      var path = 'whatsnew/whatsnew.' + utils.getLocale() + '.html';
      chrome.tabs.create({url: chrome.runtime.getURL(path)});
    }
  }

  chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason === 'update') {
      restoreOpenedPages();
      tryShowWhatsNew(details);
    }
  });
}());
