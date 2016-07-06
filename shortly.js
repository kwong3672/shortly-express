var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');
var path = require('path');
var knex = require('knex')({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, './db/shortly.sqlite'),
    // database: 'main'
  },
  useNullAsDefault: true
});


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.use(session({secret: 'secret string'}));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));


app.get('/', 
function(req, res) {
  res.render('index');
});

app.get('/signup', 
function(req, res) {
  res.render('signup');
});

app.get('/login', 
function(req, res) {
  console.log(req.session);
  res.render('login');
});

app.get('/links', util.restrict, 
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.status(200).send(links.models);
  });
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;
  console.log('within shortly.js post link function');
  console.log(req.session);
  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        // var rows = knex.select().from('users');
        // console.log('=============================', Links[0]);
        var id; 

        knex.select('id').from('users').where('username', req.session.user).then(function(value) {
          console.log('logged in user: ' + req.session.user + ' : ' + value.length, value[0].id);
          id = value[0].id;
          Links.create({
            url: uri,
            title: title,
            baseUrl: req.headers.origin,
            userId: id

          })
          .then(function(newLink) {
            res.status(200).send(newLink);
          });
        });
        // console.log('our id is ======================', id);
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.post('/login', function(req, res) {
  // console.log('trying to Login');
  // console.log(req.body);
  util.checkUser(req.body.username, req.body.password, function(err, foundName) {
    if (foundName) {
      // console.log('foundName=====================');
      // console.log(foundName);
      req.session.regenerate(function() {
        req.session.user = req.body.username;
        res.writeHead(302, {'location': '/'});
        res.end(null, 'logged into post ');
      });
    } else {
      // console.log('NO foundName=====================');
      // console.log(foundName);
      res.writeHead(302, {'location': '/login'});
      res.end();
    }
    // console.log('check user CB');
  });
});

app.post('/signup', function(req, res) {

  // new User(req.body);
  // res.status(201).send('created fake user');

  new User({username: req.body.username}).fetch().then(function(found) {
    if (found) {

      res.status(200).send('user already exists');
    } else {
      var salt = bcrypt.genSaltSync(10);
      var hashPassword = crypto.createHash('sha1');
      hashPassword.update(salt.concat(req.body.password));
      var securePassword = hashPassword.digest('hex');
      console.log(securePassword);
      Users.create({
        username: req.body.username,
        password: securePassword,
        salt: salt
      }).then(function() {
        req.session.regenerate(function() {
          req.session.user = req.body.username;
          res.writeHead(302, {'location': '/'});
          res.end(null, 'Created your user account');
        });
        
      });
    }
  });
});

app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/login');
  });
});

app.get('/create', util.restrict, function(req, res) {

});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
