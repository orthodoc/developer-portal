require('dotenv').load();

var vows = require('vows');
var assert = require('assert');

var jwt = require('../lib/jwt');
var jwtSimple = require('jwt-simple');
var moment = require('moment');

vows.describe('jwt class').addBatch({
  'create token': {
    topic: jwt.create(),
    'is not null': function(token) {
      assert.isNotNull(token);
    },
    'is valid': function(token) {
      var decoded = jwtSimple.decode(token, process.env.TOKEN_SECRET);
      assert.isObject(decoded);
      assert.include(decoded, 'iat');
      assert.include(decoded, 'exp');
    }
  },
  'failing verification': {
    topic: {
      sub: '',
      iat: moment().unix(),
      exp: moment().add(14, 'days').unix()
    },
    'decode': function(payload) {
      var decoded = jwtSimple.encode(payload, process.env.TOKEN_SECRET);
      var token = jwt.verify(decoded);
      assert.isObject(token);
      assert.include(token, 'code');
      assert.include(token, 'message');
      assert.equal(401, token.code);
    }
  },
  'success verification': {
    topic: {
      sub: 'klspgfsjk',
      iat: moment().unix(),
      exp: moment().add(14, 'days').unix()
    },
    'decode': function(payload) {
      var decoded = jwtSimple.encode(payload, process.env.TOKEN_SECRET);
      var token = jwt.verify('Bearer ' + decoded);
      assert.equal('klspgfsjk', token);
    }
  }
}).export(module);