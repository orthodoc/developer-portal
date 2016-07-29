'use strict';

var jwt = require('../../lib/jwt');
var async = require('async');
var db = require('../../lib/db');

var CognitoHelper = require('../../lib/cognito-helper/cognito-helper');
var cognito = new CognitoHelper({
  AWS_ACCOUNT_ID: process.env.AWS_ACCOUNT_ID,
  COGNITO_IDENTITY_POOL_ID: process.env.COGNITO_IDENTITY_POOL_ID,
  COGNITO_DEVELOPER_PROVIDER_NAME: process.env.COGNITO_DEVELOPER_PROVIDER_NAME,
  COGNITO_SEPARATOR: process.env.COGNITO_SEPARATOR || '----',
  COGNITO_DATASET_NAME: process.env.COGNITO_DATASET_NAME || 'profile',
  COGNITO_PASSWORD_RESET_URL: process.env.COGNITO_PASSWORD_RESET_URL || 'http://localhost:8100/app.html#/reset/{email}/{reset}',
  COGNITO_PASSWORD_RESET_BODY: process.env.COGNITO_PASSWORD_RESET_BODY || 'Dear {name}, please follow the link below to reset your password:',
  COGNITO_PASSWORD_RESET_SUBJECT: process.env.COGNITO_PASSWORD_RESET_SUBJECT || 'Password reset',
  COGNITO_PASSWORD_RESET_SOURCE: process.env.COGNITO_PASSWORD_RESET_SOURCE || 'Password reset <noreply@yourdomain.com>'
});

var vandium = require('vandium');
vandium.validation({
  body: vandium.types.object().keys({
    id: vandium.types.string().min(3).max(50).regex(/^[a-zA-Z0-9-_]+$/).required(),
    name: vandium.types.string().required(),
    type: vandium.types.string().valid('reader', 'application', 'writer').required(),
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
  jwt: vandium.types.string()
});

module.exports.handler = vandium(function(event, context, callback) {
  var params = event.body;

  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(err, result);
  };

  jwt.authenticate(event.jwt, function (err, userId) {
    if (err) return dbCloseCallback(err);

    params.user_id = userId;

    async.waterfall([
      function (callbackLocal) {
        cognito.getProfile(userId, function (err, result) {
          if (err) return callbackLocal(err);

          return callbackLocal(null, result.vendor);
        });
      },
      function (vendor, callbackLocal) {
        params.vendor_id = vendor;
        params.id = vendor + '.' + params.id;

        db.checkAppNotExists(params.id, function (err) {
          if (err) return callbackLocal(err);

          return callbackLocal();
        });
      },
      function (callbackLocal) {
        db.insert('apps', params, function (err) {
          if (err) return callbackLocal(err);

          return callbackLocal();
        });
      }
    ], function (err) {
      if (err) return dbCloseCallback(err);

      db.getApp(params.id, function (err, result) {
        if (err) return dbCloseCallback(err);

        return dbCloseCallback(null, result);
      });
    });
  });
});