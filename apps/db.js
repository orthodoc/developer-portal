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

  getPublishedApp: function(id, callback) {
    db.query('SELECT a.id, av.name, a.vendor_id, v.name as vendor_name, v.address as vendor_address, '
      + 'v.email as vendor_email, a.current_version, av.type, av.image_url, av.image_tag, av.short_description,'
      + 'av.long_description, av.license_url, av.documentation_url, av.required_memory, av.process_timeout,'
      + 'av.encryption, av.default_bucket, av.default_bucket_stage, av.forward_token, av.ui_options,'
      + 'av.test_configuration, av.configuration_schema, av.networking, av.actions, av.fees, av.limits, av.logger,'
      + 'a.is_approved FROM `apps` AS `a` LEFT JOIN `app_versions` `av` ON (`a`.`current_version` = `av`.`version`) '
      + 'LEFT JOIN `vendors` v ON (`a`.`vendor_id` = `v`.`id`)'
      + 'WHERE `a`.`id` = ?;', id, function(err, result) {
        if (err) return callback(err);
        if (result.length === 0) {
          return callback(Error('App ' + id + ' does not exist or was not published yet'));
        }
        return callback(err, formatAppOutput(result[0]));
      });
  },

  listAllPublishedApps: function(callback) {
    db.query('SELECT a.id, a.vendor_id, av.name, a.current_version, av.type, av.short_description '
      + 'FROM `apps` AS `a` LEFT JOIN `app_versions` `av` ON (`a`.`id` = `av`.`app_id` AND `a`.`current_version` = `av`.`version`)'
      + 'WHERE `a`.`is_approved` = 1 AND `a`.`current_version` IS NOT NULL;', function(err, result) {
      if (err) return callback(err);
      return callback(err, result);
    });
  }
};