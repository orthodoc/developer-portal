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
  db.getPublishedApp(event.appId, dbCloseCallback);
});