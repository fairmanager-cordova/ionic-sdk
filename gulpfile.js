const gulp    = require( "gulp" );
const pkg     = require( "./package.json" );
const request = require( "request" );
const q       = require( "q" );
const through = require( "through" );

const argv = require( "minimist" )( process.argv.slice( 2 ) );

const _           = require( "lodash" );
const buildConfig = require( "./config/build.config.js" );
const changelog   = require( "conventional-changelog" );
const marked      = require( "marked" );

const fs = require( "fs" );

const concat = require( "gulp-concat" );
const footer = require( "gulp-footer" );
const gulpif = require( "gulp-if" );
const header = require( "gulp-header" );
const eslint = require( "gulp-eslint" );
// var minifyCss = require('gulp-minify-css');
const cleanCss    = require( "gulp-clean-css" );
const rename      = require( "gulp-rename" );
const rimraf      = require( "rimraf" );
const runSequence = require( "run-sequence" );
const sass        = require( "gulp-sass" );
const stripDebug  = require( "gulp-strip-debug" );
const template    = require( "gulp-template" );
const uglify      = require( "gulp-uglify" );
const gutil       = require( "gulp-util" );

const banner = _.template( buildConfig.banner, {
	pkg : pkg
} );

const IS_RELEASE_BUILD = Boolean( argv.release );
if( IS_RELEASE_BUILD ) {
	gutil.log(
		gutil.colors.red( "--release:" ),
		"Building release version (minified, debugs stripped)..."
	);
}

if( argv.dist ) {
	buildConfig.dist = argv.dist;
}

gulp.task( "default", [ "build" ] );
gulp.task( "build", [ "bundle", "sass" ] );
gulp.task( "validate", [ "eslint", "ddescribe-iit" ], () => {
	gulp.run( "karma" );
} );

let IS_WATCH = false;
gulp.task( "watch", [ "build" ], () => {
	IS_WATCH = true;
	gulp.watch( "js/**/*.js", [ "bundle" ] );
	gulp.watch( "scss/**/*.scss", [ "sass" ] );
} );

gulp.task( "changelog", () => {
	const dest   = argv.dest || "CHANGELOG.md";
	const toHtml = Boolean( argv.html );
	return makeChangelog( argv ).then( log => {
		if( toHtml ) {
			log = marked( log, {
				gfm : true
			} );
		}
		fs.writeFileSync( dest, log );
	} );
} );

function makeChangelog( options ) {
	const file     = options.standalone ? "" : `${__dirname}/CHANGELOG.md`;
	const subtitle = options.subtitle || "";
	const from     = options.from;
	const version  = options.version || pkg.version;
	const deferred = q.defer();
	changelog( {
		repository : "https://github.com/fairmanager-cordova/ionic-sdk",
		version : version,
		subtitle : subtitle,
		file : file,
		from : from
	}, ( err, log ) => {
		if( err ) {
			deferred.reject( err );
		} else {
			deferred.resolve( log );
		}
	} );
	return deferred.promise;
}

gulp.task( "bundle", [
	"scripts",
	"scripts-ng",
	"vendor",
	"version"
], () => {
	gulp.src( buildConfig.ionicBundleFiles.map( src => src.replace( /.js$/, ".min.js" ) ), {
		base : buildConfig.dist,
		cwd : buildConfig.dist
	} )
		.pipe( header( buildConfig.bundleBanner ) )
		.pipe( concat( "ionic.bundle.min.js" ) )
		.pipe( gulp.dest( `${buildConfig.dist}/js` ) );

	return gulp.src( buildConfig.ionicBundleFiles, {
		base : buildConfig.dist,
		cwd : buildConfig.dist
	} )
		.pipe( header( buildConfig.bundleBanner ) )
		.pipe( concat( "ionic.bundle.js" ) )
		.pipe( gulp.dest( `${buildConfig.dist}/js` ) );
} );

gulp.task( "eslint", () => gulp.src( [ "js/**/*.js" ] )
	.pipe( eslint() )
	.pipe( eslint.format() )
	.pipe( eslint.failAfterError() ) );

gulp.task( "ddescribe-iit", () => gulp.src( [ "test/**/*.js", "js/**/*.js" ] )
	.pipe( notContains( [
		"ddescribe", "iit", "xit", "xdescribe"
	] ) ) );

gulp.task( "vendor", () => gulp.src( buildConfig.vendorFiles, {
	cwd : "config/lib/",
	base : "config/lib/"
} )
	.pipe( gulp.dest( buildConfig.dist ) ) );

gulp.task( "scripts", () => gulp.src( buildConfig.ionicFiles )
	.pipe( gulpif( IS_RELEASE_BUILD, stripDebug() ) )
	.pipe( template( {
		pkg : pkg
	} ) )
	.pipe( concat( "ionic.js" ) )
	.pipe( header( buildConfig.closureStart ) )
	.pipe( footer( buildConfig.closureEnd ) )
	.pipe( header( banner ) )
	.pipe( gulp.dest( `${buildConfig.dist}/js` ) )
	.pipe( gulpif( IS_RELEASE_BUILD, uglify() ) )
	.pipe( rename( {
		extname : ".min.js"
	} ) )
	.pipe( header( banner ) )
	.pipe( gulp.dest( `${buildConfig.dist }/js` ) ) );

gulp.task( "scripts-ng", () => gulp.src( buildConfig.angularIonicFiles )
	.pipe( gulpif( IS_RELEASE_BUILD, stripDebug() ) )
	.pipe( concat( "ionic-angular.js" ) )
	.pipe( header( buildConfig.closureStart ) )
	.pipe( footer( buildConfig.closureEnd ) )
	.pipe( header( banner ) )
	.pipe( gulp.dest( `${buildConfig.dist}/js` ) )
	.pipe( gulpif( IS_RELEASE_BUILD, uglify() ) )
	.pipe( rename( {
		extname : ".min.js"
	} ) )
	.pipe( header( banner ) )
	.pipe( gulp.dest( `${buildConfig.dist }/js` ) ) );

gulp.task( "sass", done => {
	gulp.src( "scss/ionic.scss" )
		// .pipe(header(banner))
		.pipe( sass().on( "error", err => {
			if( IS_WATCH ) {
				console.log( gutil.colors.red( err ) );
			} else {
				done( err );
			}
		} ) )
		.pipe( concat( "ionic.css" ) )
		.pipe( gulp.dest( `${buildConfig.dist}/css` ) )
		.pipe( gulpif( IS_RELEASE_BUILD, cleanCss() ) )
		.pipe( rename( {
			extname : ".min.css"
		} ) )
		.pipe( gulp.dest( `${buildConfig.dist}/css` ) )
		.on( "end", done );
} );

gulp.task( "version", () => {
	const d    = new Date();
	const date = d.toISOString().substring( 0, 10 );
	const time = `${pad( d.getUTCHours() )
	}:${pad( d.getUTCMinutes() )
	}:${pad( d.getUTCSeconds() )}`;
	return gulp.src( "config/version.template.json" )
		.pipe( template( {
			pkg : pkg,
			date : date,
			time : time
		} ) )
		.pipe( rename( "version.json" ) )
		.pipe( gulp.dest( buildConfig.dist ) );
} );

gulp.task( "clean", done => {
	rimraf( "dist", {}, err => {
		done( err );
	} );
} );

gulp.task( "preparePackageJson", done => {

	function createTimestamp() {
		// YYYYMMDDHHMM
		const d = new Date();
		return d.getUTCFullYear() + // YYYY
			( `0${d.getUTCMonth() + 1}` ).slice( -2 ) + // MM
			( `0${d.getUTCDate()}` ).slice( -2 ) + // DD
			( `0${d.getUTCHours()}` ).slice( -2 ) + // HH
			( `0${d.getUTCMinutes()}` ).slice( -2 ); // MM
	}

	const existingPackage = require( "./package.json" );
	existingPackage.name    = "ionic-angular";
	existingPackage.version = `${existingPackage.version}-${createTimestamp()}`;
	delete existingPackage.dependencies;
	delete existingPackage.devDependencies;
	delete existingPackage.config;
	fs.writeFile( "./dist/package.json", JSON.stringify( existingPackage, null, 2 ), err => {
		done( err );
	} );
} );

gulp.task( "copyReadme", done => {
	const data = fs.readFileSync( "./README.md" );
	fs.writeFileSync( "./dist/README.md", data );
	done();
} );

gulp.task( "prepareForNpm", done => {
	runSequence( "clean", "bundle", "sass", "preparePackageJson", "copyReadme", done );
} );

gulp.task( "publishToNpm", [ "prepareForNpm" ], done => {
	const tagName = argv.tagName && argv.tagName.length > 0 ? argv.tagName : "v1-nightly";

	const spawn = require( "child_process" ).spawn;

	const npmCmd = spawn( "npm", [ "publish", `--tag=${tagName}`, "./dist" ] );
	npmCmd.stdout.on( "data", data => {
		console.log( data.toString() );
	} );

	npmCmd.stderr.on( "data", data => {
		console.log( `npm err: ${  data.toString()}` );
	} );

	npmCmd.on( "close", () => {
		done();
	} );
} );

function notContains( disallowed ) {
	disallowed = disallowed || [];

	return through( function( file ) {
		let error;
		const contents = file.contents.toString();
		disallowed.forEach( str => {
			const idx = disallowedIndex( contents, str );
			if( idx !== -1 ) {
				error = error || `${file.path} contains ${str} on line ${
					contents.substring( 0, idx, str ).split( "\n" ).length}!`;
			}
		} );
		if( error ) {
			throw new Error( error );
		} else {
			this.emit( "data", file );
		}
	} );

	function disallowedIndex( content, disallowedString ) {
		const notFunctionName = "[^A-Za-z0-9$_]";
		const regex           = new RegExp( `(^|${notFunctionName})(${disallowedString})${notFunctionName}*(`, "gm" );
		const match           = regex.exec( content );
		// Return the match accounting for the first submatch length.
		return match !== null ? match.index + match[ 1 ].length : -1;
	}
}
function pad( n ) {
	if( n < 10 ) {
		return `0${n}`;
	}
	return n;
}
function qRequest( opts ) {
	const deferred = q.defer();
	request( opts, ( err, res, body ) => {
		if( err ) {
			deferred.reject( err );
		} else {
			deferred.resolve( res );
		}
	} );
	return deferred.promise;
}
