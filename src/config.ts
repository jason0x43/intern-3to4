import * as loader from 'dojo/loader';
import { writeFileSync } from 'fs';
import { basename } from 'path';
import { red, yellow } from 'chalk';

interface DeprecationMessage {
	property: string;
	message: string;
}

const messages: { type: string; data: any }[] = [];
const reporters: { [name: string]: string } = {
	Benchmark: 'benchmark',
	Cobertura: 'cobertura',
	Console: 'console',
	Html: 'html',
	JUnit: 'junit',
	JsonCoverage: 'jsoncoverage',
	Lcov: 'lcov',
	LcovHtml: 'htmlcoverage',
	Pretty: 'pretty',
	Runner: 'runner',
	TeamCity: 'teamcity',
	WebDriver: 'dom'
};
const dojoLoader: loader.IRequire = <any>loader;
const internConfig = {
	baseUrl: process.cwd().replace(/\\/g, '/'),
	packages: [{ name: 'intern', location: 'node_modules/intern' }],
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

dojoLoader([config], async function(oldConfig) {
	const newConfig: { [key: string]: any } = {
		loader: {
			script: 'dojo'
		}
	};

	let loaders: { [key: string]: any } = {};

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

			case 'before':
			case 'after':
				// TODO: Possibly create plugins
				deprecated(
					key,
					`Please add this code to a '${key}Run' hook in a plugin and add the plugin to the 'plugins'\n` +
						`property in the generated config.\n` +
						'See https://github.com/theintern/intern/blob/master/docs/how_to.md#run-code-before-tests-start.'
				);
				newConfig.plugins = newConfig.plugins || [];
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

			case 'runnerClientReporter':
				deprecated(
					key,
					'The reporter used by WebDriver remotes is no longer configurable'
				);
				break;

			default:
				unsupportedProperty(key);
				break;
		}
	});

	if (newConfig.loader.options) {
		// If the config uses environment-specific loaders, copy the loader
		// options into the environment-specific loader properties since those
		// will override the top-level loader property.
		if (loaders.node || loaders.browser) {
			['node', 'browser'].filter(env => loaders[env]).forEach(env => {
				newConfig[env] = newConfig[env] || {};
				newConfig[env].loader.options = newConfig.loader.options;
			});
		}
	}

	const newConfigString = JSON.stringify(newConfig, null, '    ');
	if (output) {
		writeFileSync(output, newConfigString);
	} else {
		console.log(newConfigString);
	}

	messages
		.filter(entry => entry.type === 'warning')
		.map(entry => entry.data)
		.forEach((message: string) => {
			printWarning(`${message}\n`);
		});

	messages
		.filter(entry => entry.type === 'deprecated')
		.map(entry => entry.data)
		.forEach((info: DeprecationMessage) => {
			printWarning(
				`WARNING: The property '${info.property}' is deprecated.`
			);
			if (info.message) {
				printWarning(`${info.message}\n`);
			} else {
				printWarning('');
			}
		});

	messages
		.filter(entry => entry.type === 'unsupportedProperty')
		.map(entry => entry.data)
		.forEach((prop: string) => {
			printWarning(`WARNING: The property '${prop}' is unknown.\n`);
		});

	const legacyReporters = messages
		.filter(entry => entry.type === 'legacyReporter')
		.map(entry => <string>entry.data);
	if (legacyReporters.length > 0) {
		// TODO: Update this to a more useful URL when one exists
		printWarning(
			'WARNING: The following legacy reporters should be rewritten as Intern 4 reporters and\n' +
				`loaded loaded using the 'plugins' config property.\n` +
				'See https://github.com/theintern/intern/blob/master/docs/extending.md#reporters.\n'
		);
		legacyReporters.forEach(reporter => {
			printWarning(`  * ${reporter}`);
		});
		printWarning('');
	}

	messages
		.filter(entry => entry.type === 'error')
		.map(entry => entry.data)
		.forEach((error: string) => {
			printError(red(`ERROR: ${error}\n`));
		});
});

// ---------------------------------------------------------------------
// General utilities

function printError(message: string) {
	console.error(red(message));
}

function printWarning(message: string) {
	console.warn(yellow(message));
}

// Messages

function error(message: string) {
	messages.push({ type: 'error', data: message });
}

function unsupportedProperty(property: string) {
	messages.push({ type: 'unsupportedProperty', data: property });
}

function deprecated(property: string, message?: string) {
	messages.push({ type: 'deprecated', data: { property, message } });
}

function legacyReporter(reporter: string) {
	messages.push({ type: 'legacyReporter', data: reporter });
}

// Reporters

function convertReporterName(name: string) {
	const reporter = reporters[name];
	if (!reporter) {
		error(`Unknown reporter '${name}'`);
	}
	return reporter;
}

function addReporter(config: any, reporter: string | { [key: string]: any }) {
	let plugin: any;
	let entry: { name?: string; options?: any | undefined } = {};

	if (typeof reporter === 'string') {
		if (reporter.indexOf('/') !== -1) {
			plugin = reporter;
			entry.name = basename(reporter);
			legacyReporter(reporter);
		} else {
			entry.name = convertReporterName(reporter);
		}
	} else {
		const id: string = reporter.id;
		entry.options = JSON.parse(JSON.stringify(reporter));
		delete entry.options.id;

		if (id.indexOf('/') !== -1) {
			plugin = id;
			entry.name = basename(id);
			legacyReporter(id);
		} else {
			entry.name = convertReporterName(id);
		}
	}

	if (plugin) {
		config.plugins = config.plugins || [];
		config.plugins.push(plugin);
	}

	config.reporters.push(entry);
}
