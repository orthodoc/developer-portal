'use strict';
require('dotenv').config();

var async = require('async');
var db = require('../../vendor/db');
var execsql = require('../../execsql');
var expect = require('chai').expect;
var mysql = require('mysql');
var rds;

describe('db', function() {
  before(function(done) {
    rds = mysql.createConnection({
      host: process.env.RDS_HOST,
      user: process.env.RDS_USER,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DATABASE,
      ssl: process.env.RDS_SSL ? 'Amazon RDS' : false,
      multipleStatements: true
    });
    execsql.execFile(rds, __dirname + '/../../rds-model.sql', function(err) {
      if (err) throw err;
      done();
    });
  });

  describe('init', function() {
    it('db not connected', function(done) {
      expect(db.db()).to.be.undefined;
      done();
    });

    it('db is connected', function(done) {
      db.connect();
      expect(db.db()).to.be.a('object');
      done();
    });

    it('db is disconnected', function(done) {
      db.connect();
      db.db().query('SELECT 1', function(err) {
        if (err) throw err;

        expect(db.db().state).to.equal('authenticated');
        db.end();
        expect(db.db().state).to.equal('disconnected');
        done();
      });
    });
  });

  describe('checkAppNotExists', function() {
    it('app does not exist', function(done) {
      var appId = 'ex-' + Math.random();

      db.connect();
      db.checkAppNotExists(appId, function(err) {
        expect(err).to.be.undefined;
        done();
      })
    });

    it('app exists', function (done) {
      var appId = 'ex-' + Math.random();
      execsql.exec(
        rds,
        'INSERT INTO `vendors` SET id="keboola", name="test", address="test", email="test";'
        + 'INSERT INTO `apps` SET id="' + appId + '", vendor_id="keboola", name="test", type="reader";',
        function (err) {
          if (err) throw err;

          db.connect();
          expect(function () {
            db.checkAppNotExists(appId, function () {
            });
          }).to.throw(function () {
            done();
          });
        });
    });
  });

  describe('insertApp', function() {
    it('insert new app', function(done) {
      var appId = 'ex-' + Math.random();
      var vendor = 'v' + Math.random();

      rds.query('INSERT INTO `vendors` SET id=?, name="test", address="test", email="test";', vendor, function() {
        db.connect();
        db.insertApp({id: appId, vendor_id: vendor, name: 'test', type: 'reader'}, function() {
          rds.query('SELECT * FROM `apps` WHERE id=?', appId, function (err, res) {
            expect(res).to.have.length(1);
            done();
          });
        });
      });
    });

    it('insert already existing app', function(done) {
      var appId = 'ex-' + Math.random();
      var vendor = 'v' + Math.random();

      rds.query('INSERT INTO `vendors` SET id=?, name="test", address="test", email="test";', vendor, function() {
        rds.query('INSERT INTO `apps` SET id=?, vendor_id=?, name="test", type="reader";', [appId, vendor], function() {
          db.connect();
          db.insertApp({id: appId, vendor_id: vendor, name: 'test', type: 'reader'}, function() {
            expect(function() {
              rds.query('SELECT * FROM `apps` WHERE id=?', appId, function() {});
            }).to.throw(function() {
              done();
            });
          })
        })
      });
    });
  });

  describe('updateApp', function() {
    it('update existing app', function(done) {
      var appId = 'ex-' + Math.random();
      var vendor = 'v' + Math.random();

      rds.query('INSERT INTO `vendors` SET id=?, name="test", address="test", email="test";', vendor, function(err) {
        if (err) throw err;
        rds.query('INSERT INTO `apps` SET id=?, vendor_id=?, name="test", type="reader";', [appId, vendor], function(err) {
          if (err) throw err;
          db.connect();
          db.updateApp({name: 'New name'}, appId, function() {
            rds.query('SELECT * FROM `apps` WHERE id=?', appId, function(err, res) {
              if (err) throw err;
              expect(res).to.have.length(1);
              expect(res[0].name).to.equal('New name');
              done();
            });
          })
        })
      });
    });
  });

  describe('getApp', function() {
    it('get non-existing app', function(done) {
      var appId = 'ex-' + Math.random();

      db.connect();
      db.getApp(appId, function(err) {
        expect(err).to.not.be.null;
        done();
      });
    });

    it('get existing app', function(done) {
      var appId = 'ex-' + Math.random();
      var vendor = 'v' + Math.random();

      rds.query('INSERT INTO `vendors` SET id=?, name="test", address="test", email="test";', vendor, function(err) {
        if (err) throw err;
        rds.query('INSERT INTO `apps` SET id=?, vendor_id=?, name="test", type="reader";', [appId, vendor], function(err) {
          if (err) throw err;
          db.connect();
          db.getApp(appId, function(err, res) {
            expect(err).to.be.null;
            expect(res).to.have.property('id');
            expect(res.id).to.be.equal(appId);
            done();
          })
        })
      });
    });
  });

  describe('checkAppVersionNotExists', function() {
    it('version does not exist', function(done) {
      var appId = 'ex-' + Math.random();
      var vendor = 'v' + Math.random();
      var version = 'v' + Math.random();

      rds.query('INSERT INTO `vendors` SET id=?, name="test", address="test", email="test";', vendor, function(err) {
        if (err) throw err;
        rds.query('INSERT INTO `apps` SET id=?, vendor_id=?, name="test", type="reader";', [appId, vendor], function(err) {
          if (err) throw err;
          db.connect();
          db.checkAppVersionNotExists(appId, version, function(err) {
            expect(err).to.be.undefined;
            done();
          })
        })
      });
    });

    it('version does exist', function(done) {
      var appId = 'ex-' + Math.random();
      var vendor = 'v' + Math.random();
      var version = 'v' + Math.random();

      rds.query('INSERT INTO `vendors` SET id=?, name="test", address="test", email="test";', vendor, function(err) {
        if (err) throw err;
        rds.query('INSERT INTO `apps` SET id=?, vendor_id=?, name="test", type="reader";', [appId, vendor], function(err) {
          if (err) throw err;
          rds.query('INSERT INTO `app_versions` SET app_id=?, version=?, name="test", type="reader";', [appId, version], function(err) {
            if (err) throw err;
            db.connect();
            db.checkAppVersionNotExists(appId, version, function(err) {
              expect(err).to.not.be.undefined;
              done();
            });
          });
        });
      });
    });
  });

  describe('insertAppVersion', function() {
    it('insert new version', function(done) {
      var appId = 'ex-' + Math.random();
      var vendor = 'v' + Math.random();
      var version = 'v' + Math.random();

      rds.query('INSERT INTO `vendors` SET id=?, name="test", address="test", email="test";', vendor, function(err) {
        if (err) throw err;
        rds.query('INSERT INTO `apps` SET id=?, vendor_id=?, name="test", type="reader";', [appId, vendor], function(err) {
          if (err) throw err;
          db.connect();
          db.insertAppVersion({app_id: appId, version: version, name: 'test', type: 'reader'}, function(err) {
            expect(err).to.be.null;
            rds.query('SELECT * FROM `app_versions` WHERE app_id=? AND version=?', [appId, version], function(err, res) {
              if (err) throw err;
              expect(res).to.have.length(1);
              done();
            });
          });
        });
      });
    });
  });

  describe('listAppsForVendor', function() {
    it('list', function(done) {
      var appId = 'ex-' + Math.random();
      var vendor = 'v' + Math.random();
      var vendor2 = 'v' + Math.random();

      rds.query('INSERT INTO `vendors` SET id=?, name="test", address="test", email="test";', vendor, function(err) {
        if (err) throw err;
        rds.query('INSERT INTO `apps` SET id=?, vendor_id=?, name="test", type="reader";', [appId, vendor], function(err) {
          if (err) throw err;
          rds.query('INSERT INTO `vendors` SET id=?, name="test", address="test", email="test";', vendor2, function(err) {
            if (err) throw err;
            rds.query('INSERT INTO `apps` SET id=?, vendor_id=?, name="test", type="reader";', ['ex-' + Math.random(), vendor2], function(err) {
              if (err) throw err;
              db.connect();
              db.listAppsForVendor(vendor, function(err, res) {
                expect(err).to.be.null;
                expect(res).to.have.length(1);
                expect(res[0].id).to.be.equal(appId);
                done();
              });
            });
          });
        });
      });
    });
  });
});
