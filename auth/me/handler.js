var response = require('../../lib/response');
var aws = require('aws-sdk');
var vandium = require('vandium');

module.exports.handler = vandium(function(event, context, callback) {
  var identity = new aws.CognitoIdentityServiceProvider({region: process.env.SERVERLESS_REGION});
  identity.getUser({AccessToken: event.token}, function(err, data) {
    if (err) return callback(response.makeError(err));

    var userAttributes = {};
    data.UserAttributes.map(function (obj) {
      userAttributes[obj.Name] = obj.Value;
    });

    return callback(null, {
      "email": userAttributes.email,
      "name": userAttributes.name,
      "vendor": userAttributes.profile,
      "is_approved": true
    });
  });
});
