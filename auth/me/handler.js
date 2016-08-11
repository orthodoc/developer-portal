'use strict';
var aws = require('aws-sdk');
var identity = require('../identity');
var vandium = require('vandium');

module.exports.handler = vandium(function(event, context, callback) {
  identity.getUser(event.token, callback);
});
