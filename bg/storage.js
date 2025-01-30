/**
 * Storage save/load
 */
(function(exports) {

  'use strict';

  var noop = function() {};

  var defaults = {
    hosts: {},
    excludeHosts: ['facebook.com', 'gmail.com', 'vk.com'],
    groupHost: true,
    groupSerp: true,
    groupRare: true,
    showContextMenuItem: true
  };

  exports.storage = {
    /**
      load from storage, e.g.
      savedTabs['lenta.ru'] = [
       {
         url: 'http://lenta.ru',
         title: 'Lenta',
         favIconUrl: '..',
         ts: 13241234132
       },
      {...}
      ]
    */
    load: function(callback) {
      var keys = Object.keys(defaults);
      this.loadKeys(keys, function storageGet(res) {
        var data = {};
        keys.forEach(function(key) {
          data[key] = res[key] !== undefined ? res[key] : defaults[key];
        });
        //logj('load', res);
        //logj('load with defs', data);
        callback(data.hosts, data);
      });
    },
    loadKeys: function(keys, callback) {
      chrome.storage.local.get(keys, callback);
    },
    save: function(keyValues, callback) {
      //logj('save', keyValues);
      chrome.storage.local.set(keyValues, callback || noop);
    },
    /**
     * Save current groups to `hosts` key
     * Example:
       {
        "en.wikipedia.org": [
          {
            "url": "https://en.wikipedia.org/wiki/Portal:Science",
            "title": "Portal:Science - Wikipedia, the free encyclopedia",
            "favIconUrl": "https://bits.wikimedia.org/favicon/wikipedia.ico"
          },
          {
            "url": "https://en.wikipedia.org/wiki/Main_Page",
            "title": "Wikipedia, the free encyclopedia",
            "favIconUrl": "https://bits.wikimedia.org/favicon/wikipedia.ico"
          },
          ...
        ],
        "google.ru&text=abc": [
          {
            "favIconUrl": "https://www.test.com/content/images/favicon.ico",
            "title": "Create Tests for Organizational Training",
            "url": "https://test.com/"
          },
         ...
      }
     */
    saveGroups: function(groups, callback) {
      //logj('saveGroups', groups);
      chrome.storage.local.set({hosts: groups}, callback || noop);
    }
  };

}(typeof window !== 'undefined' ? window : this));
