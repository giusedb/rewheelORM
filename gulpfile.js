var gulp = require('gulp');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var util = require('gulp-util');
var babel = require('gulp-babel');
var wrap = require('gulp-wrap-js');
var maps = require('gulp-sourcemaps')
var Lazy = require('lazy.js');

//var filesNames = ["handlers.js", "utils.js", "toucher.js","vacuumcacher.js" , "autolinker.js", "listcacher.js", "cacher.js", "orm.js", "rwt.js"];

var libs = ['sockjs', 'request'].map(require.resolve);
libs.push(require.resolve('lazy.js').split('/').slice(0,-1).join('/') + '/lazy.js')
console.log(libs);
var files = [
    "handlers",
    "utils",
    "toucher",
    "vacuumcacher",
    "autolinker",
    "listcacher",
    "manytomany",
    "cacher",
    "orm",
];

gulp.task('default', function() {
    return gulp.src(files.map((x) => './src/' + x + '.js'))
        .pipe(maps.init())
        .pipe(concat('rwt.js'))
        .pipe(wrap("(function (root, Lazy, SockJS) {'use strict'; var isNode = false; %= body %;root.rwt = reWheelORM})(window, Lazy, SockJS)"))
        .pipe(maps.write())
        .pipe(gulp.dest('./dist'))
        .on('error',util.log);
});

gulp.task('minified', function() {
    return gulp.src(files.map((x) => './src/' + x + '.js'))
        .pipe(maps.init())
        .pipe(concat('rwt.min.js'))
        .pipe(wrap("(function (root, Lazy, SockJS) {'use strict'; var isNode = false; %= body %;root.rwt = reWheelORM})(window, Lazy, SockJS)"))
        .pipe(uglify().on('error',util.log))
        .pipe(maps.write())
        .pipe(gulp.dest('./dist'))
        .on('error',util.log);
});

gulp.task('build-node', function() {
    console.log('executing files', files);
    var nfiles = files.concat(['rwt.node']);
    console.log('files become', nfiles);
    nfiles = nfiles = nfiles.map((x) => './src/' + x + '.js')
    console.log('files become', nfiles);
    return gulp.src(nfiles)
        .pipe(concat('rwt.nd.js'))
        .pipe(gulp.dest('./dist'))
        .on('error',util.log);
});

