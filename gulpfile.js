var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');

var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');

var uglify = require('gulp-uglify');
var insert = require('gulp-insert');
var rename = require('gulp-rename');

var template =
"/*! Copyright (c) 2016 Naufal Rabbani (http://github.com/BosNaufal)\n\
* Licensed Under MIT (http://opensource.org/licenses/MIT)\n\
*\n\
* Secure Local Storage - Version@1.0.0\n\
*\n\
*/"

function scripts() {

	var b = browserify({
		entries: ['./src/index.js'],
		debug: true,
		cache: {},
		packageCache: {},
		fullPaths: true,
		transform: [babelify],
		plugin: [watchify]
	});

	function bundling() {
		b.bundle()
			.pipe(source('secure-local-storage.js'))
			.pipe(gulp.dest('./build/'));
	}

	b.on('update', function () {
		gutil.log('bundling~');
		bundling();
    return gulp.src('./build/secure-local-storage.js')
      .pipe(uglify('min'))
      .pipe(insert.prepend(template))
      .pipe(rename('secure-local-storage.min.js'))
      .pipe(gulp.dest('./build/'));
	});

	b.on('time', function (time) {
		if(time >= 1000){
			time = time/1000+' ms';
		}else{
			time = time+' μs';
		}
		gutil.log('bundled! in '+time);
	});
	bundling();

}


gulp.task('dev', function () {
	return scripts();
});


gulp.task('default', ['dev']);
