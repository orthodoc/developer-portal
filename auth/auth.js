'use strict';
var async = require('async');
var aws = require('aws-sdk');
var identity = require('lib/identity');
var moment = require('moment');
var mysql = require('mysql');
const vandium = require('vandium');


/**
 * Confirm
 */
module.exports.confirm = vandium.createInstance({
  validation: {
    email: vandium.types.string().required().error(new Error("Parameter email is required")),
    code: vandium.types.string().required().error(new Error("Parameter code is required"))
  }
}).handler(function(event, context, callback) {
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


/**
 * Login
 */
module.exports.login = vandium.createInstance({
  validation: {
    email: vandium.types.email().required().error(new Error("Parameter email is required")),
    password: vandium.types.string().required().error(new Error("Parameter password is required"))
  }
}).handler(function(event, context, callback) {
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
  identity.adminInitiateAuth(params, function(err, data) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, {
        token: data.AuthenticationResult.AccessToken, //data.AuthenticationResult.IdToken,
        expires: moment().add(data.AuthenticationResult.ExpiresIn, 's').utc().format()
      });
    }
  });
});

/**
 * Profile
 */
module.exports.profile = vandium.createInstance({
  validation: {
    token: vandium.types.string().required()
  }
}).handler(function(event, context, callback) {
  identity.getUser(event.token, callback);
});


/**
 * Signup
 */
module.exports.signup = vandium.createInstance({
  validation: {
    name: vandium.types.string().required().error(new Error('Parameter name is required')),
    email: vandium.types.email().required().error(new Error('Parameter email is required')),
    password: vandium.types.string().required().min(8)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/)
      .error(new Error('Parameter password is required, must have at least 8 characters and contain at least one '
        + 'lowercase letter, one uppercase letter, one number and one special character')),
    vendor: vandium.types.string().required().error(new Error('Parameter vendor is required'))
  }
}).handler(function(event, context, callback) {
  var db = mysql.createConnection({
    host: process.env.RDS_HOST,
    user: process.env.RDS_USER,
    password: process.env.RDS_PASSWORD,
    database: process.env.RDS_DATABASE,
    ssl: 'Amazon RDS'
  });

  async.waterfall([
    function(callbackLocal) {
      db.query('SELECT * FROM `vendors` WHERE `id` = ?', [event.vendor], function(err, result) {
        if (err) return callbackLocal(err);

        if (result.length === 0) {
          return callbackLocal(Error('Vendor ' + id + ' does not exist'));
        }

        return callbackLocal();
      });
    },
    function(callbackLocal) {
      var provider = new aws.CognitoIdentityServiceProvider({region: process.env.REGION});
      provider.signUp({
        ClientId: process.env.COGNITO_CLIENT_ID,
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
  ], function(err) {
    db.destroy();
    return callback(err, result);
  });
});