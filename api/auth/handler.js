var jwt = require('../lib/jwt');

var CognitoHelper = require('cognito-helper');
var cognito = new CognitoHelper();

module.exports.handler = function (event, context) {

    // /auth/{operation}
    var operation = event.operation;
    var payload = event.payload;

    var ensureAuthenticated = function (callback) {
        var authorization = event.authorization;
        delete event.authorization;

        var t = jwt.verify(authorization);
        if (t.message) {
            context.fail(new Error('Unauthorized: ' + t.message));
        }
        else {
            callback(t);
        }
    };

    var dataCallback = function (err, data) {
        if (err) {
            context.fail(makeError(err));
        }
        else {
            context.succeed(data);
        }
    };

    var makeError = function (err) {
        var errorCode = 'Bad Request';
        switch (err.code) {
            case 404:
                errorCode = 'Not Found';
                break;
            case 409:
                errorCode = 'Conflict';
                break;
            case 401:
                errorCode = 'Unauthorized';
                break;
        }
        return new Error(errorCode + ': ' + (err.error || err));
    };

    var tokenCallback = function (err, data) {
        if (err) {
            context.fail(makeError(err));
        }
        else {
            context.succeed({token: jwt.create(data.id)});
        }
    };

    if (operation === 'login') {
        cognito.login(payload.email, payload.password, payload.reset, tokenCallback);
    }
    else if (operation === 'signup') {
        cognito.signup(payload.name, payload.email, payload.password,
            tokenCallback);
    }
    else if (operation === 'me') {
        ensureAuthenticated(function (userId) {
            cognito.getProfile(userId, dataCallback);
        });
    }
    else if (operation === 'credentials') {
        ensureAuthenticated(function (userId) {
            cognito.getCredentials(userId, dataCallback);
        });
    }
    else if (operation === 'forgot') {
        cognito.forgotPassword(payload.email, dataCallback);
    }
    else if (operation === 'update') {
        ensureAuthenticated(function (userId) {
            cognito.updatePassword(userId, payload.password, dataCallback);
        });
    }
    else if (operation === 'unlink') {
        ensureAuthenticated(function (userId) {
            cognito.unlink(userId, payload.provider, null, dataCallback);
        });
    }
    else {
        var provider = operation;
        var userId = jwt.verify(event.authorization, true);
        console.log('provider', provider);
        console.log('userId', userId);
        cognito.loginFederated(provider,
            payload.code, payload.clientId, payload.redirectUri, userId,
            tokenCallback);
    }
};
