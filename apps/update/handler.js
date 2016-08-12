'use strict';
var async = require('async');
var db = require('../db');
var identity = require('../identity');
var vandium = require('vandium');

vandium.validation({
  body: vandium.types.object().keys({
    name: vandium.types.string().error(Error('Parameter name must be string')),
    type: vandium.types.string().valid('reader', 'application', 'writer')
      .error(Error('Parameter type must be one of: reader, writer, application')),
    image_url: vandium.types.string().uri().error(Error('Parameter image_url must be url')),
    image_tag: vandium.types.string().error(Error('Parameter image_tag must be string')),
    short_description: vandium.types.string().error(Error('Parameter short_description must be string')),
    long_description: vandium.types.string().error(Error('Parameter long_description must be string')),
    license_url: vandium.types.string().uri().error(Error('Parameter license_url must be url')),
    documentation_url: vandium.types.string().uri().error(Error('Parameter documentation_url must be url')),
    required_memory: vandium.types.string().error(Error('Parameter required_memory must be string')),
    process_timeout: vandium.types.number().integer().min(1)
      .error(Error('Parameter process_timeout must be integer bigger than one')),
    encryption: vandium.types.boolean().error(Error('Parameter encryption must be boolean')),
    default_bucket: vandium.types.boolean().error(Error('Parameter default_bucket must be boolean')),
    default_bucket_stage: vandium.types.string().valid('in', 'out')
      .error(Error('Parameter default_bucket_stage must be one of: in, out')),
    forward_token: vandium.types.boolean().error(Error('Parameter forward_token must be boolean')),
    ui_options: vandium.types.array().error(Error('Parameter ui_options must be array')),
    test_configuration: vandium.types.object(),
    configuration_schema: vandium.types.object(),
    networking: vandium.types.string().valid('dataIn', 'dataOut')
      .error(Error('Parameter networking must be one of: dataIn, dataOut')),
    actions: vandium.types.array().error(Error('Parameter actions must be array')),
    fees: vandium.types.boolean().error(Error('Parameter fees must be boolean')),
    limits: vandium.types.string().error(Error('Parameter limits must be string')),
    logger: vandium.types.string().valid('standard', 'gelf')
      .error(Error('Parameter logger must be one of: standard, gelf'))
  }),
  token: vandium.types.string(),
  appId: vandium.types.string().required()
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
      db.getApp(event.appId, function(err, data) {
        if (user.vendor !== data.vendor_id) {
          return callbackLocal(Error('Unauthorized'));
        }
        return callbackLocal(err, data);
      });
    },
    function(data, callbackLocal) {
      db.updateApp(event.body, event.appId, callbackLocal);
    }
  ], function(err) {
    if (err) return dbCloseCallback(err);
    db.getApp(event.appId, dbCloseCallback);
  });
});