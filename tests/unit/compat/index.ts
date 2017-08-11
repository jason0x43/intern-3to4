import _index = require('src/compat/index');

const { suite, test, before, afterEach, after } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

const MockModule = intern.getPlugin('mocking');

import { SinonSpy } from 'sinon';

suite('compat/index', () => {
	let mock: MockModule<typeof _index>;
	let module: typeof _index;

	const mockObject = {
		default: {}
	};

	const mockTdd = {};

	let callbackSpy: SinonSpy;

	before(async () => {
		mock = new MockModule('src/compat/index', require);

		callbackSpy = mock.spy();

		mock.mockDependencies({
			'src/compat/interfaces/object': mockObject,
			'src/compat/interfaces/tdd': mockTdd
		});

		module = await mock.getModuleUnderTest();
	});

	afterEach(() => {
		mock.reset();
	});

	after(() => {
		mock.destroy();
	});

	function keys(object: any) {
		const keys: string[] = [];

		for (let key in object) {
			keys.push(key);
		}

		return keys;
	}

	test('properties', () => {
		assert.lengthOf(keys(module.accessed), 0);

		module.args = [ 1, 2, 3 ];
		const expectedExecutor = module.executor = {} as any;
		module.mode = 'client';

		assert.lengthOf(keys(module.accessed), 0);

		assert.deepEqual(module.args, [1, 2, 3]);
		assert.lengthOf(keys(module.accessed), 1);

		assert.strictEqual(module.executor, expectedExecutor);
		assert.lengthOf(keys(module.accessed), 2);

		assert.strictEqual(module.mode, 'client');
		assert.lengthOf(keys(module.accessed), 3);
	});

	/*test('.load', () => {
		module.load('object', null as any, callbackSpy);
		module.load('tdd', null as any, callbackSpy);

		assert.isTrue(callbackSpy.calledTwice);
	});*/

	test('.normalize', () => {
		assert.strictEqual(module.normalize('foo/bar/baz'), 'foo/bar/baz');
	});
});
