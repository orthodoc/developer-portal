'use strict';
var async = require('async');
var db = require('../db');
var identity = require('../identity');
var vandium = require('vandium');

vandium.validation({
  body: vandium.types.object().keys({
    version: vandium.types.string().regex(/^\d.\d.\d$/).required()
      .error(new Error('Parameter version is required and must have format X.X.X'))
  }),
  appId: vandium.types.string(),
  token: vandium.types.string()
});

module.exports.handler = vandium(function(event, context, callback) {
  db.connect();
  async.waterfall([
    function (callbackLocal) {
      identity.getUser(event.token, callbackLocal);
    },
    function (user, callbackLocal) {
      db.getApp(event.appId, function(err, data) {
        if (user.vendor !== data.vendor.id) {
          return callbackLocal(Error('Unauthorized'));
        }
        return callbackLocal(err);
      });
    },
    function(callbackLocal) {
      db.getAppVersion(event.appId, event.version, function (err, data) {
        if (err) return callbackLocal(err);
        data.id = data.app_id;
        delete data.app_id;
        delete data.user_id;
        delete data.user_email;
        delete data.is_approved;
        data.icon = {
          32: process.env.ICONS_PUBLIC_FOLDER + '/' + event.appId + '/' + event.version + '-32.png',
          64: process.env.ICONS_PUBLIC_FOLDER + '/' + event.appId + '/' + event.version + '-64.png'
        };
        return callbackLocal(err, data);
      });
    }
  ], function(err, result) {
    db.end();
    return callback(err, result);
  });
});