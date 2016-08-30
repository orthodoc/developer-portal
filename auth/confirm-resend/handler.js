'use strict';
var aws = require('aws-sdk');
var moment = require('moment');
var vandium = require('vandium');

vandium.validation({
  email: vandium.types.email().required().error(new Error("Parameter email is required")),
  password: vandium.types.string().required().error(new Error("Parameter password is required"))
});

module.exports.handler = vandium(function(event, context, callback) {
  var params = {
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    ClientId: process.env.COGNITO_CLIENT_ID,
    UserPoolId: process.env.COGNITO_POOL_ID,
    AuthParameters: {
      USERNAME: event.email,
      PASSWORD: event.password
    }
  };

  var identity = new aws.CognitoIdentityServiceProvider({region: process.env.REGION});
  identity.adminInitiateAuth(params, function(err) {
    if (!err || err.code === 'NotAuthorizedException') {
      return callback(Error('Already confirmed'));
    } else {
      if (err.code === 'UserNotConfirmedException') {
        identity.resendConfirmationCode({ClientId: process.env.COGNITO_CLIENT_ID, Username: event.email}, function(err) {
          return callback(err);
        });
      } else {
        return callback(err);
      }
    }
  });
});