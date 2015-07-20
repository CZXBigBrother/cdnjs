var glob = require('glob');
var fs = require('fs');
var natcompare = require('./natcompare.js');
var mkdirp = require('mkdirp');
var async = require('async');

var packages = [];

glob("ajax/libs/**/package.json", function (error, matches) {
  async.each(matches, function(item, callback){
    var package = JSON.parse(fs.readFileSync(item, 'utf8'));
    delete package.main;
    delete package.scripts;
    delete package.bugs;
    delete package.autoupdate;
    delete package.npmFileMap;
    delete package.dependencies;
    delete package.devDependencies;
    package.assets = [];
    var versions = glob.sync("ajax/libs/"+package.name+"/!(package.json)/").map(function(ver){return ver.slice(0, -1);});
    async.each(versions, function(version, callback) {
      var temp = {};
      temp.version = version.replace(/^.+\//, "");
      temp.files = glob.sync(version + "/**/*", {nodir:true});
      for (var i = 0; i < temp.files.length; i++){
        var filespec = temp.files[i];
        temp.files[i] = {
          name: filespec.replace(version + "/", "")
        };
      }
      package.assets.push(temp);
    }, function(err){
      if(err) console.log(err);
    });

    package.assets.sort(function(a, b){
      return natcompare.compare(a.version, b.version);
    })
    package.assets.reverse();
    packages.push(package);
  }, function(err){
    if(err) return console.log(err);

    console.log('Success!');
  });

  mkdirp.sync('./scratch');
  // Initialize the feed object
  fs.writeFileSync('scratch/packages.json', JSON.stringify({"packages":packages}, null, 2), 'utf8');
});
