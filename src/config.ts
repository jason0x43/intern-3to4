import { basename } from 'path';
import * as loader from 'dojo/loader';
import log from './log';

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

export default function convert(
	loader: loader.IRequire,
	config: string
): PromiseLike<any> {
	return new Promise(resolve => {
		loader([config], async function(oldConfig) {
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
							`Please add the 'before' callback to a '${key}Run' hook in a plugin and add the plugin to the 'plugins' ` +
								'property in the generated config. See ' +
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

function error(message: string) {
	log('error', message);
}

function unsupportedProperty(property: string) {
	log('unsupportedProperty', property);
}

function deprecated(property: string, message?: string) {
	log('deprecated', { property, message });
}

function legacyReporter(reporter: string) {
	log('legacyReporter', reporter);
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
