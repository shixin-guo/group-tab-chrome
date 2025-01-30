(function(exports) {

  'use strict';

  exports.debug = {
    get storage() {
      storage.load(function(hosts, data) {
        logj(data);
      });
    },
    get clear_storage() {
      storage.saveGroups({});
    },
    get whatsnew() {
      chrome.tabs.create({url: chrome.runtime.getURL('whatsnew/whatsnew.ru.html')});
    }
  };

}(typeof window !== 'undefined' ? window : this));
