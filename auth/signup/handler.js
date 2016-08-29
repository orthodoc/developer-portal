'use strict';
var async = require('async');
var aws = require('aws-sdk');
var mysql = require('mysql');
var vandium = require('vandium');

var db;

vandium.validation({
  name: vandium.types.string().required().error(new Error('Parameter name is required')),
  email: vandium.types.email().required().error(new Error('Parameter email is required')),
  password: vandium.types.string().required().min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/)
    .error(new Error('Parameter password is required, must have at least 8 characters and contain at least one '
      + 'lowercase letter, one uppercase letter, one number and one special character')),
  vendor: vandium.types.string().required().error(new Error('Parameter vendor is required'))
});

module.exports.handler = vandium(function(event, context, callback) {
  db = mysql.createConnection({
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
