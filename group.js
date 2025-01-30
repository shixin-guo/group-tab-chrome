/**
 * Grouped tab shows only links that are not between visible tabs
 * Links are added to group tab only by browser action button
 */
(function() {

  'use strict';

  var TYPE_HOST = 0;
  var TYPE_SERP = 1;
  var TYPE_RARE = 2;

  var key;
  var host;
  var type;
  var text;

  // init
  parseLocation();
  setHeader();
  setButton();
  setListeners();
  setSettingsLink();
  // request data from bg on statup
  sendMessage('need-data', null, proceed);

  // listen data updates
  chrome.runtime.onMessage.addListener(function(info, sender, sendResponse) {
    info = info || {};
    if (info.msg === 'take-data') {
      var tabs = info.data && info.data[key];
      if (tabs) {
        proceed(tabs);
      }
    }
  });

  function parseLocation() {
    key = window.location.search.slice(1);
    var p = key.indexOf('&text=');
    if (p === -1) {
      type = key === 'rarely' ? TYPE_RARE : TYPE_HOST;
      host = key;
    } else {
      type = TYPE_SERP;
      host = key.substring(0, p);
      text = key.substring(p + 6);
      text = text.replace(/\+([^\s])/gi, ' $1');
      text = decodeURIComponent(text);
    }

    host = decodeURIComponent(host);

    //console.log('group key: %s, type: %s, text: %s', key, type, text);
  }

  function setListeners() {
    var ul = document.getElementById('links');
    ul.addEventListener('click', function(e) {

      // click link
      if (e.target.tagName === 'A') {
        e.preventDefault();
        openUrl(
          e.target.getAttribute('href'),
          ul.querySelectorAll('a').length === 1,
          e.button !== 1
        );
      }

      // click close
      if (e.target.classList.contains('closer')) {
        var a = e.target.parentNode.querySelector('a');
        sendMessage('remove-url', {url: a.getAttribute('href')});
        a.classList.add('removed-item');
      }
    });

    function onAnimationend(e) {
      if (e.target.tagName === 'A') {
        var a = e.target;
        a.parentNode.parentNode.removeChild(a.parentNode);
        var l = ul.querySelectorAll('a').length;
        if (l > 0) {
          // if there are links - update title
          setTitle(l);
        } else {
          // if no more links, close self
         closeSelf();
        }
      }
    }

    ul.addEventListener("webkitAnimationEnd",  onAnimationend);
    //ul.addEventListener("animationend",  onAnimationend)
  }

  // send message to bg
  function sendMessage(msg, data, callback) {
    data = data || {};
    data.msg = msg;
    data.key = key;
    chrome.runtime.sendMessage(data, callback);
  }

  function proceed(tabs) {
    if (tabs && tabs.length) {
      setTitle(tabs.length);
      var commonFavIconUrl = setFavicon(tabs);
      setLinks(tabs, commonFavIconUrl);
    } else {
      setTitle(0);
      setNodata();
    }
  }

  function setTitle(linksCount) {
    if (type === TYPE_SERP) {
      document.title = linksCount + ' - "' + text + '"';
    } else if (type === TYPE_RARE) {
      document.title = linksCount + ' - ' + chrome.i18n.getMessage('rarelyUsed');
    } else {
      document.title = linksCount + ' - ' + punycode.toUnicode(host);
    }
  }

  function setHeader() {
    var header = document.getElementById('header');
    var innerText;
    var href = '';
    var hostUTF8 = punycode.toUnicode(host);
    if (type === TYPE_SERP) {
      innerText = '"' + text + '" (' + hostUTF8 + ')';
      if (host.indexOf('yandex') >= 0) {
        href = 'https://' + host + '/yandsearch?text=' + encodeURIComponent(text);
      }
      if (host.indexOf('google') >= 0) {
        href = 'https://' + host + '/search?q=' + encodeURIComponent(text);
      }
    } else if (type === TYPE_RARE) {
      innerText = chrome.i18n.getMessage('rarelyUsed');
    } else {
      innerText = hostUTF8;
      href = 'http://' + host;
    }
    header.innerText = innerText;
    if (href !== '') {
      header.addEventListener('click', function(e) {
        e.preventDefault();
        openUrl(href);
      });
    }
    header.setAttribute('href', href);
  }

  function setButton() {
    // restore cur win
    var restore = document.getElementById('restore');
    restore.innerHTML = chrome.i18n.getMessage('restore');
    restore.addEventListener('click', function() {
      var links = document.querySelectorAll('#links a');
      for(var i = links.length; i--;) {
        var a = links[i];
        openUrl(a.getAttribute('href'), i === 0, false);
      }
    });

    // restore new win
    var restoreNewWin = document.getElementById('restoreNewWin');
    restoreNewWin.innerHTML = chrome.i18n.getMessage('restoreNewWin');
    restoreNewWin.addEventListener('click', function() {
      sendMessage('open-all-new-win');
      closeSelf();
    });
  }

  function setFavicon(tabs) {
    var favicon = document.getElementById('favicon');
    var favIconUrl;
    if (!favicon) {
      if (type === TYPE_SERP) {
        var img;
        if (host.indexOf('google') >= 0) {
          img = 'google.ico';
        }
        if (host.indexOf('yandex') >= 0) {
          img = /\.(com|tr)$/.test(host) ? 'yandex-en.ico' : 'yandex-ru.ico';
        }
        if (img) {
          favIconUrl = chrome.runtime.getURL('img/' + img);
        }
      } else if (type === TYPE_HOST) {
        // some tabs may not have favIcon loaded yet
        var tabWithFavicon = tabs.filter(function(tab) {
          return tab.favIconUrl;
        })[0];
        favIconUrl = tabWithFavicon && tabWithFavicon.favIconUrl;
      }
      if (favIconUrl) {
        favicon = document.createElement('link');
        favicon.setAttribute('rel', 'icon');
        favicon.setAttribute('id', 'favicon');
        favicon.setAttribute('href', favIconUrl);
        document.head.appendChild(favicon);
      }
    } else {
      favIconUrl = favicon.getAttribute('href');
    }

    return favIconUrl;
  }

  function setLinks(tabs, commonFavIconUrl) {
    var nodata = document.getElementById('nodata');
    var ul = document.getElementById('links');
    nodata.textContent = '';
    ul.innerHTML = '';
    // find equal titles
    var titles = tabs.reduce(function (res, tab) {
      res[tab.title] = res[tab.title] === undefined ? 1 : res[tab.title] + 1;
      return res;
    }, {});

    tabs.forEach(function(tab) {

      // bullet
      var img = document.createElement('img');
      img.setAttribute('class', 'bullet');
      var fUrl = type === TYPE_HOST ? commonFavIconUrl : tab.favIconUrl;
      img.setAttribute('src', fUrl || chrome.runtime.getURL('img/blank-16.png'));

      // a
      var a = document.createElement('a');
      a.setAttribute('href', tab.url);
      a.textContent = tab.title;

      // closer
      var closer = document.createElement('div');
      closer.classList.add('closer');

      // wrap
      var wrap = document.createElement('div');
      wrap.classList.add('link');
      wrap.appendChild(closer);
      wrap.appendChild(img);
      wrap.appendChild(a);

      if (titles[tab.title] >= 2) {
        var note = document.createElement('span');
        note.classList.add('note');
        note.textContent = a.pathname + a.hash;
        wrap.appendChild(note);
      }

      ul.appendChild(wrap);
    });
  }

  function setNodata() {
    var ul = document.getElementById('links');
    var nodata = document.getElementById('nodata');
    ul.innerHTML = '';
    nodata.textContent = chrome.i18n.getMessage('nodata');
  }

  function setSettingsLink() {
    document.getElementById('settings').addEventListener('click', function() {
      openUrl(chrome.runtime.getURL('options/options.html'));
    });
  }

  function openUrl(url, isLast, activate) {
    var data = {
      url: url
    };
    if (isLast !== undefined) {
      data.isLast = isLast;
    }
    if (activate !== undefined) {
      data.activate = activate;
    }
    sendMessage('open-url', data);
  }

  function closeSelf() {
    sendMessage('close-me');
  }

}());
