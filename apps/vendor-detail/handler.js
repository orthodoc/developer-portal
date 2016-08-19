'use strict';
var async = require('async');
var db = require('../db');
var identity = require('../identity');
var vandium = require('vandium');

vandium.validation({
  appId: vandium.types.string().required(),
  vendor: vandium.types.string().required()
});

module.exports.handler = vandium(function(event, context, callback) {
  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(err, result);
  };

  db.connect();
  async.waterfall([
    function (callbackLocal) {
      identity.getUser(event.token, callbackLocal);
    },
    function (user, callbackLocal) {
      if (user.vendor !== event.vendor) {
        return callbackLocal(Error('Unauthorized'));
      }
      callbackLocal();
    },
    function (callbackLocal) {
      db.getVendorApp(event.appId, function(err, data) {
        if (data.vendor.id !== event.vendor) {
          return callbackLocal(Error('Unauthorized'));
        }
        return callbackLocal(err, data);
      });
    },
    function(data, callbackLocal) {
      data.icon = {
        32: process.env.ICONS_PUBLIC_FOLDER + '/' + data.id + '/latest-32.png',
        64: process.env.ICONS_PUBLIC_FOLDER + '/' + data.id + '/latest-64.png'
      };
      callbackLocal(null, data);
    }
  ], dbCloseCallback);
});