'use strict';

var async = require('async');
var db = require('../../lib/db');
var jwt = require('../../lib/jwt');
var response = require('../../lib/response');

var vandium = require('vandium');
vandium.validation({
  body: vandium.types.object().keys({
    version: vandium.types.string().regex(/^\d.\d.\d$/).required()
      .error(new Error('Parameter version is required and must have format X.X.X'))
  }),
  appId: vandium.types.string(),
  jwt: vandium.types.string()
});

module.exports.handler = vandium(function(event, context, callback) {
  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(response.makeError(err), result);
  };

  db.connect();
  async.waterfall([
    function(callbackLocal) {
      jwt.authenticate(event.jwt, function(err, userId) {
        if (err) return callbackLocal(err);
        return callbackLocal(null, userId);
      });
    },
    function(userId, callbackLocal) {
      db.getApp(event.appId, function(err, data) {
        return callbackLocal(err, data, userId);
      });
    },
    function(data, userId, callbackLocal) {
      db.checkAppVersionNotExists(event.appId, event.body.version, function(err) {
        return callbackLocal(err, data, userId);
      });
    },
    function(data, userId, callbackLocal) {
      delete data.id;
      delete data.vendor_id;
      delete data.current_version;
      delete data.is_approved;
      delete data.created_time;
      data.app_id = event.appId;
      data.version = event.body.version;
      data.user_id = userId;
      db.insertAppVersion(data, function(err) {
        return callbackLocal(err);
      });
    },
    function(callbackLocal) {
      db.updateApp({current_version: event.body.version}, event.appId, function(err) {
        return callbackLocal(err);
      });
    }
  ], function(err) {
    if (err) return dbCloseCallback(err);

    db.getApp(event.appId, function(errLocal, result) {
      return dbCloseCallback(errLocal, result);
    });
  });
});