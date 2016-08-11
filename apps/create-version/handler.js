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
  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(err, result);
  };

  db.connect();
  async.waterfall([
    function (callbackLocal) {
      identity.getUser(event.token, function (err, data) {
        if (err) return callbackLocal(err);
        return callbackLocal(null, data);
      });
    },
    function (user, callbackLocal) {
      db.getApp(event.appId, function(err, data) {
        return callbackLocal(err, data, user);
      });
    },
    function(app, user, callbackLocal) {
      db.checkAppVersionNotExists(event.appId, event.body.version, function(err) {
        return callbackLocal(err, app, user);
      });
    },
    function(data, user, callbackLocal) {
      delete data.id;
      delete data.vendor_id;
      delete data.current_version;
      delete data.is_approved;
      delete data.created_time;
      data.app_id = event.appId;
      data.version = event.body.version;
      data.user_id = user.id;
      data.user_email = user.email;
      db.insertAppVersion(data, callbackLocal);
    },
    function(callbackLocal) {
      db.updateApp({current_version: event.body.version}, event.appId, callbackLocal);
    }
  ], function(err) {
    if (err) return dbCloseCallback(err);

    db.getApp(event.appId, function(errLocal, result) {
      return dbCloseCallback(errLocal, result);
    });
  });
});