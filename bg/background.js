/**
 * Main grouping process:
 * get opened tabs and existing groups and update everything
 */
(function(exports) {

'use strict';

// urls older than it are removed from storage
// var OUTDATED_URL_MS = 24 * 60 * 60 * 1000;

/**
 * Update timestamp of url to keep it in list.
 */
// chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
//   if (changeInfo.status === 'complete') {
//     //tryUpdateTimestamp(tab.url);
//     //tryRemoveUrl(tab.url);
//   }
// });

/*
================ functions =================
 */

// exports
exports.makeGroups = makeGroups;
exports.getVisibleGroups = getVisibleGroups;
exports.restoreGroups = restoreGroups;

/**
 * Main process, called by button click or context-menu
 */
function makeGroups() {
  getOpenedTabs(function(openedTabs) {
    // find already visible groups (with host == chrome.runtime.id)
    // e.g. visibleGroups['lenta.ru'] = tab
    var visibleGroups = getVisibleGroups(openedTabs);
    // load saved groups
    storage.load(function(savedGroups, settings) {
      openedTabs = removeExcludes(openedTabs, settings.excludeHosts);

      // get hashes in format <tabId>: <data>
      var hostTabs = settings.groupHost ? getHostTabs(openedTabs) : {};
      var serpTabs = settings.groupSerp ? getSerpTabs() : {};
      var rarelyTabs = settings.groupRare ? getRarelyTabs() : {};
      // if all opened tabs are marked as rarely, do not form rarely group
      // (it possibly browser activate after idle)
      if (Object.keys(rarelyTabs).length >= openedTabs.length) {
        rarelyTabs = {};
      }

      //logj('savedGroups', savedGroups);
      //logj('serpTabs', serpTabs);
      //logj('rarelyTabs', rarelyTabs);

      // new groups, created from existing tabs
      var newGroups = getNewGroups(openedTabs, hostTabs, serpTabs, rarelyTabs);
      //logj('newGroups', newGroups);

      // add saved info to tails of newGroups
      mergeSavedAndNewGroups(savedGroups, newGroups, visibleGroups);

      //logj('newGroups', newGroups);
      saveGroups(newGroups, savedGroups, function() {
        // data is ready, update/create grouped tabs
        var createdGroups = doUpdate(newGroups, visibleGroups);
        // change active tab if it was grouped and will be closed
        changeActiveTab(newGroups, visibleGroups, createdGroups);
        // close regular tabs that are grouped
        closeTabs(newGroups, createdGroups);
      });
    });
  });
}

/**
 * Forms group of opened tabs.
 */
function getNewGroups(openedTabs, hostTabs, serpTabs, rarelyTabs) {
  var groups = {};
  var key;

  openedTabs.forEach(function(tab) {
    var hostStatus = 'passed';
    var serpStatus = 'passed';
    var rarelyStatus = 'passed';

    // check per host
    if (hostTabs[tab.id]) {
      key = tab.host;
      hostStatus = addTabToGroup(tab, groups, key);
    }

    // check tab in new serp results
    if (serpTabs[tab.id]) {
      key = serpTabs[tab.id].serpKey;
      serpStatus = addTabToGroup(tab, groups, key);
    }

    // check tab in rarely tabs
    if (rarelyTabs[tab.id]) {
      key = 'rarely';
      rarelyStatus = addTabToGroup(tab, groups, key);
    }

    var added = hostStatus === 'added' ||
                serpStatus === 'added' ||
                rarelyStatus === 'added';

    var passed = hostStatus === 'passed' &&
                 serpStatus === 'passed' &&
                 rarelyStatus === 'passed';

    if (added || passed) {
      return;
    } else {
      // it's dublicate tab, remove it right now
      // (we can open equal urls from different serps, so can't simply remove dublicates)
      chrome.tabs.remove(tab.id);
    }
  });

  return groups;
}

function addTabToGroup(tab, groups, key) {
  if (groups[key]) {
    var exists = groups[key].some(function(t) {
      return t.url === tab.url;
    });
    if (!exists) {
      groups[key].push(tab);
      return 'added';
    } else {
      return 'dublicate';
    }
  } else {
    groups[key] = [tab];
    return 'added';
  }
}

function mergeSavedAndNewGroups(savedGroups, newGroups, visibleGroups) {
  Object.keys(newGroups).forEach(function(key) {
    // exists in visible group -> add saved data
    if (visibleGroups[key]) {
      if (savedGroups[key]) {
        savedGroups[key].forEach(function(sTab) {
          var exists = newGroups[key].some(function(gTab) {
            return gTab.url === sTab.url;
          });

          if (!exists) {
            // push saved tab to the tail of grouped tabs
            newGroups[key].push(sTab);
          }
        });
      }
    // not exists in visible groups, remove this group if tab count = 1
    } else if (newGroups[key].length === 1) {
      delete newGroups[key];
    } else {
      // newGroup stays as is: consist of only visible tabs
    }
  });
}

/*
function addSavedTabs(groups, savedGroups, visibleGroups) {
  var now = Date.now();
  Object.keys(visibleGroups).forEach(function(key) {
    // add saved tabs to group
    if (groups[key] && savedGroups[key]) {
      savedGroups[key].forEach(function(sTab) {
        var exists = groups[key].some(function(gTab) {
          return gTab.url === sTab.url;
        });

        if (!exists) {
          // push saved tab to the tail of grouped tabs
          groups[key].push(sTab);
        }
      });
    }
  });
}
*/

// todo: wikipedia may use cp1251 instead of standard percent-encoding
//"https://ru.wikipedia.org/wiki/%CF%F0%E5%E7%E8%E4%E5%ED%F2"
//"https://ru.wikipedia.org/wiki/%D1%80%D0%B5%D0%B7%D0%B8%D0%B4%D0%B5%D0%BD%D1%82"
// see: http://stackoverflow.com/questions/4129805/convert-cp1252-to-unicode-in-javascript

function getOpenedTabs(callback) {
  chrome.tabs.query({
    windowId: chrome.windows.WINDOW_ID_CURRENT,
    pinned: false
  }, function(tabs) {
    //logj('tabs', tabs);
    callback(tabs.map(function(tab) {
      var parsed = utils.parseURL(tab.url);
      //logj('parsed', parsed);
      tab.url = parsed.href; // normalize url
      tab.host = parsed.host;
      return tab;
    }));
  });
}

function getVisibleGroups(openedTabs) {
  var prefix = chrome.runtime.getURL('/group.html');
  var visibleGroupTabs = [];
  for (var i = openedTabs.length; i--;) {
    var tab = openedTabs[i];
    if (tab.url.indexOf(prefix) === 0) {
      visibleGroupTabs.unshift(tab);
      // remove visible group tabs from futher operations
      openedTabs.splice(i, 1);
    }
  }
  var visibleGroups = {};
  visibleGroupTabs.forEach(function(tab) {
    // key may be host or serp with text
    // e.g. 'lenta.ru' or 'yandex.ru&text=abc' or 'rarely'
    var key = tab.url.split('?')[1];
    visibleGroups[key] = tab;
  });

  return visibleGroups;
}

function removeExcludes(openedTabs, excludeHosts) {
  return openedTabs.filter(function(tab) {
    return excludeHosts.indexOf(tab.host) === -1;
  });
}

function getHostTabs(openedTabs) {
  return openedTabs.reduce(function(res, tab) {
    res[tab.id] = tab;
    return res;
  }, {});
}
/*
function groupPerUrlKey(tabs) {
  return tabs.reduce(function(res, tab) {
    // key may be host or serp with text
    // e.g. 'lenta.ru' or 'yandex.ru&text=abc'
    var key = tab.url.split('?')[1];
    res[key] = tab;
    return res;
  }, {});
}
*/

/*
function excludeSingleTabs(groups, visibleGroups) {
  Object.keys(groups).forEach(function(key) {
    if (groups[key].length < 2 && !visibleGroups[key]) {
      delete groups[key];
    }
  });
}
*/

/**
 * Append groups to savedGroups and save
 */
function saveGroups(groups, savedGroups, callback) {
  var now = Date.now();
  Object.keys(groups).forEach(function(key) {
    savedGroups[key] = groups[key].map(function(tab) {
      var res = {
        url: tab.url, // tab.url === tab.href
        title: tab.title
       // ts: tab.id ? now : tab.ts
      };
      if (tab.favIconUrl) {
        res.favIconUrl = tab.favIconUrl;
      }
      return res;
    });
  });

  // logj('saving', savedGroups);

  storage.saveGroups(savedGroups, callback);
}

/**
 * Removes tabs that older than 1 day.
 * If some group get empty, remove it also.
 */
// function removeOutdatedTabs(savedTabs) {
//   var ts = Date.now() - OUTDATED_URL_MS;
//   //var ts = Date.now() - 60 * 1000;
//   Object.keys(savedTabs).forEach(function(key) {
//     for (var i = savedTabs[key].length; i--;) {
//       if (!savedTabs[key][i].ts || savedTabs[key][i].ts < ts) {
//         savedTabs[key].splice(i, 1);
//       }
//     }
//     if (!savedTabs[key].length) {
//       delete savedTabs[key];
//     }
//   });
// }

function doUpdate(groups, visibleGroups) {
  var update = {};
  var create = {};
  var usedIds = [];
  Object.keys(groups).forEach(function(key) {
    // if group tab already opened, will update it
    if (visibleGroups[key]) {
      update[key] = groups[key];
    } else {
      // find tab to open group (usually first, but maybe same tab in another group)
      var unusedTab = groups[key].filter(function(t) {
        return usedIds.indexOf(t.id) === -1;
      })[0] || {};
      if (unusedTab.id) {
        // group will be opened in tab with that id
        usedIds.push(unusedTab.id);
        create[key] = unusedTab;
      } else {
        // group will be opened in new tab
        create[key] = {};
      }
    }
  });

  // create new groups
  if (Object.keys(create).length) {
    //logj('create new groups', create);
    Object.keys(create).forEach(function(key) {
        createGroupedTab(key, create[key].id);
    });
  }

  // update all existing groups via single message
  if (Object.keys(update).length) {
    //logj('update groups via message', create);
    updateAllGroupedTabs(update);
  }

  return create;
}

function createGroupedTab(key, tabId) {
  // log('new grouped tab: ', key);
  var url = chrome.runtime.getURL('group.html') + '?' + key;
  if (tabId) {
    chrome.tabs.update(tabId, {url: url});
  } else {
    chrome.tabs.create({url: url});
  }
}

function updateAllGroupedTabs(groups) {
  // logj('update all grouped tabs', groups);
  // prepare data to send
  var sendGroups = {};
  var now = Date.now();
  Object.keys(groups).forEach(function(key) {
    sendGroups[key] = groups[key].map(function(tab) {
      return {
        id: tab.id || null,
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl
      };
    });
  });
  chrome.runtime.sendMessage({
    msg: 'take-data',
    data: sendGroups
  });
}

function changeActiveTab(newGroups, visibleGroups, createdGroups) {
  var activeKey;

  // check if active tab belongs to some group
  Object.keys(newGroups).every(function(key) {
    var hasActive = newGroups[key].some(function(tab) {
      return tab.active;
    });
    if (hasActive) {
      activeKey = key;
      return false;
    }
    return true;
  });

  // make group tab active
  if (activeKey) {
    var newActiveTab = visibleGroups[activeKey] || createdGroups[activeKey];
    if (newActiveTab) {
      chrome.tabs.update(newActiveTab.id, {active: true});
    }
  }
}

function closeTabs(newGroups, createdGroups) {
  var ids = [];

  // collect tab ids to close
  Object.keys(newGroups).forEach(function(key) {
    ids = ids.concat(newGroups[key].map(function(tab) {
      return tab.id;
    }).filter(Boolean));
  });

  // some groups are created in existing tabs --> exclude them
  var excludeIds = Object.keys(createdGroups).map(function(key) {
    return createdGroups[key].id;
  });
  ids = ids.filter(function(id) {
    return excludeIds.indexOf(id) === -1;
  });

  // remove dublicate ids
  ids = utils.removeDublicates(ids);

  if (ids.length) {
    chrome.tabs.remove(ids);
  }
}

/**
 * Update timestamp of all saved tabs with that url
 */
/*
function tryUpdateTimestamp(url) {
  //log('tryUpdateTimestamp', url);
  var parsed = utils.parseURL(url);
  //logj('tryUpdateTimestamp', url, parsed);
  var href = parsed.href;
  var changed = false;
  storage.load(function(savedHosts) {
    Object.keys(savedHosts).forEach(function(key) {
      var tabs = savedHosts[key] || [];
      tabs.forEach(function(tab) {
        if (tab.url === href) {
          tab.ts = Date.now();
          changed = true;
        }
      });
    });

    if (changed) {
      //logj('update timestamp', savedHosts);
      storage.saveGroups(savedHosts);
    }
  });
}
*/

/**
 * Update timestamp of all saved tabs with that url
 */
/*
function tryRemoveUrl(url) {
  //log('tryRemoveUrl', url);
  var parsed = utils.parseURL(url);
  var href = parsed.href;
  var changed = false;
  storage.load(function(savedHosts) {
    Object.keys(savedHosts).forEach(function(key) {
      var savedTabs = savedHosts[key] || [];
      for (var i = savedTabs.length; i--;) {
        if (savedTabs[i].url === href) {
          savedTabs.splice(i, 1);
          changed = true;
        }
      }
      if (!savedTabs.length) {
        delete savedHosts[key];
      }
    });

    if (changed) {
      //log('url removed', href);
      updateAllGroupedTabs(savedHosts);
      storage.saveGroups(savedHosts);
    }
  });
}
*/

/**
 * Restore all saved groups. Called from options page.
 */
function restoreGroups() {
  getOpenedTabs(function(openedTabs) {
    // find already visible groups (with host == chrome.runtime.id)
    var visibleGroups = getVisibleGroups(openedTabs);
    // load saved groups
    storage.load(function(savedGroups, settings) {
      // data is ready, update/create groups
      doUpdate(savedGroups, visibleGroups);
    });
  });
}


}(typeof window !== 'undefined' ? window : this));
