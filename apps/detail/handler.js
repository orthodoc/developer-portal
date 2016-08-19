'use strict';
var db = require('../db');
var vandium = require('vandium');

vandium.validation({
  appId: vandium.types.string().required()
});

module.exports.handler = vandium(function(event, context, callback) {
  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(err, result);
  };

  db.connect();
  db.getPublishedApp(event.appId, function(err, app) {
    app.icon = {
      32: process.env.ICONS_PUBLIC_FOLDER + '/' + app.id + '/' + app.current_version + '-32.png',
      64: process.env.ICONS_PUBLIC_FOLDER + '/' + app.id + '/' + app.current_version + '-64.png'
    };
    return dbCloseCallback(err, app);
  });
});