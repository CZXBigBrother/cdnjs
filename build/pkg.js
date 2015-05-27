var glob = require('glob');
var fs = require('fs');
var natcompare = require('./natcompare.js');
var mkdirp = require('mkdirp');

var packages = [];

glob("ajax/libs/**/package.json", function (error, matches) {
  matches.forEach(function(element){
    var package = JSON.parse(fs.readFileSync(element, 'utf8'));
    package.assets = Array();
    var versions = glob.sync("ajax/libs/"+package.name+"/!(package.json)");
    versions.forEach(function(version) {
      var temp = Object();
      temp.version = version.replace(/^.+\//, "");
      temp.files = glob.sync(version + "/**/*.*");
      for (var i = 0; i < temp.files.length; i++){
        var filespec = temp.files[i];
        temp.files[i] = {
          name: filespec.replace(version + "/", ""),
          size: Math.round(fs.statSync(filespec).size / 1024)
        };
      }
      package.assets.push(temp);
    });
    package.assets.sort(function(a, b){
      return natcompare.compare(a.version, b.version);
    })
    package.assets.reverse();
    packages.push(package);
  });

  mkdirp.sync('./scratch');
  // Initialize the feed object
  fs.writeFileSync('scratch/packages.json', JSON.stringify({"packages":packages}), 'utf8');
});
