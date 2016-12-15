var gulp = require('gulp');
var concat = require('gulp-concat');
var browserify = require('gulp-browserify');
var uglify = require('gulp-uglify');
var util = require('gulp-util');
var babel = require('gulp-babel')

var filesNames = ["handlers.js", "utils.js", "toucher.js","vacuumcacher.js" , "autolinker.js", "listcacher.js", "cacher.js", "orm.js", ];
var files = filesNames.map(function(x) {
    return "src/" + x;
});

var deps = [
    "jquery/dist/jquery.js",
    "lazy.js/lazy.js",
    "sockjs/sock.js"
].map(function(x){ return "bower_components/" + x });

gulp.task('default', function() {
    gulp.src(files)
        .pipe(babel())
        .pipe(concat('rwtORM.js'))
        .pipe(browserify())
        .pipe(gulp.dest('dist/'))
});

gulp.task('build', function() {
    gulp.src(files)
        .pipe(babel()).on('error',util.log)
        .pipe(browserify())
        .pipe(concat('rwtORM.min.js'))
        .pipe(uglify().on('error',util.log))
        .pipe(gulp.dest('dist'))
});

