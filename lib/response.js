var jwt = require('./jwt');


var response = module.exports;

response.makeError = function (err) {
  if (err) {
    if (typeof err == 'string') {
      err = Error(err);
    }

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
  }
};

response.tokenCallback = function (err, data) {
  if (err) {
    callback(makeError(err));
  }
  else {
    callback(null, {token: jwt.create(data.id)});
  }
};

response.dataCallback = function (err, data) {
  if (err) {
    callback(makeError(err));
  }
  else {
    callback(null, data);
  }
};