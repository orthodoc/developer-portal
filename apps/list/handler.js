'use strict';

var async = require('async');
var vandium = require('vandium');

var db = require('../../lib/db');
var response = require('../../lib/response');

module.exports.handler = vandium(function(event, context, callback) {
  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(response.makeError(err), result);
  };

  db.connect();
  db.listAllApprovedApps(function(err, result) {
    return dbCloseCallback(err, result);
  });
});