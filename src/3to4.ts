#!/usr/bin/env node

import { createWriteStream } from 'fs';
import { red, yellow } from 'chalk';
import * as wrapAnsi from 'wrap-ansi';
import { basename, dirname, relative } from 'path';
import * as loader from 'dojo/loader';

const args = process.argv.slice(2);

if (args.length < 1) {
	console.log(
		`usage: ${basename(process.argv[1])} CONFIG.JS [ OUTPUT.JSON ]`
	);
	process.exit(1);
}

const cwd = process.cwd();
const messages: Message[] = [];
const dojoLoader: loader.IRequire = <any>loader;
const internConfig = {
	baseUrl: cwd.replace(/\\/g, '/'),
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
const converters: { [key: string]: (value: any) => any } = {
	excludeInstrumentation(value: any) {
		if (value instanceof RegExp) {
			return value.source;
		}
		return value;
	},

	functionalSuites(suites: string[]) {
		return resolveModuleIds(suites);
	},

	grep(value: RegExp) {
		return value.source;
	},

	suites(suites: string[]) {
		return resolveModuleIds(suites);
	},

	tunnel(value: string) {
		const match = /^(.*)Tunnel$/.exec(value);
		if (match) {
			value = match[1];
		}
		return value.toLowerCase();
	}
};

let stdout: NodeJS.WritableStream = process.stdout;
if (args.length > 1) {
	stdout = createWriteStream(args[1], { flags: 'w' });
}

let stderr: NodeJS.WritableStream = process.stderr;
let columns = (<any>process.stderr).columns;
if (args.length > 2) {
	stderr = createWriteStream(args[2], { flags: 'w+' });
	columns = undefined;
}

dojoLoader(internConfig);

(async () => {
	try {
		const config = await convert(args[0]);
		const configString = JSON.stringify(config, null, '    ');
		stdout.write(`${configString}\n`);
	} catch (error) {
		log('error', error);
	}

	messages
		.filter(message => message.type === 'warning')
		.map(message => message.data)
		.forEach(message => {
			print(`${yellow('WARNING')} ${message}\n`);
		});

	messages
		.filter(message => message.type === 'deprecated')
		.forEach(message => {
			const info = <DeprecationMessage>message.data;
			print(
				`${yellow(
					'WARNING'
				)} The property '${info.property}' is deprecated. ` +
					`${info.message || ''}\n`
			);
		});

	messages
		.filter(message => message.type === 'unsupportedProperty')
		.forEach(message => {
			print(
				`${yellow(
					'WARNING'
				)} The property '${message.data}' is unknown.\n`
			);
		});

	const legacyReporters = messages.filter(
		message => message.type === 'legacyReporter'
	);
	if (legacyReporters.length > 0) {
		print(
			`${yellow(
				'WARNING'
			)} The following legacy reporters should be rewritten ` +
				`as Intern 4 reporters and loaded loaded using the 'plugins' config property. See ` +
				'https://github.com/theintern/intern/blob/master/docs/extending.md#reporters.\n'
		);
		legacyReporters.forEach(reporter => {
			print(`  * ${reporter.data}\n`);
		});
	}

	messages.filter(message => message.type === 'error').forEach(message => {
		const error = message.data;
		print(`${red('ERROR')} ${error}\n`);
		if (error instanceof Error && error.stack) {
			error.stack.split('\n').slice(1).forEach(line => {
				print(`${line}\n`);
			});
		}
	});

	if (stdout !== process.stdout) {
		stdout.end();
	}

	if (stderr !== process.stderr) {
		stderr.end();
	}
})();

interface Message {
	time: Date;
	type: string;
	data: any;
}

interface DeprecationMessage {
	property: string;
	message: string;
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

function convertReporterName(name: string) {
	const reporter = reporters[name];
	if (!reporter) {
		error(
			`Unknown reporter '${name}': ` +
				'The reporter is referenced by an unknown name and cannot be automatically converted.'
		);
	}
	return reporter;
}

function convert(configFile: string): PromiseLike<any> {
	return new Promise(resolve => {
		dojoLoader([configFile], async function(oldConfig) {
			const newConfig: { [key: string]: any } = {
				loader: {
					script: 'node_modules/3to4/loader.js'
				}
			};

			// If there are loader options, configure the loader with them so
			// suite resolution will work
			if (oldConfig.loaderOptions) {
				dojoLoader(oldConfig.loaderOptions);
			}

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
					case 'filterErrorStack':
					case 'functionalSuites':
					case 'grep':
					case 'maxConcurrency':
					case 'suites':
					case 'tunnel':
						newConfig[key] = value;
						break;

					case 'excludeInstrumentation':
						deprecated(
							key,
							`Please update your config to use the 'coverage' ` +
								'property. See ' +
								'https://github.com/theintern/intern/blob/master/docs/configuration.md#coverage.'
						);
						newConfig[key] = value;
						break;

					case 'before':
					case 'after':
						// TODO: Possibly create plugins
						deprecated(
							key,
							`Please add the 'before' callback to a '${key}Run' ` +
								'hook in a plugin and add the plugin to the ' +
								`'plugins' property in the generated config. See ` +
								'https://github.com/theintern/intern/blob/master/docs/how_to.md#run-code-before-tests-start.'
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

			// Add the compat intern package to loader options
			if (!newConfig.loader.options) {
				newConfig.loader.options = {};
			}
			const loaderOptions = newConfig.loader.options;

			if (!loaderOptions.packages) {
				loaderOptions.packages = [];
			}
			addPackage(loaderOptions.packages, {
				name: 'intern',
				location: relative(cwd, dirname(require.resolve(__dirname))),
				main: 'index.js'
			});

			const chai = require.resolve('chai');
			addPackage(loaderOptions.packages, {
				name: 'chai',
				location: relative(cwd, dirname(chai)),
				main: 'chai.js'
			});

			if (!loaderOptions.map) {
				loaderOptions.map = {};
			}
			const loaderMap = loaderOptions.map;
			if (!loaderMap['*']) {
				loaderMap['*'] = {};
			}
			loaderMap['*']['@dojo'] = relative(
				cwd,
				dirname(dirname(require.resolve('@dojo/core')))
			);
			loaderMap['intern/interfaces'] = {
				intern: relative(cwd, dirname(require.resolve('intern')))
			};

			if (newConfig.loader.options) {
				// If the config uses environment-specific loaders, copy the loader
				// options into the environment-specific loader properties since those
				// will override the top-level loader property.
				if (loaders.node || loaders.browser) {
					['node', 'browser']
						.filter(env => loaders[env])
						.forEach(env => {
							newConfig[env] = newConfig[env] || {};
							newConfig[env].loader.options =
								newConfig.loader.options;
						});
				}
			}

			resolve(newConfig);
		});
	});
}

function addPackage(
	packages: { [key: string]: any }[],
	pkg: { [key: string]: any }
) {
	let entry = packages.find(
		(entry: { [key: string]: any }) => entry.name === pkg.name
	);
	if (entry) {
		Object.keys(pkg).forEach(key => {
			entry![key] = pkg[key];
		});
	} else {
		packages.push(pkg);
	}
}

function deprecated(property: string, message?: string) {
	log('deprecated', { property, message });
}

function error(message: string) {
	log('error', message);
}

function legacyReporter(reporter: string) {
	log('legacyReporter', reporter);
}

function log(type: string, data: any) {
	messages.push({ time: new Date(), type, data });
}

function print(text: string) {
	if (columns) {
		text = wrapAnsi(text, Math.min(80, columns - 10), <any>{ trim: false });
	}
	stderr.write(text);
}

function resolveModuleIds(moduleIds: string[]) {
	function moduleIdToPath(
		moduleId: string,
		pkg: string,
		packageLocation: string
	) {
		const path = packageLocation + moduleId.slice(pkg.length);
		return relative(cwd, path);
	}

	if (!moduleIds) {
		return moduleIds;
	}

	// The module ID has a glob character
	return moduleIds.reduce(function(resolved, moduleId) {
		const pkg = moduleId.slice(0, moduleId.indexOf('/'));
		const packageLocation = dojoLoader.toUrl(pkg);
		let modulePath = moduleIdToPath(moduleId, pkg, packageLocation);

		// Ensure only JS files are considered
		if (!/\.js$/.test(modulePath)) {
			modulePath += '.js';
		}

		resolved.push(modulePath);

		return resolved;
	}, <string[]>[]);
}

function unsupportedProperty(property: string) {
	log('unsupportedProperty', property);
}
