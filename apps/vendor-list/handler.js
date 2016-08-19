'use strict';
var async = require('async');
var db = require('../db');
var identity = require('../identity');
var vandium = require('vandium');

vandium.validation({
  vendor: vandium.types.string().required()
});

module.exports.handler = vandium(function(event, context, callback) {
  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(err, result);
  };

  db.connect();
  async.waterfall([
    function (callbackLocal) {
      identity.getUser(event.token, callbackLocal);
    },
    function (user, callbackLocal) {
      if (user.vendor !== event.vendor) {
        return callbackLocal(Error('Unauthorized'));
      }
      callbackLocal();
    },
    function(callbackLocal) {
      db.listAllVendorApps(event.vendor, function(err, res) {
        res.map(function(app) {
          app.icon = {
            32: process.env.ICONS_PUBLIC_FOLDER + '/' + app.id + '/latest-32.png',
            64: process.env.ICONS_PUBLIC_FOLDER + '/' + app.id + '/latest-64.png'
          };
        });
        callbackLocal(err, res);
      });
    }
  ], dbCloseCallback);
});