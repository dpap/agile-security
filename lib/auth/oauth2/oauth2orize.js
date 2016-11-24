/*

MIT License

Copyright (c) 2016 Gerges Beshay, nopbyte

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
/**
 * Module dependencies.
 */
var oauth2orize = require('oauth2orize');
var passport = require('passport');
var login = require('connect-ensure-login');
var utils = require('../../util/tokens');

var server, db;
var default_exp = 1200;

function init(tokenconf, entityStorageConf) {
  server = oauth2orize.createServer();
  db = require('../../db')(tokenconf, entityStorageConf);

  // Register supported grant types.
  //
  // OAuth 2.0 specifies a framework that allows users to grant client
  // applications limited access to their protected resources.  It does this
  // through a process of the user granting access, and the client exchanging
  // the grant for an access token.

  // Grant authorization codes.  The callback takes the `client` requesting
  // authorization, the `redirectURI` (which is used as a verifier in the
  // subsequent exchange), the authenticated `user` granting access, and
  // their response, which contains approved scope, duration, etc. as parsed by
  // the application.  The application issues a code, which is bound to these
  // values, and will be exchanged for an access token.

  server.grant(oauth2orize.grant.code(function (client, redirectURI, user, ares, done) {
    var code = utils.uid(16);
    var token = utils.uid(256);
    //TODO fix this
    var authType = 'local';
    db.authorizationCodes.save(code, client.id, redirectURI, user.id, authType, token, function (err) {
      if (err) {
        return done(err);
      }
      done(null, code);
    });
  }));

  // Grant implicit authorization.  The callback takes the `client` requesting
  // authorization, the authenticated `user` granting access, and
  // their response, which contains approved scope, duration, etc. as parsed by
  // the application.  The application issues a token, which is bound to these
  // values.

  server.grant(oauth2orize.grant.token(function (client, user, ares, done) {
    var token = utils.uid(256);
    db.accessTokens.save(token, user.id, client.id, "bearer", "local", [], default_exp, function (err) {
      if (err) {
        return done(err);
      }
      done(null, token);
    });
  }));

  // Exchange authorization codes for access tokens.  The callback accepts the
  // `client`, which is exchanging `code` and any `redirectURI` from the
  // authorization request for verification.  If these values are validated, the
  // application issues an access token on behalf of the user who authorized the
  // code.

  server.exchange(oauth2orize.exchange.code(function (client, code, redirectURI, done) {
    db.authorizationCodes.find(code, function (err, authCode) {
      if (err) {
        return done(err);
      }
      if (client.id !== authCode.clientID) {
        return done(null, false);
      }
      if (redirectURI !== authCode.redirectURI) {
        return done(null, false);
      }

      var token = authCode.token;
      db.accessTokens.save(token, authCode.userID, authCode.clientID, "bearer", authCode.authType, [], default_exp, function (err) {
        if (err) {
          return done(err);
        }
        db.authorizationCodes.delete(code, function () {
          done(null, token);
        });

      });
    });
  }));

  // Exchange user id and password for access tokens.  The callback accepts the
  // `client`, which is exchanging the user's name and password from the
  // authorization request for verification. If these values are validated, the
  // application issues an access token on behalf of the user who authorized the code.
  /*
  server.exchange(oauth2orize.exchange.password(function(client, username, password, scope, done) {
      console.log('                calling exchange ');
      console.log('                client '+JSON.stringify(client));
      console.log('                username '+JSON.stringify(username));
      console.log('                password '+JSON.stringify(password));
      console.log('                scope '+JSON.stringify(scope));
      console.log('');
      console.log('');
      console.log('');
  console.log('');

      //Validate the client
      db.clients.findByClientId(client.id, function(err, localClient) {
          if (err) { return done(err); }
          if(localClient === null) {
              return done(null, false);
          }
          if(localClient.clientSecret !== client.clientSecret) {
              return done(null, false);
          }
          //Validate the user
          //TODO fix this!!!!
          db.users.findByUsernameAndAuthType(username,'local', function(err, user) {
              if (err) { return done(err); }
              if(user === null) {
                  return done(null, false);
              }
              if(password !== user.password) {
                  return done(null, false);
              }
              //Everything validated, return the token
              var token = utils.uid(256);
              db.accessTokens.save(token, user.id, client.id, function(err) {
                  if (err) { return done(err); }
                  done(null, token);
              });
          });
      });
  }));

  // Exchange the client id and password/secret for an access token.  The callback accepts the
  // `client`, which is exchanging the client's id and password/secret from the
  // authorization request for verification. If these values are validated, the
  // application issues an access token on behalf of the client who authorized the code.

  server.exchange(oauth2orize.exchange.clientCredentials(function(client, scope, done) {

      //Validate the client
      db.clients.findByClientId(client.id, function(err, localClient) {
          if (err) { return done(err); }
          if(localClient === null) {
              return done(null, false);
          }
          if(localClient.clientSecret !== client.clientSecret) {
              return done(null, false);
          }
          var token = utils.uid(256);
          //Pass in a null for user id since there is no user with this grant type
          db.accessTokens.save(token, null, client.id, "bearer", "local-client", [], default_exp, function(err) {
              if (err) { return done(err); }
              done(null, token);
          });
      });
  }));
  */

}

var exportServer = function (tokenconf, entityStorageConf) {
  if (server)
    return server;
  else {
    init(tokenconf, entityStorageConf);
    return server;
  }
}

module.exports = exportServer;