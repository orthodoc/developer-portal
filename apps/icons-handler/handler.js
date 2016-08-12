'use strict';
var async = require('async');
var aws = require('aws-sdk');
var db = require('../db');
var vandium = require('vandium');

module.exports.handler = vandium(function(event, context, callback)
{
  console.log('user', JSON.stringify(event));

  var s3 = new AWS.S3();
  var params = {Bucket: 'myBucket', Key: 'myKey'};
  s3.getSignedUrl('putObject', params, function (err, url) {
    console.log("The URL is", url);
  });

  //@TODO
  // identify user from event.Records[0].userIdentity.principalId (will be something like "AWS:AROAJPCQMRBPBENHSIP7A:CognitoIdentityCredentials")
  // - event.Records[0].s3.bucket.name
  // - event.Records[0].s3.object.key
  // - event.Records[0].s3.object.size
});