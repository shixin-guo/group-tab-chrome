(function() {

  'use strict';

  var timeout;

  function hosts2Str(hosts) {
    return Array.isArray(hosts) ? hosts.join('\n') : '';
  }

  function saveOptions() {
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      var options = {
        groupHost: document.querySelector('#groupHost').checked,
        groupSerp: document.querySelector('#groupSerp').checked,
        groupRare: document.querySelector('#groupRare').checked,
        showContextMenuItem: document.querySelector('#showContextMenuItem').checked,
        excludeHosts: document.querySelector('#excludeHosts').value.trim().split('\n')
      };
      storage.save(options);

      // context menu update
      chrome.runtime.getBackgroundPage(function(bg) {
        if (options.showContextMenuItem) {
          bg.contextMenu.showItem();
        } else {
          bg.contextMenu.hideItem();
        }
      });
    }, 500);
  }

  function restoreOptions() {
    // title, header
    var title = chrome.i18n.getMessage('options_title') + ': ' + chrome.i18n.getMessage('name');
    document.title = title;
    document.querySelector('h2').textContent = title;

    // labels
    [].forEach.call(document.querySelectorAll("[data-i18n]"), function(span) {
      span.textContent = chrome.i18n.getMessage('options_' + span.getAttribute('data-i18n'));
    });

    // footer
    var manifest = chrome.runtime.getManifest();
    document.querySelector('#version').textContent = manifest.version;
    var whatsnewPath = 'whatsnew/whatsnew.' + utils.getLocale() + '.html';
    document.querySelector('#version-link').setAttribute('href', chrome.runtime.getURL(whatsnewPath));
    document.querySelector('#feedback').setAttribute('href', manifest.homepage_url);

    // values
    storage.load(function(groups, options) {
      document.querySelector('#groupHost').checked = options.groupHost;
      document.querySelector('#groupSerp').checked = options.groupSerp;
      document.querySelector('#groupRare').checked = options.groupRare;
      document.querySelector('#showContextMenuItem').checked = options.showContextMenuItem;
      document.querySelector('#excludeHosts').textContent = hosts2Str(options.excludeHosts);

      // events
      document.body.addEventListener('change', saveOptions);
      document.querySelector('#excludeHosts').addEventListener('keyup', saveOptions);
      document.querySelector('#restoreGroups').addEventListener('click', restoreGroups);
    });
  }

  function restoreGroups(e) {
    e.preventDefault();
    chrome.runtime.getBackgroundPage(function(bg) {
      bg.restoreGroups();
    });
  }

  // entry point
  document.addEventListener('DOMContentLoaded', restoreOptions);

}());
