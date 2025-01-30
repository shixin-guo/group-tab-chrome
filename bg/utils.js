/**
 * Utils
 */
(function(exports) {

  'use strict';

  var module = {
    noop: function() {},
    parseURL: function(url) {
      //log('parseUrl', url);
      var a = document.createElement('a');
      a.href = url;
      return {
          source: url,
          href: a.href.replace(/(^https?\:\/\/)(www\.)/, '$1'),
          protocol: a.protocol.replace(':', ''),
          host: a.hostname.replace(/^www\./, ''),
          port: a.port,
          query: a.search,
          params: (function(){
              var ret = {},
                  seg = a.search.replace(/^\?/,'').split('&'),
                  len = seg.length, i = 0, s;
              for (;i<len;i++) {
                  if (!seg[i]) { continue; }
                  s = seg[i].split('=');
                  ret[s[0]] = s[1];
              }
              return ret;
          })(),
          file: (a.pathname.match(/\/([^\/?#]+)$/i) || [,''])[1],
          hash: a.hash.replace('#',''),
          path: a.pathname.replace(/^([^\/])/,'/$1'),
          relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [,''])[1],
          segments: a.pathname.replace(/^\//,'').split('/')
      };
    },
    removeDublicates: function(arr, equalFn) {
      equalFn = equalFn || function(a, b) {
        return a === b;
      };
      return arr.reduce(function(res, item) {
        var exists = res.some(function(r) {
          return equalFn(item, r);
        });
        if (!exists) {
          res.push(item);
        }
        return res;
      }, []);
    },
    getLocale: function() {
      var locale = chrome.i18n.getMessage('@@ui_locale').split('_')[0];
      return locale !== 'ru' ? 'en' : 'ru';
    }
  };

  exports.utils = module;

  // nasty log functions
  var prodIDs = ['chaoejepfhlcelgpicelfccoiojpiofn', 'hpnnhabkliinlljmhjalfmccfcdokena'];
  exports.DEBUG = prodIDs.indexOf(chrome.runtime.id) === -1;
  exports.log = function() {
    if (DEBUG) {
      console.log.apply(console, arguments);
    }
  };

  exports.logj = function() {
    if (DEBUG) {
      var args = [].map.call(arguments, function(a) {
        return typeof a === 'object' ? JSON.stringify(a, false, 2) : a;
      });
      console.log.apply(console, args);
    }
  };

}(typeof window !== 'undefined' ? window : this));
