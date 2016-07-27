'use strict';

var jwt = require('../../lib/jwt');

var mysql = require('mysql');
var db = mysql.createConnection({
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
  jwt: vandium.types.string(),
  appId: vandium.types.string().required()
});

module.exports.handler = vandium( function (event, context, callback) {

  var ensureAuthenticated = function(callbackLocal) {
    var t = jwt.verify(event.jwt);
    if(t.message) {
      callback(new Error('Unauthorized: ' + t.message));
    }
    else {
      callbackLocal(t);
    }
  };

  var saveApp = function(appId, params, userId, callbackLocal) {
    db.connect(function(err) {
      if (err) {
        throw new Error('error connecting: ' + err.stack);
      }

      db.query('SELECT * FROM `apps` WHERE `id` = ?', [appId], function (err, result) {
        if (err) throw err;

        if (result.length == 0) {
          throw new Error('App ' + appId + ' does not exist');
        }

        db.query('UPDATE apps SET ? WHERE id=?', [params, appId], function (err, result) {
          if (err) throw err;

          db.end();
          callbackLocal();
        });
      });
    });
  };

  ensureAuthenticated(function(userId) {
    saveApp(event.appId, event.body, userId, function() {
      return callback(null, {'status': 'ok'});
    });
  });

});