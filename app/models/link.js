var db = require('../config');
var Click = require('./click');
var crypto = require('crypto');
var knex = require('knex');

var Link = db.Model.extend({
  tableName: 'urls',
  hasTimestamps: true,
  defaults: {
    visits: 0
  },
  clicks: function() {
    return this.hasMany(Click);
  },
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      console.log(model, options, attrs);
      var shasum = crypto.createHash('sha1');
      shasum.update(model.get('url'));
      model.set('code', shasum.digest('hex').slice(0, 5));

    });
  }
});

module.exports = Link;
