require('dotenv').load();
var sha256 = require('js-sha256').sha256;
var _ = require('lodash');
var async = require('async');
var randomstring = require('randomstring');
var format = require('string-format');
format.extend(String.prototype);
var request = require('request');
var logger = require('log4js').getLogger('CognitoHelper');
var AWS = require('aws-sdk');

/**
 * Wrapper for Amazon Cognito library with methods common for a web
 * or mobile app, like authenticating with email and password, signup,
 * federated login, link accounts, reset password etc.
 * @class
 * @param {Object} config - default config settings can be loaded from config.js
 */
function CognitoHelper(config) {

  var CognitoHelper = this;

  if(!AWS.config.region)
    AWS.config.region = 'us-east-1';

  var cognitoIdentity = new AWS.CognitoIdentity();

  var cognitoSync = new AWS.CognitoSync();

  var encryptPassword = function (password) {
    return sha256(password);
  };

  var getRefreshTokenKey = function (provider) {
    return 'refresh' + provider;
  };

  var getProfileKey = function (provider) {
    return 'profile' + provider;
  };

  var normalizeProvider = function (providerName, token) {
    return {
      name: config.COGNITO_DEVELOPER_PROVIDER_NAME,
      isDeveloper: true,
      token: token
    };
  };

  /**
   * Retrieves records from a CognitoSync profile dataset.
   * @param {String} identityId - CognitoIdentity ID
   * @param {Array} keys - only records whose names start with these keys
   * @param callback - function(err, data)
   */
  CognitoHelper.getRecords = function (identityId, keys, callback) {
    var params = {
      IdentityPoolId: config.COGNITO_IDENTITY_POOL_ID,
      IdentityId: identityId,
      DatasetName: config.COGNITO_DATASET_NAME
    };
    logger.debug('CUSTOM listRecords', params);

    cognitoSync.listRecords(params, function (err, dataRecords) {
      if (err) {
        callback(err);
      }
      else {
        var ret = {};

        _.each(keys, function (key) {
          var records = _.filter(dataRecords.Records, function (r) {
            return _.startsWith(r.Key, key);
          });

          _.each(records, function (record) {
            ret[record.Key] = record.Value;
          });

        });

        callback(null, ret);
      }
    });
  };

  /**
   * Updates record in a user's profile with CognitoSync.
   * @param {String} identityId - CognitoIdentity ID
   * @param {Object} dataCreate - map of the records to create
   * @param {Object} dataReplace - map of the records to replace
   * @param {Object} dataRemove - map of the records to remove
   * @param callback - function(err, data)
   */
  CognitoHelper.updateRecords = function (identityId,
                      dataCreate, dataReplace, dataRemove,
                      callback) {
    var params = {
      IdentityPoolId: config.COGNITO_IDENTITY_POOL_ID,
      IdentityId: identityId,
      DatasetName: config.COGNITO_DATASET_NAME
    };
    logger.debug('CUSTOM listRecords', params);

    cognitoSync.listRecords(params, function (err, dataRecords) {
      if (err) {
        callback({code: 404, error: err});
      }
      else {
        var recordPatches = [];
        var key;
        var record;

        for (key in dataCreate) {
          record = _.find(dataRecords.Records, function (r) {
            return r.Key === key;
          });
          if (!record) {
            recordPatches.push({
              Op: 'replace',
              SyncCount: 0,
              Key: key,
              Value: dataCreate[key]
            });
          }
        }

        for (key in dataReplace) {
          record = _.find(dataRecords.Records, function (r) {
            return r.Key === key;
          });
          recordPatches.push({
            Op: 'replace',
            SyncCount: (record ? record.SyncCount : 0),
            Key: key,
            Value: dataReplace[key]
          });
        }

        for (key in dataRemove) {
          record = _.find(dataRecords.Records, function (r) {
            return r.Key === key;
          });
          if (record) {
            recordPatches.push({
              Op: 'remove',
              SyncCount: record.SyncCount,
              Key: key,
              /* Value:dataRemove[key]*/
            });
          }
        }

        params.SyncSessionToken = dataRecords.SyncSessionToken;
        params.RecordPatches = recordPatches;
        logger.debug('CUSTOM updateRecords', params);

        cognitoSync.updateRecords(params, function (err, data) {
          if (err) {
            logger.debug('CUSTOM updateRecords err', err);
          }
          // ignore err as may get ResourceConflictException
          // but still have updated successfully
          callback(null, true);
        });
      }
    });
  };

  var onLogin = function (provider, token, refreshToken, profile, name, vendor,
              identityId, callback) {
    // updateRecords
    var create = {};
    var replace = {};
    var remove = {};

    if (name)
      create.name = name;

    if (vendor)
      create.vendor = vendor;

    if (provider) {
      replace.provider = provider;
      replace.token = token;

      if (refreshToken)
        replace[getRefreshTokenKey(provider)] = refreshToken;

      if (profile)
        replace[getProfileKey(provider)] = JSON.stringify(profile);
    }
    else {
      replace.provider = null;
      replace.token = null;
    }

    CognitoHelper.updateRecords(identityId, create, replace, remove,
      function (err) {
        if (err) {
          callback(err);
        }
        else {
          callback(null, {id: identityId});
        }
      });
  };

  var getCredentialsForIdentity = function (params, callback) {
    logger.debug('CUSTOM getCredentialsForIdentity ', params);

    cognitoIdentity.getCredentialsForIdentity(params,
      function (err, dataCredentials) {
        if (err) {
          if (err.message === 'Invalid login token.') {
            // attempted to validate but provider token has expired,
            // need to use refresh token to get a new one
            logger.debug('CUSTOM needs refresh', err);

            CognitoHelper.refreshProvider(params.IdentityId,
              function (err, dataRefresh) {
                if (err) {
                  callback(err);
                }
                else {
                  params.Logins[_.keys(params.Logins)[0]] = dataRefresh.token;
                  getCredentialsForIdentity(params, callback);
                  //CognitoHelper.getCredentials(params.IdentityId, callback);
                }
              });
          }
          else {
            callback(err);
          }
        }
        else {
          callback(null, dataCredentials);
        }
      }
    );
  };


  /**
   * Creates a user in CognitoIdentity with an email as a developer identifier.
   * Stores user name and password in CognitoSync.
   * @param {String} name - user's name
   * @param {String} email - email uniquely identifies a user
   * @param {String} password
   * @param {String} vendor
   * @param callback - function(err, data)
   */
  CognitoHelper.signup = function (name, email, password, vendor, callback) {
    CognitoHelper.getId(null, email, function (err, dataId) {
      if (dataId) {
        callback({code: 409, error: 'An account already exists with ' + email});
      }
      else {
        createDeveloperIdentity(email, function (err, dataDeveloperIdentity) {
          if (err) {
            callback(err);
          }
          else {
            putPasswordCognitoSync(dataDeveloperIdentity.IdentityId, password,
              function (err, data) {
                if (err) {
                  callback(err);
                }
                else {
                  onLogin(null, email, null, null, name, vendor,
                    dataDeveloperIdentity.IdentityId, callback);
                }
              });
          }
        });
      }
    });
  };

  /**
   * Updates password record in a user's profile with CognitoSync.
   * @param {String} identityId - CognitoIdentity ID
   * @param {String} password - new password
   * @param callback - function(err, data)
   */
  CognitoHelper.updatePassword = function (identityId, password, callback) {
    putPasswordCognitoSync(identityId, password, callback);
  };

  var putPasswordCognitoSync = function (identityId, password, callback) {
    var p = encryptPassword(password);
    CognitoHelper.updateRecords(identityId, null, {password: p}, null, callback);
  };

  var checkPasswordCognitoSync = function (identityId, password, reset,
                       callback) {
    CognitoHelper.getRecords(identityId, ['password', 'reset'],
      function (err, data) {
        if (err)
          callback('cannot get password ' + err);
        else {
          var p;
          if (reset) {
            // verifying with reset
            p = encryptPassword(reset);
            if (!data.reset)
              callback('reset does not exist');
            else if (p !== data.reset) {
              callback('reset does not match');
            }
            else {
              CognitoHelper.updateRecords(identityId, null, null, {reset: reset},
                callback);
            }
          }
          else if (password) {
            // verifying with password
            p = encryptPassword(password);
            if (!data.password)
              callback('password does not exist');
            else if (p !== data.password)
              callback('password does not match');
            else
              callback(null, true);
          }
          else {
            callback('neither password nor reset');
          }
        }
      });
  };

  /**
   * Logs in with the user's email stored as a developer identifier in
   * CognitoIdentity and either a password or a reset token emailed in a
   * forgot password email.
   * @param {String} email - email uniquely identifies a user
   * @param {String} password - null if passing reset
   * @param {String} reset - random string emailed by forgotPassword;
   * null if passing password
   * @param callback - function(err, data)
   */
  CognitoHelper.login = function (email, password, reset, callback) {
    CognitoHelper.getId(null, email, function (err, dataId) {
      if (err || !dataId) {
        callback({code: 404, error: 'does not exist ' + email});
      }
      else {
        checkPasswordCognitoSync(dataId.IdentityId, password, reset,
          function (err, data) {
            if (err) {
              callback({code: 401, error: err});
            }
            else {
              onLogin(null, email, null, null, null, null, dataId.IdentityId, callback);
            }
          });
      }
    });
  };

   var createDeveloperIdentity = function (token, callback) {
    var p = normalizeProvider(null, token);

    var logins = {};
    logins[p.name] = p.token;

    var params = {
      IdentityPoolId: config.COGNITO_IDENTITY_POOL_ID,
      Logins: logins,
      //TokenDuration: 60
    };
    logger.debug('CUSTOM getOpenIdTokenForDeveloperIdentity', params);

    cognitoIdentity.getOpenIdTokenForDeveloperIdentity(params, callback);
  };

  /**
   * Retrieves CognitoIdenity ID given either a federated provider token
   * or user email.
   * @param {String} provider - name of a federated login provider like google,
   * amazon, facebook, twitter, stripe, paypal; or null for email as token
   * @param {String} token - access token gotten from provider thru oauth
   * or user's email
   * @param callback - function(err, data)
   */
  CognitoHelper.getId = function (provider, token, callback) {
    var p = normalizeProvider(provider, token);
    var params;

    if (p.isDeveloper) {
      params = {
        IdentityPoolId: config.COGNITO_IDENTITY_POOL_ID,
        DeveloperUserIdentifier: p.token,
        MaxResults: 10
      };
      logger.debug('CUSTOM lookupDeveloperIdentity', params);

      cognitoIdentity.lookupDeveloperIdentity(params, callback);
    }
    else {
      var logins = {};
      logins[p.name] = p.token;

      params = {
        IdentityPoolId: config.COGNITO_IDENTITY_POOL_ID,
        AccountId: config.AWS_ACCOUNT_ID,
        Logins: logins
      };
      logger.debug('CUSTOM getId', params);

      cognitoIdentity.getId(params, callback);
    }
  };

  /**
   * Retrieves records from a CognitoSync profile dataset.
   * @param {String} identityId - CognitoIdentity ID
   * @param {Array} keys - only records whose names start with these keys
   * @param callback - function(err, data)
   */
  CognitoHelper.getRecords = function(identityId, keys, callback) {
    var params = {
      IdentityPoolId: config.COGNITO_IDENTITY_POOL_ID,
      IdentityId: identityId,
      DatasetName: config.COGNITO_DATASET_NAME
    };
    logger.debug('CUSTOM listRecords', params);

    cognitoSync.listRecords(params, function(err, dataRecords) {
      if(err) {
        callback(err);
      }
      else {
        var ret = {};

        _.each(keys, function(key) {
          var records = _.filter(dataRecords.Records, function(r) {
            return _.startsWith(r.Key, key);
          });

          _.each(records, function(record) {
            ret[record.Key] = record.Value;
          });

        });

        callback(null, ret);
      }
    });
  };

  /**
   * Retrieves all developer (non federated) identifiers like user emails or
   * ids with federated providers not integrated with AWS like PayPal or Stripe.
   * @param {String} identityId - CognitoIdentity ID
   * @param callback - function(err, data)
   */
  CognitoHelper.getDeveloperTokens = function(identityId, callback) {
    var params = {
      IdentityPoolId: config.COGNITO_IDENTITY_POOL_ID,
      IdentityId: identityId,
      MaxResults: 10};
    logger.debug('CUSTOM lookupDeveloperIdentity', params);

    cognitoIdentity.lookupDeveloperIdentity(params, function(err, data) {
      if(err) {
        callback([]);
      }
      else {
        callback(data.DeveloperUserIdentifierList);
      }
    });
  };

  /**
   * Retrieves from CognitoIdenity a list of federated providers which the user
   * has logins with. Use to display a list of linked logins in a
   * user's profile.
   * @param {String} identityId - CognitoIdentity ID
   * @param finalCallback - function(err, data)
   */
  CognitoHelper.describe = function(identityId, finalCallback) {
    async.parallel({
        describeIdentity: function(callback) {
          var params = {IdentityId:identityId};
          logger.debug('CUSTOM describeIdentity', params);

          cognitoIdentity.describeIdentity(params, function(err, data) {
            if(err) {
              callback(err);
            }
            else {
              var u = {};
              u.id = data.IdentityId;

              _.each(data.Logins, function(p) {
                if(p === 'accounts.google.com')
                  u.google = true;
                else if(p === 'graph.facebook.com')
                  u.facebook = true;
                else if(p === 'www.amazon.com')
                  u.amazon = true;
                else if(p === 'api.twitter.com')
                  u.twitter = true;
              });

              callback(null, u);
            }
          });
        },
        getDeveloperTokens: function(callback) {
          CognitoHelper.getDeveloperTokens(identityId, function(developerTokens) {
            var u = {};

            _.each(developerTokens, function(t) {
              var d = t.substring(0, t.indexOf(config.COGNITO_SEPARATOR));
              if(d)
                u[d] = true;
              else
                u.email = t;
            });

            callback(null, u);
          });
        }
      }
      , function(err, results) {
        if(err)
          finalCallback(err);
        else
          finalCallback(null,
            _.merge(results.describeIdentity, results.getDeveloperTokens));
      });
  };

  CognitoHelper.getProfile = function(identityId, finalCallback) {
    async.parallel({
        describe: function(callback) {
          CognitoHelper.describe(identityId, callback);
        },
        getRecords: function(callback) {
          CognitoHelper.getRecords(identityId,
            ['name','provider','profile','password','vendor','isApproved'],
            function(err, data) {
              if(err) {
                callback(err);
              }
              else {
                var user = {};

                user.name = data.name;
                user.provider = data.provider;
                user.vendor = data.vendor;
                user.isApproved = data.isApproved;

                for(var a in data) {
                  if(_.startsWith(a, 'profile'))
                    user[a] = data[a];
                }

                user.password = data.password ? true : false;

                callback(null, user);
              }
            });
        }
      },
      function(err, results) {
        if(err) {
          finalCallback(err);
        }
        else {
          var user = _.merge(results.describe, results.getRecords);

          user.name = user.name || user.email || user.id;

          // for compatibility with satellizer
          user.displayName = user.name;

          finalCallback(null, user);
        }
      });
  };

}

module.exports = CognitoHelper;
