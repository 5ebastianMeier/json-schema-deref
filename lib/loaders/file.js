var fs = require('fs');
var clone = require('clone');
var path = require('path');

var utils = require('../utils');

var noop = function () {
};

function readFile(filePath, fn) {
  fs.readFile(filePath, function (err, data) {
    var newValue;

    try {
      newValue = JSON.parse(data);
    }
    catch (e) {
      err = e;
    }

    return fn(err, newValue);
  });
}

module.exports = function (refValue, options, fn) {
  if (!fn) fn = noop;

  var refPath = refValue;
  var cwd = process.cwd();
  var baseFolder = options.baseFolder ? path.resolve(cwd, options.baseFolder) : cwd;

  if (refPath.indexOf('file:') === 0) {
    refPath = refPath.substring(5);
  }
  else {
    refPath = path.resolve(baseFolder, refPath);
  }

  var filePath = refPath;
  var hashIndex = filePath.indexOf('#');
  if (hashIndex > 0) {
    filePath = refPath.substring(0, hashIndex);
  }

  var finishIt = function (err, fileValue) {
    var newVal;
    if (!err && fileValue) {
      newVal = fileValue;
      if (hashIndex > 0) {
        refPath = refPath.substring(hashIndex);
        var refNewVal = utils.getRefPathValue(fileValue, refPath);
        if (refNewVal) {
          newVal = refNewVal;
        }
      }
    }
    return fn(err, newVal);
  };

  if (filePath.indexOf('.json') >= 0) {
    var reqValue;
    try {
      reqValue = require(filePath);
    }
    catch (e) {
    }

    if (reqValue) {
      return finishIt(null, clone(reqValue));
    }
    return readFile(filePath, finishIt);
  }
  else {
    return readFile(filePath, finishIt);
  }
};