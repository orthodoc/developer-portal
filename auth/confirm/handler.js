'use strict';
var async = require('async');
var aws = require('aws-sdk');
var vandium = require('vandium');

vandium.validation({
  email: vandium.types.string().required(),
  code: vandium.types.string().required()
});

module.exports.handler = vandium(function(event, context, callback) {
  var provider = new aws.CognitoIdentityServiceProvider({region: process.env.REGION});
  async.waterfall([
    function (callbackLocal) {
      provider.confirmSignUp({
        ClientId: process.env.COGNITO_CLIENT_ID,
        ConfirmationCode: event.code,
        Username: event.email
      }, function(err) {
        return callbackLocal(err);
      });
    },
    function(callbackLocal) {
      provider.adminDisableUser({
        UserPoolId: process.env.COGNITO_POOL_ID,
        Username: event.email
      }, function(err) {
        return callbackLocal(err);
      });
    }
  ], function (err) {
    if (err) return callback(err);

    var ses = new aws.SES({apiVersion: '2010-12-01', region: process.env.REGION});
    ses.sendEmail({
      Source: process.env.SES_EMAIL,
      Destination: { ToAddresses: [process.env.SES_EMAIL] },
      Message: {
        Subject: {
          Data: '[dev-portal] User ' + event.email + ' requests approval'
        },
        Body: {
          Text: {
            Data: 'User ' + event.email + ' just signed up'
          }
        }
      }
    }, function(err) {
      return callback(err);
    });
  });
});
