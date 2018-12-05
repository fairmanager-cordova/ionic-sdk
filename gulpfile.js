var GithubApi = require('github');
var gulp = require('gulp');
var path = require('canonical-path');
var pkg = require('./package.json');
var request = require('request');
var q = require('q');
var semver = require('semver');
var through = require('through');

var argv = require('minimist')(process.argv.slice(2));

var _ = require('lodash');
var buildConfig = require('./config/build.config.js');
var changelog = require('conventional-changelog');
var es = require('event-stream');
var irc = require('ircb');
var marked = require('marked');
var mkdirp = require('mkdirp');
var twitter = require('node-twitter-api');

var cp = require('child_process');
var fs = require('fs');

var concat = require('gulp-concat');
var footer = require('gulp-footer');
var gulpif = require('gulp-if');
var header = require('gulp-header');
var eslint = require('gulp-eslint');
// var minifyCss = require('gulp-minify-css');
var cleanCss = require('gulp-clean-css');
var rename = require('gulp-rename');
var rimraf = require("rimraf");
var runSequence = require('run-sequence');
var sass = require('gulp-sass');
var stripDebug = require('gulp-strip-debug');
var template = require('gulp-template');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');

var banner = _.template(buildConfig.banner, { pkg: pkg });

var IS_RELEASE_BUILD = !!argv.release;
if (IS_RELEASE_BUILD) {
  gutil.log(
    gutil.colors.red('--release:'),
    'Building release version (minified, debugs stripped)...'
  );
}

if (argv.dist) {
  buildConfig.dist = argv.dist;
}

gulp.task('default', ['build']);
gulp.task('build', ['bundle', 'sass']);
gulp.task('validate', ['eslint', 'ddescribe-iit'], function() {
  gulp.run('karma')
});

var IS_WATCH = false;
gulp.task('watch', ['build'], function() {
  IS_WATCH = true;
  gulp.watch('js/**/*.js', ['bundle']);
  gulp.watch('scss/**/*.scss', ['sass']);
});

gulp.task('changelog', function() {
  var dest = argv.dest || 'CHANGELOG.md';
  var toHtml = !!argv.html;
  return makeChangelog(argv).then(function(log) {
    if (toHtml) {
      log = marked(log, {
        gfm: true
      });
    }
    fs.writeFileSync(dest, log);
  });
});

function makeChangelog(options) {
  var file = options.standalone ? '' : __dirname + '/CHANGELOG.md';
  var subtitle = options.subtitle || '';
  var from = options.from;
  var version = options.version || pkg.version;
  var deferred = q.defer();
  changelog({
    repository: 'https://github.com/fairmanager-cordova/ionic-v1',
    version: version,
    subtitle: subtitle,
    file: file,
    from: from
  }, function(err, log) {
    if (err) deferred.reject(err);
    else deferred.resolve(log);
  });
  return deferred.promise;
}

gulp.task('bundle', [
  'scripts',
  'scripts-ng',
  'vendor',
  'version'
], function() {
  gulp.src(buildConfig.ionicBundleFiles.map(function(src) {
      return src.replace(/.js$/, '.min.js');
    }), {
      base: buildConfig.dist,
      cwd: buildConfig.dist
    })
      .pipe(header(buildConfig.bundleBanner))
      .pipe(concat('ionic.bundle.min.js'))
      .pipe(gulp.dest(buildConfig.dist + '/js'));

  return gulp.src(buildConfig.ionicBundleFiles, {
    base: buildConfig.dist,
    cwd: buildConfig.dist
  })
    .pipe(header(buildConfig.bundleBanner))
    .pipe(concat('ionic.bundle.js'))
    .pipe(gulp.dest(buildConfig.dist + '/js'));
});

gulp.task('eslint', function() {
  return gulp.src(['js/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('ddescribe-iit', function() {
  return gulp.src(['test/**/*.js', 'js/**/*.js'])
    .pipe(notContains([
      'ddescribe', 'iit', 'xit', 'xdescribe'
    ]));
});

gulp.task('vendor', function() {
  return gulp.src(buildConfig.vendorFiles, {
      cwd: 'config/lib/',
      base: 'config/lib/'
    })
    .pipe(gulp.dest(buildConfig.dist));
});

gulp.task('scripts', function() {
  return gulp.src(buildConfig.ionicFiles)
    .pipe(gulpif(IS_RELEASE_BUILD, stripDebug()))
    .pipe(template({ pkg: pkg }))
    .pipe(concat('ionic.js'))
    .pipe(header(buildConfig.closureStart))
    .pipe(footer(buildConfig.closureEnd))
    .pipe(header(banner))
    .pipe(gulp.dest(buildConfig.dist + '/js'))
    .pipe(gulpif(IS_RELEASE_BUILD, uglify()))
    .pipe(rename({ extname: '.min.js' }))
    .pipe(header(banner))
    .pipe(gulp.dest(buildConfig.dist + '/js'));
});

gulp.task('scripts-ng', function() {
  return gulp.src(buildConfig.angularIonicFiles)
    .pipe(gulpif(IS_RELEASE_BUILD, stripDebug()))
    .pipe(concat('ionic-angular.js'))
    .pipe(header(buildConfig.closureStart))
    .pipe(footer(buildConfig.closureEnd))
    .pipe(header(banner))
    .pipe(gulp.dest(buildConfig.dist + '/js'))
    .pipe(gulpif(IS_RELEASE_BUILD, uglify()))
    .pipe(rename({ extname: '.min.js' }))
    .pipe(header(banner))
    .pipe(gulp.dest(buildConfig.dist + '/js'));
});

gulp.task('sass', function(done) {
  gulp.src('scss/ionic.scss')
    // .pipe(header(banner))
    .pipe(sass().on('error', function(err){
      if (IS_WATCH){
        console.log(gutil.colors.red(err));
      } else {
        done(err);
      }
    }))
    .pipe(concat('ionic.css'))
    .pipe(gulp.dest(buildConfig.dist + '/css'))
    .pipe(gulpif(IS_RELEASE_BUILD, cleanCss()))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest(buildConfig.dist + '/css'))
    .on('end', done);
});

gulp.task('version', function() {
  var d = new Date();
  var date = d.toISOString().substring(0,10);
  var time = pad(d.getUTCHours()) +
      ':' + pad(d.getUTCMinutes()) +
      ':' + pad(d.getUTCSeconds());
  return gulp.src('config/version.template.json')
    .pipe(template({
      pkg: pkg,
      date: date,
      time: time
    }))
    .pipe(rename('version.json'))
    .pipe(gulp.dest(buildConfig.dist));
});

gulp.task('clean', function(done){
  rimraf('dist', {}, function(err){
    done(err);
  });
});

gulp.task('preparePackageJson', function(done){

  function createTimestamp() {
    // YYYYMMDDHHMM
    var d = new Date();
    return d.getUTCFullYear() + // YYYY
           ('0' + (d.getUTCMonth() +　1)).slice(-2) + // MM
           ('0' + (d.getUTCDate())).slice(-2) + // DD
           ('0' + (d.getUTCHours())).slice(-2) + // HH
           ('0' + (d.getUTCMinutes())).slice(-2); // MM
  }

  var existingPackage = require('./package.json');
  existingPackage.name = "ionic-angular";
  existingPackage.version = existingPackage.version + "-" + createTimestamp();
  delete existingPackage.dependencies;
  delete existingPackage.devDependencies;
  delete existingPackage.config;
  fs.writeFile("./dist/package.json", JSON.stringify(existingPackage, null, 2), function(err){
    done(err);
  });
});

gulp.task('copyReadme', function(done){
    var data = fs.readFileSync('./README.md');
    fs.writeFileSync('./dist/README.md', data);
    done();
});

gulp.task('prepareForNpm', function(done){
  runSequence('clean', 'bundle', 'sass', 'preparePackageJson', 'copyReadme', done);
});

gulp.task("publishToNpm", ['prepareForNpm'], function(done){
  var tagName = argv.tagName && argv.tagName.length > 0 ? argv.tagName : "v1-nightly";

  var spawn = require('child_process').spawn;

  var npmCmd = spawn('npm', ['publish', '--tag=' + tagName, './dist']);
  npmCmd.stdout.on('data', function (data) {
    console.log(data.toString());
  });

  npmCmd.stderr.on('data', function (data) {
    console.log('npm err: ' + data.toString());
  });

  npmCmd.on('close', function() {
    done();
  });
});

function notContains(disallowed) {
  disallowed = disallowed || [];

  return through(function(file) {
    var error;
    var contents = file.contents.toString();
    disallowed.forEach(function(str) {
      var idx = disallowedIndex(contents, str);
      if (idx !== -1) {
        error = error || file.path + ' contains ' + str + ' on line ' +
          contents.substring(0, idx, str).split('\n').length + '!';
      }
    });
    if (error) {
      throw new Error(error);
    } else {
      this.emit('data', file);
    }
  });

  function disallowedIndex(content, disallowedString) {
    var notFunctionName = '[^A-Za-z0-9$_]';
    var regex = new RegExp('(^|' + notFunctionName + ')(' + disallowedString + ')' + notFunctionName + '*\\(', 'gm');
    var match = regex.exec(content);
    // Return the match accounting for the first submatch length.
    return match !== null ? match.index + match[1].length : -1;
  }
}
function pad(n) {
  if (n<10) { return '0' + n; }
  return n;
}
function qRequest(opts) {
  var deferred = q.defer();
  request(opts, function(err, res, body) {
    if (err) deferred.reject(err);
    else deferred.resolve(res);
  });
  return deferred.promise;
}
