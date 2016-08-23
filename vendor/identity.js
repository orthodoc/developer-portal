'use strict';
var aws = require('aws-sdk');

var identity = module.exports;
var provider = new aws.CognitoIdentityServiceProvider({region: process.env.REGION});

identity.getUser = function(token, callback) {
  provider.getUser({AccessToken: token}, function(err, data) {
    if (err) return callback(err);

    var user = {};
    data.UserAttributes.map(function (obj) {
      user[obj.Name] = obj.Value;
    });

    return callback(null, {
      id: user.sub,
      email: user.email,
      name: user.name,
      vendor: user.profile
    });
  });
};