var fs = require('fs');
var _ = require('underscore');

function exec(conn, sql, callback) {
  conn.query(sql, function (err, results) {
    if (!_.isArray(results)) {
      results = [results];
    }
    callback(err, results);
  });
  return this;
}

function execFile(conn, filename, callback) {
  fs.readFile(filename, 'utf8', function (err, data) {
    if (err) throw err;
    exec(conn, data, callback);
  });
  return this;
}

exports.exec = exec;
exports.execFile = execFile;

