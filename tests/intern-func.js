define([ 'intern' ], function (intern) {
	var config = {
		capabilities: {
			'browserstack.selenium_version': '2.45.0'
		},

		environments: [
			{ browserName: 'internet explorer', version: '11', platform: 'WIN8' },
			{ browserName: 'internet explorer', version: '10', platform: 'WIN8' },
			{ browserName: 'internet explorer', version: '9', platform: 'WINDOWS' },
			{ browserName: 'firefox', version: '37', platform: [ 'WINDOWS', 'MAC' ] },
			{ browserName: 'chrome', version: '39', platform: [ 'WINDOWS', 'MAC' ] },
			{ browserName: 'safari', version: '8', platform: 'MAC' }
		],

		maxConcurrency: 2,

		tunnel: 'BrowserStackTunnel',

		loaderOptions: {
			packages: [ { name: 'app', location: '.' } ]
		},

		suites: [
			'app/tests/unit/*'
		],

		functionalSuites: [ /* 'myPackage/tests/functional' */ ],

		excludeInstrumentation: /^(?:tests|node_modules)\//,

		reporters: [
			'Console',
			{ id: 'LcovHtml', dirname: 'coverage' },
			{ id: 'Lcov', filename: 'lcov.info' },
			{ id: 'Lcover', filename: 'lcov.info' },
			{ id: 'tests/support/Custom', filename: 'lcov.info' }
		],

		foo: 'bar',

		before: function () {
			console.log('do stuff');
		}
	};

	if (intern.mode === 'runner') {
		config.reporters = [ 'Runner', 'Lcovhtml' ];
	}

	return config;
});
