'use strict';

var mysql = require('mysql');
var db;

var formatAppOutput = function(app) {
  delete app.user_id;
  delete app.user_email;
  if (app.vendor_id || app.vendor_name || app.vendor_address || app.vendor_email) {
    app.vendor = {};
  }
  if (app.vendor_id) {
    app.vendor.id = app.vendor_id;
    delete app.vendor_id;
  }
  if (app.vendor_name) {
    app.vendor.name = app.vendor_name;
    delete app.vendor_name;
  }
  if (app.vendor_address) {
    app.vendor.address = app.vendor_address;
    delete app.vendor_address;
  }
  if (app.vendor_email) {
    app.vendor.email = app.vendor_email;
    delete app.vendor_email;
  }
  app.encryption = app.encryption === 1;
  app.default_bucket = app.default_bucket === 1;
  app.forward_token = app.forward_token === 1;
  app.ui_options = app.ui_options ? (typeof app.ui_options === 'string'
    ? JSON.parse(app.ui_options) : app.ui_options) : [];
  app.test_configuration = app.test_configuration ? (typeof app.test_configuration === 'string'
    ? JSON.parse(app.test_configuration) : app.test_configuration) : [];
  app.configuration_schema = app.configuration_schema ? (typeof app.configuration_schema === 'string'
    ? JSON.parse(app.configuration_schema) : app.configuration_schema) : [];
  app.actions = app.actions ? (typeof app.actions === 'string' ? JSON.parse(app.actions) : app.ui_options) : [];
  app.fees = app.fees === 1;
  app.is_approved = app.is_approved === 1;
  return app;
};

var formatAppInput = function(app) {
  if (app.ui_options) app.ui_options = JSON.stringify(app.ui_options);
  if (app.test_configuration) app.test_configuration = JSON.stringify(app.test_configuration);
  if (app.configuration_schema) app.configuration_schema = JSON.stringify(app.configuration_schema);
  if (app.actions) app.actions = JSON.stringify(app.actions);
  return app;
};

module.exports = {

  db: function() {
    return db;
  },

  connect: function(host, user, pass, dbname) {
    db = mysql.createConnection({
      host: host ? host : process.env.RDS_HOST,
      user: user ? user : process.env.RDS_USER,
      password: pass ? pass : process.env.RDS_PASSWORD,
      database: dbname ? dbname : process.env.RDS_DATABASE,
      ssl: process.env.RDS_SSL ? 'Amazon RDS' : false
    });
  },

  end: function() {
    db.destroy();
  },

  checkAppNotExists: function(id, callback) {
    db.query('SELECT * FROM `apps` WHERE `id` = ?', [id], function(err, result) {
      if (err) return callback(err);

      if (result.length !== 0) {
        return callback(Error('App ' + id + ' already exists'));
      }

      return callback();
    });
  },

  insertApp: function(params, callback) {
    db.query('INSERT INTO `apps` SET ?', formatAppInput(params), function(err) {
      return callback(err);
    });
  },

  updateApp: function(params, id, callback) {
    db.query('UPDATE `apps` SET ? WHERE id = ?', [formatAppInput(params), id], function(err) {
      return callback(err);
    });
  },

  getApp: function(id, callback) {
    db.query('SELECT * FROM `apps` WHERE `id` = ?', [id], function(err, result) {
      if (err) return callback(err);

      if (result.length === 0) {
        return callback(Error('App ' + id + ' does not exist'));
      }

      return callback(null, formatAppOutput(result[0]));
    });
  },


  checkAppVersionNotExists: function(id, version, callback) {
    db.query('SELECT * FROM `app_versions` WHERE `app_id` = ? AND `version` = ?', [id, version], function(err, result) {
      if (err) return callback(err);

      if (result.length !== 0) {
        return callback(Error('Version ' + version + ' of app ' + id + ' already exists'));
      }

      return callback();
    });
  },

  insertAppVersion: function(params, callback) {
    db.query('INSERT INTO `app_versions` SET ?', formatAppInput(params), function(err) {
      return callback(err);
    });
  },

  getVendorApp: function(id, callback) {
    db.query('SELECT a.id, a.name, a.vendor_id, v.name as vendor_name, v.address as vendor_address, '
      + 'v.email as vendor_email, a.current_version, a.type, a.image_url, a.image_tag, a.short_description,'
      + 'a.long_description, a.license_url, a.documentation_url, a.required_memory, a.process_timeout,'
      + 'a.encryption, a.default_bucket, a.default_bucket_stage, a.forward_token, a.ui_options,'
      + 'a.test_configuration, a.configuration_schema, a.networking, a.actions, a.fees, a.limits, a.logger,'
      + 'a.is_approved FROM `apps` AS `a` '
      + 'LEFT JOIN `vendors` v ON (`a`.`vendor_id` = `v`.`id`)'
      + 'WHERE `a`.`id` = ?;', id, function(err, result) {
      if (err) return callback(err);
      if (result.length === 0) {
        return callback(Error('App ' + id + ' does not exist or was not published yet'));
      }
      return callback(err, formatAppOutput(result[0]));
    });
  },

  listAllVendorApps: function(vendor, callback) {
    db.query('SELECT a.id, a.vendor_id, a.name, a.current_version, a.type, a.short_description '
      + 'FROM `apps` AS `a` '
      + 'WHERE `a`.`vendor_id`=?;', vendor, function(err, result) {
      if (err) return callback(err);
      return callback(err, result);
    });
  }
};