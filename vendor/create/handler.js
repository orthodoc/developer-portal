'use strict';
var async = require('async');
var db = require('../db');
var identity = require('../identity');
var vandium = require('vandium');

vandium.validation({
  body: vandium.types.object().keys({
    id: vandium.types.string().min(3).max(50).regex(/^[a-zA-Z0-9-_]+$/).required()
      .error(new Error("Parameter id is required, must have between 3 and 50 characters and contain only letters, "
        + "numbers, dashes and underscores")),
    name: vandium.types.string().required().error(new Error("Parameter name is required")),
    type: vandium.types.string().valid('reader', 'application', 'writer').required()
      .error(new Error("Parameter type is required and must be one of: reader, writer, application")),
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
  token: vandium.types.string()
});

module.exports.handler = vandium(function(event, context, callback) {
  var params = event.body;

  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(err, result);
  };

  db.connect();
  async.waterfall([
    function (callbackLocal) {
      identity.getUser(event.token, function (err, data) {
        if (err) return callbackLocal(err);
        params.user_id = data.id;
        params.user_email = data.email;
        return callbackLocal(null, data);
      });
    },
    function (user, callbackLocal) {
      params.vendor_id = user.vendor;
      params.id = user.vendor + '.' + params.id;

      db.checkAppNotExists(params.id, function (err) {
        return callbackLocal(err);
      });
    },
    function (callbackLocal) {
      db.insertApp(params, function (err) {
        return callbackLocal(err);
      });
    }
  ], function (err) {
    if (err) return dbCloseCallback(err);

    db.getApp(params.id, function (err, result) {
      return dbCloseCallback(err, result);
    });
  });
});