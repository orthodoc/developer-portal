require('dotenv').load();
var assert = require('chai').assert;

var jwt = require('../libs/jwt');
var jwtSimple = require('jwt-simple');
var moment = require('moment');

describe('jwt class', function() {

    it('should create token', function() {
        token = jwt.create();

        assert.isNotNull(token);

        decoded = jwtSimple.decode(token, process.env.TOKEN_SECRET);
        assert.isObject(decoded);
        assert.property(decoded, 'iat');
        assert.property(decoded, 'exp');
    });

    it('should fail on verify token', function() {
        var payload = {
            sub: '',
            iat: moment().unix(),
            exp: moment().add(14, 'days').unix()
        };
        decoded = jwtSimple.encode(payload, process.env.TOKEN_SECRET);
        token = jwt.verify(decoded);
        assert.isObject(token);
        assert.property(token, 'code');
        assert.property(token, 'message');
        assert.equal(401, token.code);
    });

    it('should verify token', function() {
        var payload = {
            sub: 'klspgfsjk',
            iat: moment().unix(),
            exp: moment().add(14, 'days').unix()
        };
        decoded = jwtSimple.encode(payload, process.env.TOKEN_SECRET);
        token = jwt.verify('Bearer ' + decoded);
        assert.equal('klspgfsjk', token);
    });
});