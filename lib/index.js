var propSearch = require('prop-search');
var mpath = require('mpath');
var _ = require('lodash');
var clone = require('clone');
var async = require('async');
var utils = require('./utils');

var noop = function () {
};

var loaders = {
  'web': require('./loaders/web'),
  'file': require('./loaders/file')
};

function derefSchema(schema, options, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = {};
  }

  if (!fn) fn = noop;

  var setRefValue = function (cr, nval) {
    var path = cr.path;
    mpath.set(path, nval, schema);
  };

  var loader = typeof options.loader === 'function' ? options.loader : null;

  var refs = propSearch.searchForExistence(schema, '$ref', {separator: '.'});

  if (refs && refs.length > 0) {
    async.eachSeries(refs, function (currRef, ascb) {
      var refType = utils.getRefType(currRef);
      var refVal = utils.getRefValue(currRef);

      var doCustomLoader = function () {
        loader(refVal, clone(options), function (err, newValue) {
          if (!err) {
            if (!newValue) {
              newValue = refVal;
            }
            setRefValue(currRef, newValue);
          }
          ascb(err);
        });
      };

      if (refType && loaders[refType]) {
        loaders[refType](refVal, options, function (err, newValue) {
          if (!err) {
            if (!newValue) {
              newValue = refVal;
            }
            derefSchema(newValue, options, function (err, newValueSchema) {
              if (!err) {
                setRefValue(currRef, newValueSchema);
              }
              ascb(err);
            });
          }
          else if (loader) {
            doCustomLoader();
          }
          else {
            ascb(err);
          }
        })
      }
      else if (refType === 'local') {
        var newValue = utils.getRefPathValue(schema, refVal);
        if (!newValue) {
          newValue = refVal;
        }
        derefSchema(newValue, options, function (err, newValueSchema) {
          if (!err) {
            setRefValue(currRef, newValueSchema);
          }
          ascb(err);
        });
      }
      else if (loader) {
        doCustomLoader();
      }
    }, function (err) {
      return fn(err, schema);
    });
  }
  else {
    return fn(null, schema);
  }
}

function defer (baseSchema, options, fn) {
  return derefSchema(clone(baseSchema), options, fn)
}

defer.prototype.getRefPathValue = utils.getRefPathValue;

module.exports = defer;