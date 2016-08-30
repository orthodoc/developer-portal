'use strict';
var async = require('async');
var db = require('../db');
var vandium = require('vandium');

vandium.validation({
  offset: vandium.types.number().default(0),
  limit: vandium.types.number().default(100)
});

module.exports.handler = vandium(function(event, context, callback) {
  db.connect();
  async.waterfall([
    function (callbackLocal) {
      db.listAllPublishedApps(event.offset, event.limit, function(err, res) {
        if (err) return callbackLocal(err);
        res.map(function(app) {
          app.icon = {
            32: process.env.ICONS_PUBLIC_FOLDER + '/' + app.id + '/' + app.current_version + '-32.png',
            64: process.env.ICONS_PUBLIC_FOLDER + '/' + app.id + '/' + app.current_version + '-64.png'
          };
        });
        return callbackLocal(null, res);
      });
    }
  ], function(err, result) {
    db.end();
    return callback(err, result);
  });
});