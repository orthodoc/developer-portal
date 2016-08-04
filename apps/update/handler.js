'use strict';

var async = require('async');
var db = require('../../lib/db');
var jwt = require('../../lib/jwt');
var response = require('../../lib/response');

var vandium = require('vandium');
vandium.validation({
  body: vandium.types.object().keys({
    name: vandium.types.string().error(new Error("Parameter name must be string")),
    type: vandium.types.string().valid('reader', 'application', 'writer')
      .error(new Error("Parameter type must be one of: reader, writer, application")),
    image_url: vandium.types.string().uri().error(new Error("Parameter image_url must be url")),
    image_tag: vandium.types.string().error(new Error("Parameter image_tag must be string")),
    short_description: vandium.types.string().error(new Error("Parameter short_description must be string")),
    long_description: vandium.types.string().error(new Error("Parameter long_description must be string")),
    license_url: vandium.types.string().uri().error(new Error("Parameter license_url must be url")),
    documentation_url: vandium.types.string().uri().error(new Error("Parameter documentation_url must be url")),
    required_memory: vandium.types.string().error(new Error("Parameter required_memory must be string")),
    process_timeout: vandium.types.number().integer().min(1)
      .error(new Error("Parameter process_timeout must be integer bigger than one")),
    encryption: vandium.types.boolean().error(new Error("Parameter encryption must be boolean")),
    default_bucket: vandium.types.boolean().error(new Error("Parameter default_bucket must be boolean")),
    default_bucket_stage: vandium.types.string().valid('in', 'out')
      .error(new Error("Parameter default_bucket_stage must be one of: in, out")),
    forward_token: vandium.types.boolean().error(new Error("Parameter forward_token must be boolean")),
    ui_options: vandium.types.array().error(new Error("Parameter ui_options must be array")),
    test_configuration: vandium.types.object(),
    configuration_schema: vandium.types.object(),
    networking: vandium.types.string().valid('dataIn', 'dataOut')
      .error(new Error("Parameter networking must be one of: dataIn, dataOut")),
    actions: vandium.types.array().error(new Error("Parameter actions must be array")),
    fees: vandium.types.boolean().error(new Error("Parameter fees must be boolean")),
    limits: vandium.types.string().error(new Error("Parameter limits must be string")),
    logger: vandium.types.string().valid('standard', 'gelf')
      .error(new Error("Parameter logger must be one of: standard, gelf"))
  }),
  jwt: vandium.types.string(),
  appId: vandium.types.string().required()
});

module.exports.handler = vandium(function(event, context, callback) {

  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(response.makeError(err), result);
  };

  db.connect();
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
      db.updateApp(event.body, event.appId, function (err) {
        if (err) return callbackLocal(err);

        return callbackLocal();
      });
    }
  ], function (err) {
    if (err) return dbCloseCallback(err);

    db.getApp(event.appId, function (err, result) {
      return dbCloseCallback(err, result);
    });
  });
});