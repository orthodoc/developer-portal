'use strict';

var jwt = require('../../lib/jwt');
var async = require('async');

var mysql = require('mysql');
var dbPool = mysql.createPool({
  host: process.env.RDS_HOST,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DATABASE,
  ssl: "Amazon RDS"
});

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
    imageUrl: vandium.types.string(),
    imageTag: vandium.types.string(),
    shortDescription: vandium.types.string(),
    longDescription: vandium.types.string(),
    licenseUrl: vandium.types.string(),
    documentationUrl: vandium.types.string(),
    requiredMemory: vandium.types.string(),
    processTimeout: vandium.types.number().integer().min(1),
    encryption: vandium.types.boolean(),
    defaultBucket: vandium.types.boolean(),
    defaultBucketStage: vandium.types.string().valid('in', 'out'),
    forwardToken: vandium.types.boolean(),
    uiOptions: vandium.types.array(),
    testConfiguration: vandium.types.object(),
    configurationSchema: vandium.types.object(),
    networking: vandium.types.string().valid('dataIn', 'dataOut'),
    actions: vandium.types.array(),
    fees: vandium.types.boolean(),
    limits: vandium.types.string(),
    logger: vandium.types.string().valid('standard', 'gelf')
  }),
  jwt: vandium.types.string()
});

module.exports.handler = vandium( function (event, context, callback) {
  var params = event.body;

  jwt.authenticate(event.jwt, function (err, userId) {
    if (err) return callback(err);

    async.parallel([
      function (callbackLocal) {
        dbPool.getConnection(function (err, db) {
          if (err) return callbackLocal(err);

          db.query('SELECT * FROM `apps` WHERE `id` = ?', [params.id], function (err, result) {
            if (err) return callbackLocal(err);

            if (result.length != 0) {
              return callbackLocal(Error('App ' + params.id + ' already exists'));
            }

            return callbackLocal();
          });
        });
      },
      function (callbackLocal) {
        cognito.getProfile(userId, function (err, result) {
          if (err) return callbackLocal(err);

          return callbackLocal(null, result);
        });
      }
    ], function (err, result) {
      if (err) return callback(err);

      params.id = result[1].vendor + '.' + params.id;
      params.vendor_id = result[1].vendor;
      params.user_id = userId;

      dbPool.getConnection(function (err, db) {
        if (err) return callback(err);

        db.query('INSERT INTO apps SET ?', params, function (err, result) {
          if (err) return callback(err);

          return callback();
        });
      });
    });
  });
});