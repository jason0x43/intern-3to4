import * as _convert from 'src/convert';

const { suite, test, before, beforeEach, afterEach, after } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

const MockModule = intern.getPlugin('mocking');

import * as sinon from 'sinon';
import * as path from 'path';

import { assign, deepAssign } from '@dojo/core/lang';

const defaultConfig = {
	loader: {
		options: {
			map: {
				'*': {
					'@dojo': 'node_modules/@dojo'
				},
				'intern/interfaces': {
					'intern': 'node_modules/intern'
				}
			},
			packages: [
				{
					'location': '_build/src/compat',
					'main': 'index.js',
					'name': 'intern'
				},
				{
					'location': 'node_modules/chai',
					'main': 'chai.js',
					'name': 'chai'
				}
			]
		},
		'script': 'node_modules/3to4/loader.js'
	}
};

suite('convert', () => {
	let mock: MockModule<typeof _convert>;
	let module: typeof _convert;
	let convert: typeof _convert.default;

	const sandbox = sinon.sandbox.create();

	const mockDojoLoad = {
		default: assign(sandbox.stub(), {
			config: sandbox.stub(),
			toUrl: sandbox.stub()
		})
	};

	const mockLog = {
		default: sandbox.stub(),
		disabled: sandbox.stub()
	};

	before(async () => {
		mock = new MockModule('src/convert', require);
		mock.mockDependencies({
			'src/dojoLoad': mockDojoLoad,
			'path': path,
			'src/log': mockLog
		});

		module = await mock.getModuleUnderTest();
		convert = module.default;
	});

	beforeEach(() => {
		mockDojoLoad.default.resolves({});
	});

	afterEach(() => {
		sandbox.reset();
		mock.reset();
	});

	after(() => {
		sandbox.restore();
		mock.destroy();
	});

	test('blank config', async () => {
		const result = await convert('foo/bar', '.');

		assert.deepEqual(result, defaultConfig);
	});

	test('unsupported property', async () => {
		mockDojoLoad.default.resolves({
			foo: 'bar'
		});
		const result = await convert('foo/bar', '.');

		assert.deepEqual(result, defaultConfig);
		assert.isTrue(mockLog.default.calledOnce);
		assert.isTrue(mockLog.default.calledWith('unsupportedProperty', 'foo'));
	});

	test('excludeInstrumentation', async () => {
		mockDojoLoad.default.resolves({
			excludeInstrumentation: /abc/
		});
		const result = await convert('foo/bar', '.');

		assert.deepEqual(result, defaultConfig);
		assert.isTrue(mockLog.default.calledOnce);
		assert.isTrue(mockLog.default.calledWith('deprecated'));
	});

	test('runnerClientReporter', async () => {
		mockDojoLoad.default.resolves({
			runnerClientReporter: ''
		});
		const result = await convert('foo/bar', '.');

		assert.deepEqual(result, defaultConfig);
		assert.isTrue(mockLog.default.calledOnce);
		assert.isTrue(mockLog.default.calledWith('deprecated'));
	});

	test('copied properties', async () => {
		const properties = {
			bail: 0,
			baseline: 1,
			basePath: 2,
			benchmark: 3,
			benchmarkConfig: 4,
			capabilities: 5,
			defaultTimeout: 6,
			environments: 7,
			filterErrorStack: 8,
			functionalSuites: [ '9' ],
			grep: /abc/,
			maxConcurrency: 11,
			suites: [ '12', '13.js' ],
			tunnel: '14'
		};
		mockDojoLoad.default.resolves(properties);
		mockDojoLoad.default.toUrl.returnsArg(0);
		const result = await convert('foo/bar', '.');

		const expected = deepAssign({}, defaultConfig, properties, {
			grep: 'abc',
			functionalSuites: [ '9.js' ],
			suites: [ '12.js', '13.js' ]
		});

		assert.deepEqual(result, expected);
	});

	test('benchmarkSuites', async () => {
		mockDojoLoad.default.resolves({
			benchmarkSuites: [ 'foo' ]
		});
		const result = await convert('foo/bar', '.');

		assert.deepEqual(result, deepAssign({}, defaultConfig, {
			suites: [ 'foo' ]
		}));
	});

	test('coverageVariable', async () => {
		mockDojoLoad.default.resolves({
			coverageVariable: '__foo_bar_baz__'
		});
		const result = await convert('foo/bar', '.');

		assert.deepEqual(result, deepAssign({}, defaultConfig, {
			instrumenterOptions: {
				coverageVariable: '__foo_bar_baz__'
			}
		}));
	});

	test('proxy settings', async () => {
		mockDojoLoad.default.resolves({
			proxyUrl: 'foo/bar/baz',
			proxyPort: 5000
		});
		const result = await convert('foo/bar', '.');

		assert.deepEqual(result, deepAssign({}, defaultConfig, {
			serverUrl: 'foo/bar/baz',
			serverPort: 5000
		}));
	});

	test('reporters', async () => {
		mockDojoLoad.default.resolves({
			reporters: [
				'Console',
				'tests/support/CustomString',
				{ id: 'LcovHtml', dirname: 'coverage' },
				'Lcover',
				{ id: 'tests/support/Custom', filename: 'lcov.info' }
			]
		});
		const result = await convert('foo/bar', '.');

		assert.deepEqual(result, deepAssign({}, defaultConfig, {
			reporters: [
				{ name: 'console' },
				{ name: 'CustomString' },
				{
					name: 'htmlcoverage',
					options: {
						dirname: 'coverage'
					}
				},
				{ name: 'Lcover' },
				{
					name: 'Custom',
					options: {
						filename: 'lcov.info'
					}
				}
			],
			plugins: [
				'tests/support/CustomString',
				'tests/support/Custom'
			]
		}));
		assert.isTrue(mockLog.default.called);
		assert.isTrue(mockLog.default.calledWith('legacyReporter', 'tests/support/CustomString'));
		assert.isTrue(mockLog.default.calledWith('legacyReporter', 'tests/support/Custom'));
		assert.isTrue(mockLog.default.calledWith('error', sinon.match(/Unknown reporter 'Lcover'/)));
	});

	test('existing package', async () => {
		const properties = {
			loaderOptions: {
				packages: [
					{ name: 'chai', location: 'foo/chai', 'main': 'thing.js' }
				]
			}
		};
		mockDojoLoad.default.resolves(properties);
		const result = await convert('foo/bar', '.');

		assert.strictEqual(result.loader.options, properties.loaderOptions);
		assert.deepEqual(result, deepAssign({}, defaultConfig, {
			loader: {
				options: {
					packages: [
						{
							'location': 'node_modules/chai',
							'main': 'chai.js',
							'name': 'chai'
						},
						{
							'location': '_build/src/compat',
							'main': 'index.js',
							'name': 'intern'
						}
					]
				}
			}
		}));
	});
});
