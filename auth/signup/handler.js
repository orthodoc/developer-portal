'use strict';

var async = require('async');
var aws = require('aws-sdk');
var jwt = require('../../lib/jwt');
var response = require('../../lib/response');

var db = require('../../lib/db');

var vandium = require('vandium');

vandium.validation({
  name: vandium.types.string().required().error(new Error("Parameter name is required")),
  email: vandium.types.email().required().error(new Error("Parameter email is required")),
  password: vandium.types.string().required().min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/)
    .error(new Error("Parameter password is required, must have at least 8 characters and contain at least one "
      + "lowercase letter, one uppercase letter, one number and one special character")),
  vendor: vandium.types.string().required().error(new Error("Parameter vendor is required"))
});

module.exports.handler = vandium(function (event, context, callback) {

  var dbCloseCallback = function(err, result) {
    db.end();
    return callback(response.makeError(err), result);
  };

  db.connect();
  async.waterfall([
    function (callbackLocal) {
      db.getVendor(event.vendor, function (err) {
        return callbackLocal(err);
      });
    },
    function(callbackLocal) {
      var provider = new aws.CognitoIdentityServiceProvider({region: process.env.SERVERLESS_REGION});
      provider.signUp({
        ClientId: process.env.COGNITO_USER_IDENTITY_POOL_CLIENT_ID,
        Username: event.email,
        Password: event.password,
        UserAttributes: [
          {
            Name: 'email',
            Value: event.email
          },
          {
            Name: 'name',
            Value: event.name
          },
          {
            Name: 'profile',
            Value: event.vendor
          }
        ]
      }, function(err) {
        return callbackLocal(err);
      });
    }
  ], function (err) {
    return dbCloseCallback(err);
  });
});
