import * as _bdd from 'src/compat/interfaces/bdd';

const { suite, test, before, after } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

const MockModule = intern.getPlugin('mocking');

suite('compat/interfaces/bdd', () => {
	let mock: MockModule<typeof _bdd>;
	let module: typeof _bdd;

	const mockTdd = {
		after: {},
		afterEach: {},
		before: {},
		beforeEach: {},
		suite: {},
		test: {}
	};

	before(async () => {
		mock = new MockModule('src/compat/interfaces/bdd', require);

		mock.mockDependencies({
			'src/compat/interfaces/tdd': mockTdd
		});

		module = await mock.getModuleUnderTest();
	});

	after(() => {
		mock.destroy();
	});

	// Since the bdd interface just re-exports the tdd interface, we just need to make sure
	// the properties on the module are exported correctly
	test('module interface', () => {
		assert.strictEqual(module.after, mockTdd.after);
		assert.strictEqual(module.afterEach, mockTdd.afterEach);
		assert.strictEqual(module.before, mockTdd.before);
		assert.strictEqual(module.beforeEach, mockTdd.beforeEach);
		assert.strictEqual(module.describe, mockTdd.suite);
		assert.strictEqual(module.it, mockTdd.test);
	});
});
