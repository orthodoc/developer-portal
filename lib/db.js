'use strict';

var mysql = require('mysql');

var db = mysql.createPool({
  host: process.env.RDS_HOST,
  user: process.env.RDS_USER,
  password: process.env.RDS_PASSWORD,
  database: process.env.RDS_DATABASE,
  ssl: "Amazon RDS"
});

module.exports = {

  db: db,

  end: function () {
    db.end();
  },

  checkAppNotExists: function (id, callback) {
    db.query('SELECT * FROM `apps` WHERE `id` = ?', [id], function (err, result) {
      if (err) return callback(err);

      if (result.length != 0) {
        return callback(Error('App ' + id + ' already exists'));
      }

      return callback();
    });
  },

  insert: function (table, params, callback) {
    db.query('INSERT INTO ' + db.escapeId(table) + ' SET ?', params, function (err) {
      if (err) return callback(err);

      return callback();
    });
  },

  update: function (table, params, id, callback) {
    db.query('UPDATE ' + db.escapeId(table) + ' SET ? WHERE id=?', [params, id], function (err) {
      if (err) return callback(err);

      return callback();
    });
  },

  getApp: function (id, callback) {
    db.query('SELECT * FROM `apps` WHERE `id` = ?', [id], function (err, result) {
      if (err) return callback(err);

      delete result[0].user_id;
      result[0].encryption = result[0].encryption == 1;
      result[0].default_bucket = result[0].default_bucket == 1;
      result[0].forward_token = result[0].forward_token == 1;
      result[0].ui_options = result[0].ui_options ? result[0].ui_options : [];
      result[0].actions = result[0].actions ? result[0].actions : [];
      result[0].fees = result[0].fees == 1;
      result[0].is_approved = result[0].is_approved == 1;

      return callback(null, result[0]);
    });
  },

  getVendor: function (id, callback) {
    db.query('SELECT * FROM `vendors` WHERE `id` = ?', [id], function (err, result) {
      if (err) return callback(err);

      if (result.length == 0) {
        return callback(Error('Vendor ' + id + ' does not exist'));
      }

      callback(null, result[0]);
    });
  }
};