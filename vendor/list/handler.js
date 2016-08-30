'use strict';
var async = require('async');
var db = require('../db');
var identity = require('../identity');
var vandium = require('vandium');

vandium.validation({
  offset: vandium.types.number().default(0),
  limit: vandium.types.number().default(100)
});

module.exports.handler = vandium(function(event, context, callback) {
  db.connect();
  async.waterfall([
    function (callbackLocal) {
      identity.getUser(event.token, callbackLocal);
    },
    function(user, callbackLocal) {
      db.listAppsForVendor(user.vendor, event.offset, event.limit, function(err, res) {
        if (err) return callbackLocal(err);
        res.map(function(app) {
          app.icon = {
            32: process.env.ICONS_PUBLIC_FOLDER + '/' + app.id + '/latest-32.png',
            64: process.env.ICONS_PUBLIC_FOLDER + '/' + app.id + '/latest-64.png'
          };
        });
        callbackLocal(null, res);
      });
    }
  ], function(err, result) {
    db.end();
    return callback(err, result);
  });
});