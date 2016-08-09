'use strict';

var vandium = require('vandium');

var db = require('../../lib/db');
var response = require('../../lib/response');

vandium.validation({
  appId: vandium.types.string().required()
});

module.exports.handler = vandium(function(event, context, callback) {
  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(response.makeError(err), result);
  };

  db.connect();
  db.getPublishedApp(event.appId, function(err, result) {
    return dbCloseCallback(err, result);
  });
});