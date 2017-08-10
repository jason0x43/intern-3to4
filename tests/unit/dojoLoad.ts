import * as _dojoLoad from 'src/dojoLoad';

const { suite, test, beforeEach, afterEach } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

const MockModule = intern.getPlugin('mocking');

const mockLang = {
	assign() {
		return Object.assign.apply(Object, arguments);
	}
};

class MockPromise {
	value: any;

	constructor(executor: (resolve: (value: any) => void) => void) {
		const resolve = (value: any) => {
			if (!this.hasOwnProperty('value')) {
				this.value = value;
			}
		};

		executor(resolve);
	}
}

function mockLoader(moduleIds: string[], callback: (modules: any[]) => void) {
	callback(moduleIds);
}
namespace mockLoader {
	export const has = {};
	export const config = {};
}

suite('dojoLoad', () => {
	let mock: MockModule<typeof _dojoLoad>;
	let module: typeof _dojoLoad;
	let dojoLoad: typeof _dojoLoad.default;

	beforeEach(async () => {
		mock = new MockModule('src/dojoLoad', require);
		mock.mockDependencies({
			'@dojo/core/lang': mockLang,
			'@dojo/shim/Promise': {
				default: MockPromise
			},
			'dojo/loader': mockLoader
		});

		module = await mock.getModuleUnderTest();
		dojoLoad = module.default;
	});

	afterEach(() => {
		mock.destroy();
	});

	test('properties from dojo/loader', () => {
		assert.strictEqual(dojoLoad.has, mockLoader.has);
		assert.strictEqual(dojoLoad.config, mockLoader.config);
	});

	test('resolves with module', () => {
		const promise: MockPromise = dojoLoad('thing') as any;
		assert.deepEqual(promise.value, [ 'thing' ]);
	});
});
