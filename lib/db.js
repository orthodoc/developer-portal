'use strict';

var mysql = require('mysql');
var db;

var formatApp = function(app) {
  delete app.user_id;
  app.encryption = app.encryption == 1;
  app.default_bucket = app.default_bucket == 1;
  app.forward_token = app.forward_token == 1;
  app.ui_options = app.ui_options ? (typeof app.ui_options == 'string' ? JSON.parse(app.ui_options) : app.ui_options) : [];
  app.actions = app.actions ? (typeof app.actions == 'string' ? JSON.parse(app.actions) : app.ui_options) : [];
  app.fees = app.fees == 1;
  app.is_approved = app.is_approved == 1;
  return app;
};

module.exports = {

  db: db,

  connect: function() {
    db = mysql.createConnection({
      host: process.env.RDS_HOST,
      user: process.env.RDS_USER,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DATABASE,
      ssl: "Amazon RDS"
    });
  },

  end: function () {
    db.destroy();
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

      return callback(null, formatApp(result[0]));
    });
  },

  listApps: function(callback) {
    db.query('SELECT * FROM `apps` WHERE `is_approved` = 1', function(err, result) {
      if (err) return callback(err);
      return callback(err, result.map(formatApp));
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