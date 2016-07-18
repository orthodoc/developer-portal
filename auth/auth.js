'use strict';

var jwt = require('lib/jwt');
var response = require('lib/response');

var CognitoHelper = require('cognito-helper');
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

var CustomCognitoHelper = require('lib/cognito-helper/cognito-helper');
var customCognito = new CustomCognitoHelper({
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

module.exports.login = function (event, context, callback) {

  var tokenCallback = function (err, data) {
    if (err) {
      callback(response.makeError(err), data);
    }
    else {
      customCognito.getProfile(data.id, function (err, data) {
        console.log(data);
        if (data.isApproved) {
          callback(null, {token: jwt.create(data.id)});
        } else {
          callback(new Error('User has not been approved yet.'));
        }
      });
    }
  };

  cognito.login(event.email, event.password, event.reset, tokenCallback);
};

module.exports.me = function (event, context, callback) {

  var ensureAuthenticated = function(callbackLocal) {
    var t = jwt.verify(event.jwt);
    if(t.message) {
      callback(new Error('Unauthorized: ' + t.message));
    }
    else {
      callbackLocal(t);
    }
  };

  var dataCallback = function(err, data) {
    if(err) {
      callback(response.makeError(err));
    }
    else {
      callback(null, data);
    }
  };

  ensureAuthenticated(function(userId) {
    cognito.getProfile(userId, dataCallback);
  });
};

module.exports.signup = function (event, context, callback) {

  var tokenCallback = function (err, data) {
    if (err) {
      callback(response.makeError(err), data);
    }
    else {
      callback(null, {token: jwt.create(data.id)});
    }
  };

  customCognito.signup(event.name, event.email, event.password, event.vendor, tokenCallback);
};
