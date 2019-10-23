const exec = require('child_process').exec;
const gulp = require('gulp');
const babel = require('gulp-babel');
const css = require('gulp-clean-css');// 1. Copy the index.html as is
const livereload = require('gulp-livereload');

// const electron = require('electron-connect').server.create();

gulp.task('reload', async function() {
   return livereload.reload();
});

gulp.task('copy', () => {
    return gulp.src('assets/**/*')
        .pipe(gulp.dest('app/assets'))
});

gulp.task('html', () => {
    return gulp.src('src/index.html')
        .pipe(gulp.dest('app/'))
});// 2. Compile CSS file and move them to the app folder
gulp.task('css', () => { // 2.
    return gulp.src('src/**/*.css')
        .pipe(css())
        .pipe(gulp.dest('app/'))
});// 3. Compile JS files and move them to the app folder
gulp.task('js', () => { // 3.
    return gulp.src(['main.js', 'src/**/*.js', 'main/**/*.js'])
         .pipe(babel())
         .pipe(gulp.dest('app/'))
});// 4. Start the electron process.

gulp.task('build', gulp.series('copy', 'html', 'css', 'js'));
gulp.task('start', gulp.series('build', () => {
    return exec(
        __dirname+'/node_modules/.bin/electron .'
    ).on('close', () => process.exit());
}));


gulp.task('watch', async function() {
  gulp.watch('src/**/*.html', gulp.series('html','reload'));
  gulp.watch('src/**/*.css', gulp.series('css','reload'));
  gulp.watch('src/**/*.js', gulp.series('js','reload'));
  gulp.watch('util.js', gulp.series('js','reload'));
  livereload.listen();
});

gulp.task('default', gulp.parallel('start', 'watch'));

gulp.task('release', gulp.series('build', () => {
    return exec(
        __dirname+'/node_modules/.bin/electron-builder .'
    ).on('close', () => process.exit());
}));
