'use strict';
var async = require('async');
var db = require('../db');
var identity = require('../identity');
var vandium = require('vandium');

vandium.validation({
  appId: vandium.types.string().required()
});

module.exports.handler = vandium(function(event, context, callback) {
  db.connect();
  async.waterfall([
    function (callbackLocal) {
      identity.getUser(event.token, callbackLocal);
    },
    function(user, callbackLocal) {
      db.listAppVersions(event.appId, function(err, res) {
        if (err) return callbackLocal(err);
        res.map(function(data) {
          data.id = data.app_id;
          delete data.app_id;
          delete data.user_id;
          delete data.user_email;
          delete data.is_approved;
          data.icon = {
            32: process.env.ICONS_PUBLIC_FOLDER + '/' + event.appId + '/' + data.version + '-32.png',
            64: process.env.ICONS_PUBLIC_FOLDER + '/' + event.appId + '/' + data.version + '-64.png'
          };
        });
        callbackLocal(err, res);
      });
    }
  ], function(err, result) {
    db.end();
    return callback(err, result);
  });
});