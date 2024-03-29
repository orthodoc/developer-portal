'use strict';
var async = require('async');
var aws = require('aws-sdk');
var db = require('../db');
var identity = require('../identity');
var vandium = require('vandium');

vandium.validation({
  token: vandium.types.string(),
  appId: vandium.types.string().required().error(new Error('Parameter appId is required')),
  body: vandium.types.object()
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
        if (user.vendor !== data.vendor.id) {
          return callbackLocal(Error('Unauthorized'));
        }
        if (data.is_approved) {
          return callbackLocal(Error('Already approved'));
        }
        return callbackLocal(err, data);
      });
    },
    function(app, callbackLocal) {
      var required = ['image_url', 'image_tag', 'short_description', 'long_description', 'license_url', 'documentation_url'];
      var empty = [];
      required.forEach(function(item) {
        if (!app[item]) {
          empty.push(item);
        }
      });
      if (empty.length) {
        return callbackLocal(Error('App properties ' + empty.join(', ') + ' cannot be empty'));
      }
      return callbackLocal(null, app);
    },
    function(app, callbackLocal) {
      var s3 = new aws.S3();
      async.parallel([
        function(callbackLocal2) {
          s3.headObject({ Bucket: process.env.S3_BUCKET_ICONS, Key: app.id + '/latest-32.png' }, function(err) {
            if (err) {
              if (err.code === 'NotFound') {
                return callbackLocal2(Error('App icon of size 32px does not exist in s3 storage, upload it first.'));
              } else {
                return callbackLocal2(err);
              }
            } else {
              return callbackLocal2();
            }
          });
        },
        function(callbackLocal2) {
          s3.headObject({ Bucket: process.env.S3_BUCKET_ICONS, Key: app.id + '/latest-64.png' }, function(err) {
            if (err) {
              if (err.code === 'NotFound') {
                return callbackLocal2(Error('App icon of size 64px does not exist in s3 storage, upload it first.'));
              } else {
                return callbackLocal2(err);
              }
            } else {
              return callbackLocal2();
            }
          });
        }
      ], function(err) {
        return callbackLocal(err, app);
      });
    }
  ], function(err, app) {
    if (err) return dbCloseCallback(err);

    var ses = new aws.SES({apiVersion: '2010-12-01', region: process.env.REGION});
    ses.sendEmail({
      Source: process.env.SES_EMAIL,
      Destination: { ToAddresses: [process.env.SES_EMAIL] },
      Message: {
        Subject: {
          Data: '[dev-portal] Request for approval of app ' + app.id
        },
        Body: {
          Text: {
            Data: JSON.stringify(app, null, 4)
          }
        }
      }
    }, function(errLocal) {
      return dbCloseCallback(errLocal);
    });
  });
});