'use strict';

var jwt = require('../../lib/jwt');
var async = require('async');
var db = require('../../lib/db');
var vandium = require('vandium');

vandium.validation({
  body: vandium.types.object().keys({
    name: vandium.types.string(),
    type: vandium.types.string().valid('reader', 'application', 'writer'),
    image_url: vandium.types.string(),
    image_tag: vandium.types.string(),
    short_description: vandium.types.string(),
    long_description: vandium.types.string(),
    license_url: vandium.types.string(),
    documentation_url: vandium.types.string(),
    required_memory: vandium.types.string(),
    process_timeout: vandium.types.number().integer().min(1),
    encryption: vandium.types.boolean(),
    default_bucket: vandium.types.boolean(),
    default_bucket_stage: vandium.types.string().valid('in', 'out'),
    forward_token: vandium.types.boolean(),
    ui_options: vandium.types.array(),
    test_configuration: vandium.types.object(),
    configuration_schema: vandium.types.object(),
    networking: vandium.types.string().valid('dataIn', 'dataOut'),
    actions: vandium.types.array(),
    fees: vandium.types.boolean(),
    limits: vandium.types.string(),
    logger: vandium.types.string().valid('standard', 'gelf')
  }),
  jwt: vandium.types.string(),
  appId: vandium.types.string().required()
});

module.exports.handler = vandium(function(event, context, callback) {

  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(err, result);
  };

  async.waterfall([
    function (callbackLocal) {
      jwt.authenticate(event.jwt, function (err, userId) {
        if (err) return callbackLocal(err);

        return callbackLocal(null, userId);
      });
    },
    function(userId, callbackLocal) {
      db.getApp(event.appId, function (err) {
        if (err) return callbackLocal(err);

        return callbackLocal();
      });
    },
    function (callbackLocal) {
      db.update('apps', event.body, event.appId, function (err) {
        if (err) return callbackLocal(err);

        return callbackLocal();
      });
    }
  ], function (err) {
    if (err) return dbCloseCallback(err);

    db.getApp(event.appId, function (err, result) {
      if (err) return dbCloseCallback(err);

      return dbCloseCallback(null, result);
    });
  });
});