'use strict';

var glob = require('globby');
var async = require('async');
var semver = require('semver');
var natcompare = require('./build/natcompare.js');
var exec = require('child_process').exec;
var execSync = require('child_process').execSync;
var spawn = require('child_process').spawn;
var fs = require('fs');
var streamBuffers = require('stream-buffers');
var UPYUN = require('upyun');
var async = require('async');
var mime = require('mime');
var _ = require('lodash');

/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Task configuration.
  });

  // These plugins provide necessary tasks.

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


  grunt.registerTask('upload-diff', 'diff of 2 commits and upload files', function(){
    var done = this.async();
    var commit1 = grunt.file.exists('hash.json') ? grunt.file.readJSON('hash.json') : '';
    var commit2 = execSync('git rev-parse HEAD').toString().replace(/[\r\n\s]/g, '');

    var cmd = [
    'diff',
    '--name-only',
    '--diff-filter=ACMR',
    commit1,
    commit2
    ];

    var diff = spawn('git', cmd, {
      env: process.env, 
      cwd: process.cwd
    });
    var dataStream = new streamBuffers.WritableStreamBuffer();

    diff.stdout.on('data', function(data){
      dataStream.write(data);
    });


    diff.on('exit', function(code){
      if(code === null) return done(new Error(code));

      var str = dataStream.getContentsAsString();
      var files = str.split('\n');

      upload(files, function(err){
        if(err) return done(err);

        grunt.file.write('hash.json', JSON.stringify(commit2)); //保存已经上传到的 commit 
      });
    });

    function upload(files, done){
      if(!grunt.file.exists('upyun.json')) return done(new Error('No upyun account!'));

      var upyunAccount = grunt.file.readJSON('upyun.json');
      var upyun = new UPYUN(upyunAccount.bucket, upyunAccount.operator, upyunAccount.password);

      grunt.log.ok('Mybe upload ', files.length, ' files');
      async.mapLimit(files, 10, function(item, callback){
        if(!/^ajax\/libs\//.test(item)) {
          grunt.log.error('File: ', item, ' no need upload');
          return callback(null, false);
        }

        if(!grunt.file.exists(item) || !grunt.file.isFile(item)) {
          grunt.log.error('File: ', item, ' not exists or not a file');
          return callback(null, false);
        }

        grunt.log.ok(item, ' is ok, now uploading...');

        var remote = item.replace(/^ajax\/libs/i, '');
        upyun.uploadFile(remote, item, mime.lookup(item), true, {mkdir: true}, function(error, result){

          if(error) {
            return callback(error);
          }

          if(result && result.error) {
            grunt.log.error('When upload file: ' + item + ' faild!');
            return callback(new Error(JSON.stringify(result)));
          }

          grunt.log.ok('Upload file: ' + item, ' OK'.green);

          return callback(null, item);
        });
      }, function(err, results){
        if(err) {
          return done(err);
        }

        results = _.compact(results);
        grunt.log.ok('Uploaded ', results.length, ' files of ', files.length);
        done(null);
      });
    }
  });


  grunt.registerTask('check-google-font', 'Check google font in css files', function(){
    var done = this.async();

    glob("ajax/libs/semantic-ui/**/*.css", function(error, matches){
      grunt.log.ok('Total ', matches.length, ' css files');

      matches.forEach(function(item){
        var content = grunt.file.read(item);

        var regex = /@import\s[^;]+fonts\.googleapis\.com[^;]+;/gi;

        if(regex.test(content)) {
          content = content.replace(regex, '');

          grunt.log.ok('File: ', item.green, ' processed');
          grunt.file.write(item, content);
        }

        // var fonts = content.match(regex);

        // if(fonts) {
        //   // grunt.log.ok(item);
        //   console.log(fonts);
        // }
      });

      done();
    });
  });

};
