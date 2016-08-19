'use strict';
var async = require('async');
var aws = require('aws-sdk');
var db = require('../db');
var identity = require('../identity');
var vandium = require('vandium');

vandium.validation({
  body: vandium.types.object().keys({
    version: vandium.types.string().regex(/^\d.\d.\d$/).required()
      .error(new Error('Parameter version is required and must have format X.X.X'))
  }),
  appId: vandium.types.string(),
  token: vandium.types.string()
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
        if (user.vendor !== data.vendor.id) {
          return callbackLocal(Error('Unauthorized'));
        }
        return callbackLocal(err, data, user);
      });
    },
    function(app, user, callbackLocal) {
      db.checkAppVersionNotExists(event.appId, event.body.version, function(err) {
        return callbackLocal(err, app, user);
      });
    },
    function(data, user, callbackLocal) {
      delete data.id;
      delete data.vendor_id;
      delete data.current_version;
      delete data.is_approved;
      delete data.created_time;
      data.app_id = event.appId;
      data.version = event.body.version;
      data.user_id = user.id;
      data.user_email = user.email;
      db.insertAppVersion(data, callbackLocal);
    },
    function(callbackLocal) {
      db.updateApp({current_version: event.body.version}, event.appId, callbackLocal);
    },
    function(callbackLocal) {
      var s3 = new aws.S3();
      async.parallel([
        function(callbackLocal2) {
          s3.copyObject(
            {
              CopySource: process.env.S3_BUCKET_ICONS + '/' + event.appId + '/latest-32.png',
              Bucket: process.env.S3_BUCKET_ICONS,
              Key: event.appId + '/' + event.body.version + '-32.png',
              ACL: 'public-read'
            },
            callbackLocal2
          );
        },
        function(callbackLocal2) {
          s3.copyObject(
            {
              CopySource: process.env.S3_BUCKET_ICONS + '/' + event.appId + '/latest-64.png',
              Bucket: process.env.S3_BUCKET_ICONS,
              Key: event.appId + '/' + event.body.version + '-64.png',
              ACL: 'public-read'
            },
            callbackLocal2
          );
        }
      ], callbackLocal);
    }
  ], function(err) {
    if (err) return dbCloseCallback(err);

    db.getApp(event.appId, function(errLocal, result) {
      return dbCloseCallback(errLocal, result);
    });
  });
});