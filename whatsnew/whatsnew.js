(function() {

  'use strict';

  document.getElementById('version').textContent = chrome.runtime.getManifest().version;
  [].forEach.call(document.querySelectorAll('.options-link'), function(el) {
    el.setAttribute('href', chrome.runtime.getURL('options/options.html'));
  });
  document.getElementById('close').textContent = chrome.i18n.getMessage('close');
  document.getElementById('close').addEventListener('click', function() {
    chrome.tabs.getCurrent(function(tab) {
      if (tab) {
        chrome.tabs.remove(tab.id);
      }
    });
  });

}());
