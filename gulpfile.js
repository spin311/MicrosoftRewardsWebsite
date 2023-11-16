const gulp = require('gulp');
const cleanCSS = require('gulp-clean-css');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify');

// Minify and bundle CSS
gulp.task('minify-css', () => {
  return gulp.src('styles/*.css')
    .pipe(cleanCSS())
    .pipe(concat('styles.min.css'))
    .pipe(gulp.dest('dist/css'));
});

// Minify and bundle JS
gulp.task('minify-js', () => {
  return gulp.src('src/*.js')
    .pipe(uglify())
    .pipe(concat('scripts.min.js'))
    .pipe(gulp.dest('dist/js'));
});

// Default task
gulp.task('default', gulp.parallel('minify-css', 'minify-js'));