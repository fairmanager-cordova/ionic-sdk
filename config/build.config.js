module.exports = {
	dist : "dist",

	protractorPort : 8876,

	banner : "/*!\n" +
		" * Copyright 2015 Drifty Co.\n" +
		" * http://drifty.com/\n" +
		" *\n" +
		" * Ionic, v<%= pkg.version %>\n" +
		" * A powerful HTML5 mobile app framework.\n" +
		" * http://ionicframework.com/\n" +
		" *\n" +
		" * By @maxlynch, @benjsperry, @adamdbradley <3\n" +
		" *\n" +
		" * Licensed under the MIT license. Please see LICENSE for more information.\n" +
		" *\n" +
		" */\n\n",

	bundleBanner : "/*!\n" +
		" * ionic.bundle.js is a concatenation of:\n" +
		" * ionic.js, angular.js, angular-animate.js,\n" +
		" * angular-sanitize.js, angular-ui-router.js,\n" +
		" * and ionic-angular.js\n" +
		" */\n\n",

	closureStart : "(function() {\n",
	closureEnd : "\n})();",

	ionicFiles : [
		// Base
		"js/ionic.js",

		// Utils
		"js/utils/delegateService.js",
		"js/utils/dom.js",
		"js/utils/events.js",
		"js/utils/gestures.js",
		"js/utils/platform.js",
		"js/utils/poly.js",
		"js/utils/tap.js",
		"js/utils/activator.js",
		"js/utils/utils.js",
		"js/utils/list.js",
		"js/utils/keyboard.js",
		"js/utils/viewport.js",

		// Views
		"js/views/view.js",
		"js/views/scrollView.js",
		"js/views/scrollViewNative.js",
		"js/views/listView.js",
		"js/views/modalView.js",
		"js/views/sideMenuView.js",
		"js/views/sliderView.js",
		"js/views/slidesView.js",
		"js/views/toggleView.js"
	],

	angularIonicFiles : [
		"js/angular/*.js",
		"js/angular/service/**/*.js",
		"js/angular/controller/**/*.js",
		"js/angular/directive/**/*.js"
	],

	// Which vendor files to include in dist, used by build
	// Matched relative to config/lib/
	vendorFiles : [
		"js/angular/angular-animate.js",
		"js/angular/angular-animate.min.js",
		"js/angular/angular-resource.js",
		"js/angular/angular-resource.min.js",
		"js/angular/angular-sanitize.js",
		"js/angular/angular-sanitize.min.js",
		"js/angular/angular.js",
		"js/angular/angular.min.js",
		"js/angular-ui/angular-ui-router.js",
		"js/angular-ui/angular-ui-router.min.js",
		"fonts/ionicons.eot",
		"fonts/ionicons.svg",
		"fonts/ionicons.ttf",
		"fonts/ionicons.woff"
	],

	ionicBundleFiles : [
		"js/ionic.js",
		"js/angular/angular.js",
		"js/angular/angular-animate.js",
		"js/angular/angular-sanitize.js",
		"js/angular-ui/angular-ui-router.js",
		"js/ionic-angular.js"
	]
};
