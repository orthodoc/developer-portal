'use strict';

var jwt = require('../../lib/jwt');
var aws = require('aws-sdk');
var response = require('../../lib/response');

var vandium = require('vandium');

vandium.validation({
  email: vandium.types.email().required().error(new Error("Parameter email is required")),
  password: vandium.types.string().required().error(new Error("Parameter password is required")),
  reset: vandium.types.string()
});

module.exports.handler = vandium(function(event, context, callback) {
  var params = {
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    ClientId: process.env.COGNITO_USER_IDENTITY_POOL_CLIENT_ID,
    UserPoolId: process.env.COGNITO_USER_IDENTITY_POOL_ID,
    AuthParameters: {
      USERNAME: event.email,
      PASSWORD: event.password
    }
  };

  var identity = new aws.CognitoIdentityServiceProvider({region: process.env.SERVERLESS_REGION});
  identity.adminInitiateAuth(params, function(err, data) {
    if (err) {
      callback(err);
    } else {
      callback(null, {
        AccessToken: data.AuthenticationResult.AccessToken,
        ExpiresIn: data.AuthenticationResult.ExpiresIn
      })
    }
  });

});
