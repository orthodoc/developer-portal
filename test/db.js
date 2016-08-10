'use strict';

require('dotenv').config();
var expect = require('chai').expect;

var execsql = require('../lib/execsql');
var async = require('async');
var mysql = require('mysql');
var db = require('../lib/db');
var rds;

describe('db', function() {
  before(function(done) {
    rds = mysql.createConnection({
      host: process.env.RDS_HOST,
      user: process.env.RDS_USER,
      password: process.env.RDS_PASSWORD,
      database: process.env.RDS_DATABASE,
      ssl: 'Amazon RDS',
      multipleStatements: true
    });
    execsql.execFile(rds, __dirname + '/../rds-model.sql', function(err, res) {
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
    it('app does not exists', function(done) {
      var appId = 'ex-adwords';

      db.connect();
      db.checkAppNotExists(appId, function(err) {
        expect(err).to.be.undefined;
        done();
      })
    });

    it('app exists', function() {
      execsql.exec(rds, 'INSERT INTO `vendors` SET id="keboola";INSERT INTO `apps` SET id="ex-adwords", vendor_id="keboola";', function(err, res) {
        if (err) throw err;

        db.connect();
        db.checkAppNotExists('ex-adwords', function(err) {
          expect(err).to.be.null;
          done();
        })
      });
    });
  });
});
