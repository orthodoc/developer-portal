'use strict';
var db = require('../db');
var vandium = require('vandium');

module.exports.handler = vandium(function(event, context, callback) {
  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(err, result);
  };

  db.connect();
  db.listAllPublishedApps(function(err, res) {
    res.map(function(app) {
      app.icon = {
        32: process.env.ICONS_PUBLIC_FOLDER + '/' + app.id + '/' + app.current_version + '-32.png',
        64: process.env.ICONS_PUBLIC_FOLDER + '/' + app.id + '/' + app.current_version + '-64.png'
      };
    });
    dbCloseCallback(err, res);
  });
});