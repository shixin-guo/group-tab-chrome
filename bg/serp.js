/**
 * Monitor tab creation/removal and store tabs opened from search engine results
 */
(function(exports) {

  'use strict';
  /**
   * Store tabs opened from serp results in format
   * {
   *   tabId: {
   *     serpKey: 'yandex.ru&text=abc',
   *     host: 'abc.ru'
   *   },
   *   ...
   * }
   */
  var tabs = {};

  exports.getSerpTabs = function() {
    return tabs;
  };

  // https://www.google.ru/search?q=chrome+extensions+api&ie=utf-8&oe=utf-8&aq=t&rls=org.mozilla:ru:official&client=firefox-a&channel=sb&gfe_rd=cr&ei=PVE9VLfPE9GEtAHgjoHICA#newwindow=1&rls=org.mozilla:ru:official&channel=sb&q=chrome+extensions+api+docs
  // https://www.google.ru/webhp?sourceid=chrome-instant&ion=1&espv=2&ie=UTF-8#newwindow=1&q=%D0%B2%D0%B8%D0%BA%D0%B8%D0%BF%D0%B5%D0%B4%D0%B8%D1%8F
  // http://yandex.ru/yandsearch?lr=213&text=viki

  function checkSerp(tab) {
    var url = tab.url;
    var matches;
    var parsed;
    // google
    matches = url.match(/^https?\:\/\/(www\.)?google(\.[a-z]{2,3}){1,2}\/.+[&#]q=([^&]+)/);
    if (matches) {
      parsed = utils.parseURL(url);
      return getKey(parsed.host, matches[3]);
    }
    // yandex
    matches = url.match(/^https?\:\/\/yandex(\.[a-z]{2,3}){1,2}\/yandsearch/);
    if (matches) {
      parsed = utils.parseURL(url);
      if (parsed.params.text) {
        return getKey(parsed.host, parsed.params.text);
      }
    }
    // existing serp group - the same as opening tab from real serp results
    // e.g. chrome-extension://lfbihcpnldmejclbfhdmpkhfocgfnibe/group.html?yandex.ru&text=%D0%BA%D0%BE%D1%82%D0%B8%D0%BA%D0%B8
    matches = url.indexOf(chrome.runtime.getURL('group.html')) === 0;
    if (matches) {
      parsed = utils.parseURL(url);
      if (parsed.params.text) {
        var host = parsed.query.match(/^\?([^&]+)/);
        if (host) {
          return getKey(host[1], parsed.params.text);
        }
      }
    }
  }

  function getKey(host, text) {
    return host + '&text=' + text;
  }

  function isSerpRedirect(url) {
    if (/^http:\/\/yandex\.ru\/clck\/jsredir/.test(url)) {
      return true;
    }
    if (/^https?\:\/\/(www\.)?google(\.[a-z]{2,3}){1,2}\/url\?/.test(url)) {
      return true;
    }
  }

  chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    //logj('upd', tab);
    if (changeInfo.status !== 'complete') {
      return;
    }
    // this is for testing conviniency
    tabId = tab.id;
    //logj('upd', [].slice.call(arguments));
    //logj('onUpdated', [].slice.call(arguments));

    if (tabs[tabId]) {
      //log('url', tab.url)
      var parsed = utils.parseURL(tab.url);
      // if host changed --> forget this tab
      if (parsed.host !== tabs[tabId].host) {
        // log('serp result host changed:', parsed.host, tabs[tabId].host);
        delete tabs[tabId];
      }
    } else if (tab.openerTabId && !isSerpRedirect(tab.url)) {
      //log('checking opener', tab.url);
      // check if opener tab is serp
      chrome.tabs.get(tab.openerTabId, function(openerTab) {
        if (openerTab) {
          //logj('openerTab', tab.openerTabId, openerTab);
          var serpKey = checkSerp(openerTab);
          if (serpKey) {
            //log('added serp result:', tab.url);
            tabs[tabId] = {
              serpKey: serpKey,
              host: utils.parseURL(tab.url).host
            };
          }
        }
      });
    }
  });

  chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    if (tabs[tabId]) {
      delete tabs[tabId];
    }
  });

}(typeof window !== 'undefined' ? window : this));
