var request = require('request');
var db = require('../app/config');
var crypto = require('crypto');

exports.getUrlTitle = function(url, cb) {
  request(url, function(err, res, html) {
    if (err) {
      console.log('Error reading url heading: ', err);
      return cb(err);
    } else {
      var tag = /<title>(.*)<\/title>/;
      var match = html.match(tag);
      var title = match ? match[1] : url;
      return cb(err, title);
    }
  });
};
  
var rValidUrl = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

exports.isValidUrl = function(url) {
  return url.match(rValidUrl);
};

/************************************************************/
// Add additional utility functions below
/************************************************************/
var User = require('../app/models/user');
exports.checkUser = function(user, password, callback) {

  new User({username: user})
    .fetch()
    .then(function(found, err) {
      // console.log('line 33 ===============', found);
      if (!err && found) {
        var salt = found.attributes.salt;
        var hashPassword = crypto.createHash('sha1');
        hashPassword.update(salt.concat(password));
        var securePassword = hashPassword.digest('hex');
        if (found.attributes.password === securePassword) {

          console.log(user + ' found with correct password');
          callback(null, found);
        } else {
          console.log(user + ' found but wrong password');
          callback(null, null);
        }
      } else {
        console.log(user + ' not found');
        callback(err, null);
      }
    });
};

exports.restrict = function(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'request denied';
    res.redirect('/login');
  }
};



