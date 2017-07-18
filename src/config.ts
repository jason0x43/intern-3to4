import * as loader from 'dojo/loader';
import { writeFileSync } from 'fs';
import { basename } from 'path';

function unsupported(property: string) {
	console.warn(`WARNING: The property '${property}' is unknown or has been deprecated.`);
}

function addReporter(config: any, reporter: string | { [key: string]: any }) {
	let plugin: any;
	let entry: { name?: string, options?: any | undefined } = {};

	if (typeof reporter === 'string') {
		if (reporter.indexOf('/') !== -1) {
			plugin = reporter;
			entry.name = basename(reporter);
			console.warn(`WARNING: Reporter ${reporter} should be rewritten as an Intern 4 reporter ` +
				'plugin and registered using intern.registerReporter.');
		}
		else {
			entry.name = reporter;
		}
	}
	else {
		const id: string = reporter.id;
		entry.options = JSON.parse(JSON.stringify(reporter));
		delete entry.options.id;

		if (id.indexOf('/') !== -1) {
			plugin = id;
			entry.name = basename(id);
			console.warn(`WARNING: Reporter ${id} should be rewritten as an Intern 4 reporter ` +
				'plugin and registered using intern.registerReporter.');
		}
		else {
			entry.name = id;
		}
	}

	if (plugin) {
		config.plugins = config.plugins || [];
		config.plugins.push(plugin);
	}
	config.reporters.push(entry);
}

const dojoLoader: loader.IRequire = <any>loader;
const internConfig = {
	baseUrl: process.cwd().replace(/\\/g, '/'),
	packages: [
		{ name: 'intern', location: 'node_modules/intern' }
	],
	map: {
		intern: {
			dojo: 'intern/browser_modules/dojo',
			chai: 'intern/browser_modules/chai/chai',
			diff: 'intern/browser_modules/diff/diff',
			// benchmark requires lodash and platform
			benchmark: 'intern/browser_modules/benchmark/benchmark',
			lodash: 'intern/browser_modules/lodash-amd/main',
			platform: 'intern/browser_modules/platform/platform'
		},
		'*': {
			'intern/dojo': 'intern/browser_modules/dojo'
		}
	}
};
const converters: { [key: string]: (value: any) => any } = {
	excludeInstrumentation(value: any) {
		if (value instanceof RegExp) {
			return value.source;
		}
		return value;
	},

	grep(value: RegExp) {
		return value.source;
	},

	tunnel(value: string) {
		const match = /^(.*)Tunnel$/.exec(value);
		if (match) {
			value = match[1];
		}
		return value.toLowerCase();
	}
};

dojoLoader(internConfig);

const args = process.argv.slice(2);

if (args.length < 1) {
	console.log(`usage: config.js CONFIG.JS [ OUTPUT.JSON ]`);
	process.exit(1);
}

const config = args[0];
const output = args[1];

dojoLoader([ config ], async function (oldConfig) {
	const newConfig: { [key: string]: any } = {
		loader: {
			script: 'dojo'
		}
	};

	let loaders: { [ key: string]: any } = {};

	Object.keys(oldConfig).forEach(key => {
		const converter = converters[key] || ((value: any) => value);
		const value = converter(oldConfig[key]);

		switch (key) {
			case 'bail':
			case 'baseline':
			case 'basePath':
			case 'benchmark':
			case 'benchmarkConfig':
			case 'capabilities':
			case 'defaultTimeout':
			case 'environments':
			case 'excludeInstrumentation':
			case 'filterErrorStack':
			case 'functionalSuites':
			case 'grep':
			case 'maxConcurrency':
			case 'suites':
			case 'tunnel':
				newConfig[key] = value;
				break;

			case 'benchmarkSuites':
				newConfig.suites = newConfig.suites || [];
				newConfig.suites.push(value);
				break;

			case 'coverageVariable':
				if (!newConfig.instrumenterOptions) {
					newConfig.instrumenterOptions = {};
				}
				newConfig.instrumenterOptions.coverageVariable = value;
				break;

			case 'loaders':
				if (value['host-browser']) {
					loaders.browser = value;
					newConfig.browser = newConfig.browser || {};
					newConfig.browser.loader = {
						script: value
					};
				}
				if (value['host-node']) {
					loaders.node = value;
					newConfig.node = newConfig.node || {};
					newConfig.node.loader = {
						script: value
					};
				}
				break;

			case 'loaderOptions':
				newConfig.loader.options = value;
				break;

			case 'proxyUrl':
				newConfig['serverUrl'] = value;
				break;

			case 'proxyPort':
				newConfig['serverPort'] = value;
				break;

			case 'reporters':
				newConfig.reporters = newConfig.reporters || [];
				value.forEach((entry: string | object) => {
					addReporter(newConfig, entry);
				});
				break;

			default:
				unsupported(key);
				break;
		}
	});

	if (newConfig.loader.options) {
		if (loaders.node || loaders.browser) {
			[ 'node', 'browser' ].filter(env => loaders[env]).forEach(env => {
				newConfig[env] = newConfig[env] || {};
				newConfig[env].loader.options = newConfig.loader.options;
			});
		}
	}

	const newConfigString = JSON.stringify(newConfig, null, '    ');
	if (output) {
		writeFileSync(output, newConfigString);
	}
	else {
		console.log(newConfigString);
	}
});
