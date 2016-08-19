'use strict';
var async = require('async');
var aws = require('aws-sdk');
var db = require('../db');
var identity = require('../identity');
var moment = require('moment');
var vandium = require('vandium');

vandium.validation({
  token: vandium.types.string(),
  appId: vandium.types.string().required().error(new Error('Parameter appId is required'))
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
    function(user, callbackLocal) {
      db.getApp(event.appId, function(err, data) {
        if (user.vendor !== data.vendor_id) {
          return callbackLocal(Error('Unauthorized'));
        }
        return callbackLocal(err, data);
      });
    },
    function(app, callbackLocal) {
      var s3 = new aws.S3();
      var validity = 3600;
      var expires = moment().add(validity, 's').utc().format();
      async.parallel({
        32: function (callbackLocal2) {
          s3.getSignedUrl(
            'putObject',
            {Bucket: process.env.S3_BUCKET_ICONS, Key: app.id + '/latest-32.png', Expires: validity, ContentType: 'image/png'},
            callbackLocal2
          );
        },
        64: function (callbackLocal2) {
          s3.getSignedUrl(
            'putObject',
            {Bucket: process.env.S3_BUCKET_ICONS, Key: app.id + '/latest-64.png', Expires: validity, ContentType: 'image/png'},
            callbackLocal2
          );
        }
      }, function(err, data) {
        if (err) return callbackLocal(err);
        data.expires = expires;
        return callbackLocal(null, data);
      });
    }
  ], dbCloseCallback);
});