'use strict';

var jwt = require('../../lib/jwt');
var async = require('async');

var mysql = require('mysql');
var db = mysql.createPool({
  host: process.env.RDS_HOST,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DATABASE,
  ssl: "Amazon RDS"
});

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

module.exports.handler = vandium( function (event, context, callback) {

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
      db.query('SELECT * FROM `apps` WHERE `id` = ?', [event.appId], function (err, result) {
        if (err) return callbackLocal(err);

        if (result.length == 0) {
          return callbackLocal(Error('App ' + event.appId + ' does not exist'));
        }

        return callbackLocal();
      });
    }
  ], function (err) {
    if (err) return dbCloseCallback(err);

    db.query('UPDATE apps SET ? WHERE id=?', [event.body, event.appId], function (err) {
      if (err) return dbCloseCallback(err);

      return dbCloseCallback();
    });
  });
});