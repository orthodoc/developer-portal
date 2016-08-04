'use strict';

var async = require('async');
var db = require('../../lib/db');
var response = require('../../lib/response');

var vandium = require('vandium');

module.exports.handler = vandium(function(event, context, callback) {
  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(response.makeError(err), result);
  };

  db.connect();
  db.listAllApprovedApps(function (err, result) {
    return dbCloseCallback(err, result);
  })
});