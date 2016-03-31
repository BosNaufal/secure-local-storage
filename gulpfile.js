var gulp = require('gulp');
var uglify = require('gulp-uglify');
var insert = require('gulp-insert');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var babel = require('gulp-babel');
var pkg = require('./package.json');

var template = "/*! Copyright (c) 2016 Naufal Rabbani (https://github.com/BosNaufal)\n\
* Licensed Under MIT (http://opensource.org/licenses/MIT)\n\
*\n\
* Secure Local Storage - Version " + pkg.version + "\n\
*\n\
*/\n"

gulp.task('babel', function() {
  return gulp.src('src/index.js')
        .pipe(babel())
        .pipe(insert.prepend(template))
        .pipe(gulp.dest('build/'));
});

gulp.task('browserify', ['babel'], function() {
  return browserify('build/index.js', {
            standalone: 'SecureStorage'
        })
        .bundle()
        .pipe(source('secure-local-storage.js'))
        .pipe(gulp.dest('build/'));
});

gulp.task('uglify', ['browserify'], function() {
  return gulp.src('build/secure-local-storage.js')
        .pipe(uglify())
        .pipe(insert.prepend(template))
        .pipe(rename('secure-local-storage.min.js'))
        .pipe(gulp.dest('build/'));
});

gulp.task('build', ['uglify']);

gulp.task('default', ['build']);

gulp.task('watch', ['build'], function() {
  gulp.watch('src/**/*.js', ['build']);
});
