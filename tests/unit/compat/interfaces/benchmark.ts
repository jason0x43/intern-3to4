import * as _benchmark from 'src/compat/interfaces/benchmark';

const { suite, test, before, afterEach, after } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

const MockModule = intern.getPlugin('mocking');

import * as sinon from 'sinon';

suite('compat/interfaces/benchmark', () => {
	let mock: MockModule<typeof _benchmark>;
	let module: typeof _benchmark;
	let registerSuite: typeof _benchmark.default;

	let mockBenchmark: {
		default: sinon.SinonSpy;
	};

	let mockBenchmarkTest: {
		default: {
			async: sinon.SinonStub;
		}
	};

	let mockAspect: {
		on(object: any, property: string, handler: Function): void;
	};

	let mockObject: {
		default: sinon.SinonStub;
	};

	before(async () => {
		mock = new MockModule('src/compat/interfaces/benchmark', require);

		mockBenchmarkTest = {
			default: {
				async: mock.stub()
			}
		};

		mockBenchmark = {
			default: mock.stub()
		};

		mockAspect = {
			on(object, property, handler) {
				if (object[property]) {
					const value = object[property];

					if (Array.isArray(value)) {
						value.push(handler);
					}
					else {
						object[property] = [ value, handler ];
					}
				}
				else {
					object[property] = handler;
				}
			}
		};

		mockObject = {
			default: mock.stub()
		};

		mock.mockDependencies({
			'./object': mockObject,
			'intern/lib/BenchmarkTest': mockBenchmarkTest,
			'intern/lib/interfaces/benchmark': mockBenchmark,
			'@dojo/core/aspect': mockAspect
		});

		module = await mock.getModuleUnderTest();
		registerSuite = module.default;
	});

	afterEach(() => {
		mock.reset();
	});

	after(() => {
		mock.destroy();
	});

	test('async wrapper', () => {
		assert.strictEqual(module.default.async, mockBenchmarkTest.default.async);
	});

	test('skip wrapper', () => {
		const testFuncStub = sinon.spy();
		const testStub = {
			skip: sinon.stub()
		};
		const func = module.default.skip(testFuncStub);
		func(testStub as any);

		assert.isTrue(testFuncStub.notCalled);
		assert.isTrue(testStub.skip.calledOnce);
	});

	test('lifecycle methods', () => {
		const original = {
			name: 'foo',

			beforeEachLoop() {},
			afterEachLoop() {}
		};

		registerSuite(original);

		assert.isTrue(mockObject.default.calledOnce);
		assert.isTrue(mockObject.default.calledWith(original, mockBenchmark.default, sinon.match.func));

		const handler = mockObject.default.firstCall.args[2];
		const beforeEachLoop = sinon.spy();
		const afterEachLoop = sinon.spy();
		const suite: { [key: string]: any } = {};

		assert.isTrue(handler('beforeEachLoop', beforeEachLoop, suite));
		assert.isTrue(handler('afterEachLoop', afterEachLoop, suite));
		assert.isFalse(handler('unhandled', () => {}, suite));

		assert.deepEqual(suite, {
			beforeEachLoop,
			afterEachLoop
		});
	});
});
