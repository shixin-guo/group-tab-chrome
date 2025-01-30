/**
 * Monitor opened tabs count and change icon
 * Listen click on button and run grouping
 */
(function(exports) {

'use strict';

// listen click to browser action and group your tabs!
chrome.browserAction.onClicked.addListener(exports.makeGroups);

var RED_TABS_COUNT = 20;
var timeout;

function updateIcon() {
  clearTimeout(timeout);
  timeout = setTimeout(function() {
    chrome.tabs.query({windowId: chrome.windows.WINDOW_ID_CURRENT}, function(tabs) {
      var img19 = tabs.length >= RED_TABS_COUNT ? 'img/kpager-19-red.png' : 'img/kpager-19.png';
      var img38 = tabs.length >= RED_TABS_COUNT ? 'img/kpager-38-red.png' : 'img/kpager-38.png';
      chrome.browserAction.setIcon({path: {
        '19': img19,
        '38': img38
      }});
    });
  }, 300);
}

//listen tabs events
chrome.tabs.onCreated.addListener(updateIcon);
chrome.tabs.onRemoved.addListener(updateIcon);

// update icon on init
updateIcon();

}(typeof window !== 'undefined' ? window : this));
