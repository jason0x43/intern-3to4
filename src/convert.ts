import dojoLoad from './dojoLoad';
import { basename, dirname, relative } from 'path';

import log, { disabled } from './log';

export default async function convert(configFile: string, cwd: string, disableLog = false): Promise<any> {
	const originalLogDisabled = disabled();
	disabled(disableLog);

	const converters: { [key: string]: (value: any) => any } = {
		functionalSuites(suites: string[]) {
			return resolveModuleIds(cwd, suites);
		},

		grep(value: RegExp) {
			return value.source;
		},

		suites(suites: string[]) {
			return resolveModuleIds(cwd, suites);
		},

		tunnel(value: string) {
			const match = /^(.*)Tunnel$/.exec(value);
			if (match) {
				value = match[1];
			}
			return value.toLowerCase();
		}
	};

	try {
		const oldConfig = await dojoLoad<any>(configFile);
		const newConfig: { [key: string]: any; } = {
			loader: {
				script: 'node_modules/3to4/loader.js'
			}
		};

		// If there are loader options, configure the loader with them so
		// suite resolution will work
		if (oldConfig.loaderOptions) {
			dojoLoad.config(oldConfig.loaderOptions);
		}

		let loaders: { [key: string]: any } = {};

		Object.keys(oldConfig).forEach(property => {
			const converter = converters[property];
			const value = converter ? converter(oldConfig[property]) : oldConfig[property];

			switch (property) {
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
					newConfig[property] = value;
					break;

				case 'excludeInstrumentation':
					log('deprecated', {
						property,
						message: "Please update your config to use the 'coverage' " +
							'property. See ' +
							'https://github.com/theintern/intern/blob/master/docs/configuration.md#coverage.'
					});
					break;

				case 'before':
				case 'after':
					// TODO: Possibly create plugins
					log('deprecated', {
						property,
						message: `Please add the 'before' callback to a '${property}Run' ` +
							'hook in a plugin and add the plugin to the ' +
							"'plugins' property in the generated config. See " +
							'https://github.com/theintern/intern/blob/master/docs/how_to.md#run-code-before-tests-start.'
					});
					newConfig.plugins = newConfig.plugins || [];
					break;

				case 'benchmarkSuites':
					newConfig.suites = newConfig.suites || [];
					newConfig.suites.push(...value);
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
					log('deprecated', {
						property,
						message: 'The reporter used by WebDriver remotes is no longer configurable'
					});
					break;

				default:
					log('unsupportedProperty', property);
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

		return newConfig;
	}
	catch (error) {
		throw error;
	}
	finally {
		disabled(originalLogDisabled);
	}
}

function resolveModuleIds(cwd: string, moduleIds: string[]) {
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
		const packageLocation = dojoLoad.toUrl(pkg);
		let modulePath = moduleIdToPath(moduleId, pkg, packageLocation);

		// Ensure only JS files are considered
		if (!/\.js$/.test(modulePath)) {
			modulePath += '.js';
		}

		resolved.push(modulePath);

		return resolved;
	}, <string[]>[]);
}

function addReporter(config: any, reporter: string | { [key: string]: any }) {
	let plugin: any;
	let entry: { name?: string; options?: any | undefined } = {};

	if (typeof reporter === 'string') {
		if (reporter.indexOf('/') !== -1) {
			plugin = reporter;
			entry.name = basename(reporter);
			log('legacyReporter', reporter);
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
			log('legacyReporter', id);
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

function convertReporterName(name: string) {
	const reporter = reporters[name];
	if (!reporter) {
		log('error', `Unknown reporter '${name}': ` +
			'The reporter is referenced by an unknown name and cannot be automatically converted.'
		);
	}
	return reporter || name;
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
