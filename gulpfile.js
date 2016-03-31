var gulp = require('gulp');
var uglify = require('gulp-uglify');
var insert = require('gulp-insert');
var rename = require('gulp-rename');
var pkg = require('./package.json');

var template = "/*! Copyright (c) 2016 Naufal Rabbani (https://github.com/BosNaufal)\n\
* Licensed Under MIT (http://opensource.org/licenses/MIT)\n\
*\n\
* Secure Local Storage - Version " + pkg.version + "\n\
*\n\
*/\n"

gulp.task('build', function() {
  return gulp.src('secure-local-storage.js')
        .pipe(uglify('min'))
        .pipe(insert.prepend(template))
        .pipe(rename('secure-local-storage.min.js'))
        .pipe(gulp.dest('./'));
});

gulp.task('default', ['build']);
