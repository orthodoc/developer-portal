var moment = require('moment');
var jwtSimple = require('jwt-simple');

var jwt = module.exports;

jwt.authenticate = function(token, callback) {
  var t = jwt.verify(token);
  if(t.message) {
    callback(new Error('Auth token error: ' + t.message));
  }
  else {
    callback(null, t);
  }
};

jwt.create = function createJWT(userId, expiresIn) {
  var exp;
  if (process.env.EXPIRES_IN) {
    exp = moment().add(process.env.EXPIRES_IN, 'seconds');
  }
  else if (expiresIn) {
    exp = moment().add(expiresIn, 'seconds');
  }
  else {
    exp = moment().add(14, 'days');
  }

  var payload = {
    sub: userId,
    iat: moment().unix(),
    exp: exp.unix()
  };

  return jwtSimple.encode(payload, process.env.JWT_SECRET);
};

jwt.verify = function verifyJWT(authorization, dontFail) {
  if (!authorization) {
    if (dontFail) {
      return null;
    }
    else {
      return {code: 401, message: 'Missing Authorization header'};
    }
  }
  var token = authorization.split(' ')[1];
  try {
    var payload = jwtSimple.decode(token, process.env.JWT_SECRET);
  } catch (e) {
    return {code: 401, message: e.message};
  }
  var now = moment().unix();

  if (payload.exp <= now - 60) {
    if (dontFail) {
      return null;
    }
    else {
      return {code: 401, message: 'Token has expired'};
    }
  }
  return payload.sub;
};