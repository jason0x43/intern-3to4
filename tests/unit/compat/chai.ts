import * as _chai from 'src/compat/chai';

const { suite, test, before, beforeEach, afterEach, after } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

const MockModule = intern.getPlugin('mocking');

import { SinonSpy } from 'sinon';

suite('compat/chai', () => {
	let mock: MockModule<typeof _chai>;
	let module: typeof _chai;

	let mockChai: {
		config: any;
		expect?: any;
		should?: any;
		assert?: any;
		AssertionError?: any;
	};

	let callbackSpy: SinonSpy;

	before(async () => {
		mock = new MockModule('src/compat/chai', require);

		mockChai = Object.create(null);
		mockChai.config = {};

		callbackSpy = mock.spy();

		mock.mockDependencies({
			'chai': mockChai
		});

		module = await mock.getModuleUnderTest();
	});

	beforeEach(() => {
		Object.assign(mockChai, {
			expect: {},
			should: {},
			assert: {
				AssertionError: {}
			},
			AssertionError: {}
		});
	});

	afterEach(() => {
		mock.reset();
	});

	after(() => {
		mock.destroy();
		mockChai = null as any;
	});

	suite('.load', () => {
		test('no identifier', () => {
			module.load('', null, callbackSpy);

			assert.isTrue(callbackSpy.calledOnce);
			assert.strictEqual(callbackSpy.firstCall.args[0], mockChai);
		});

		test('valid identifier', () => {
			module.load('expect', null, callbackSpy);
			module.load('should', null, callbackSpy);
			module.load('assert', null, callbackSpy);

			assert.isTrue(callbackSpy.calledThrice);

			assert.strictEqual(callbackSpy.firstCall.args[0], mockChai.expect);
			assert.strictEqual(callbackSpy.secondCall.args[0], mockChai.should);
			assert.strictEqual(callbackSpy.thirdCall.args[0], mockChai.assert);
			assert.strictEqual(mockChai.expect.AssertionError, mockChai.AssertionError);
			assert.strictEqual(mockChai.should.AssertionError, mockChai.AssertionError);
			assert.notStrictEqual(mockChai.assert.AssertionError, mockChai.AssertionError);
		});

		test('invalid identifier', () => {
			assert.throws(() => {
				module.load('some non-existent interface', null, callbackSpy);
			}, /Invalid chai interface ".*"/);

			assert.isFalse(callbackSpy.called);
		});
	});

	test('.normalize', () => {
		assert.isFunction(module.normalize);
		assert.strictEqual(module.normalize('foo/bar/baz'), 'foo/bar/baz');
	});
});
