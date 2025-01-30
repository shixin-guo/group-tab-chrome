/**
 * Process incoming messages from group tabs
 */
(function(exports) {

  'use strict';

  // listen incoming messages
  chrome.runtime.onMessage.addListener(function(data, sender, sendResponse) {
    data = data || {};

    if (!data.key) {
      return;
    }
    // logj('got msg', data);

    // reply to grouped tabs message and send data
    if (data.msg === 'need-data') {
      storage.load(function(hosts) {
        sendResponse(hosts[data.key]);
      });
      return true;
    }

    // remove url
    if (data.msg === 'remove-url' && data.url) {
      storage.load(function(hosts) {
        var tabs = hosts[data.key];
        var removed = false;
        if (tabs) {
          for (var i = tabs.length; i--;) {
            if (tabs[i].url === data.url) {
              tabs.splice(i, 1);
              removed = true;
            }
          }
        }

        if (removed) {
          if (hosts[data.key].length === 0) {
            delete hosts[data.key];
          }
          storage.saveGroups(hosts);
        }
      });
    }

    // open url next to group tab
    if (data.msg === 'open-url' && data.url) {
      chrome.tabs.query({
        url: data.url
      }, function(tabs) {
        if (tabs.length) {
          chrome.tabs.update(tabs[0].id, {
            active: true
          });
          // remove self if it was last link
          if (data.isLast) {
           chrome.tabs.remove(sender.tab.id);
          }
        } else {
          if (data.isLast) {
            //open last link inself window
            chrome.tabs.update(sender.tab.id, {
              url: data.url
            });
          } else {
            var details = {
              url: data.url,
              index: sender.tab.index + 1,
              active: data.activate === undefined ? true : data.activate
            };
            // for tab links islast = false, for other urls - undefined
            if (data.isLast === false) {
              details.openerTabId = sender.tab.id;
            }
            chrome.tabs.create(details);
          }
        }
      });
    }

    // open all in new window
    if (data.msg === 'open-all-new-win') {
      storage.load(function(hosts) {
        var tabs = hosts[data.key];
        if (!tabs) {
          return;
        }
        chrome.windows.create({}, function(win) {
          var firstTab = win.tabs && win.tabs[0];
          if (firstTab) {
            chrome.tabs.update(firstTab.id, {url: tabs.shift().url});
          }
          tabs.forEach(function(tab) {
            chrome.tabs.create({windowId: win.id, url: tab.url});
          });
        });
      });
    }

    // close group tab
    if (data.msg === 'close-me') {
      chrome.tabs.remove(sender.tab.id);
    }
  });

}(typeof window !== 'undefined' ? window : this));
