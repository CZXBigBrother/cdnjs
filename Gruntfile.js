'use strict';

var glob = require('globby');
var async = require('async');
var semver = require('semver');
var natcompare = require('./build/natcompare.js');

/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Task configuration.
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        unused: true,
        boss: true,
        eqnull: true,
        globals: {
          jQuery: true
        }
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib_test: {
        src: ['lib/**/*.js', 'test/**/*.js']
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Default task.
  grunt.registerTask('default', ['packages']);


  grunt.registerTask('packages', 'Collect all package\'s infos to a json file.', function(){
    var done = this.async();
    var log = grunt.log;

    glob("ajax/libs/*/package.json", function (error, matches) {
      if(error) return done(error);

      var packages = [];

      log.ok('Total ', matches.length, ' packages');

      async.each(matches, function(item, callback){
        log.ok('Processing ', item);

        var pkg = grunt.file.readJSON(item);
        delete pkg.main;
        delete pkg.scripts;
        delete pkg.bugs;
        delete pkg.autoupdate;
        delete pkg.npmFileMap;
        delete pkg.dependencies;
        delete pkg.devDependencies;
        pkg.assets = [];

        var versions = glob.sync("ajax/libs/"+pkg.name+"/!(package.json)/").map(function(ver){return ver.slice(0, -1);});
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
          pkg.assets.push(temp);
        }, function(err){
          if(err) {
            console.log(err);
            done(err);
          }
        });

        pkg.assets.sort(function(a, b){
          if(semver.valid(a.version) && semver.valid(b.version)) {
            return semver.compare(a.version, b.version);
          }

          return natcompare.compare(a.version, b.version);
        })

        pkg.assets.reverse();
        packages.push(pkg);
      }, function(err){
        if(err) {
          console.log(err);
          return done(err);
        }

        log.ok('Success!');
      });

      grunt.file.write('scratch/packages.json', JSON.stringify({"packages":packages}, null, 2));

      log.ok('Write file to ', 'scratch/packages.json'.green);

      done();
    });
  });

};
