import * as _tdd from 'src/compat/interfaces/tdd';

const { suite, test, before, after, afterEach } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

const MockModule = intern.getPlugin('mocking');

import { SinonStub, SinonSpy } from 'sinon';

suite('compat/interfaces/tdd', () => {
	let mock: MockModule<typeof _tdd>;
	let module: typeof _tdd;

	const mockSuite = {};
	const mockTest = {};

	let mockTdd: {
		after: SinonStub;
		afterEach: SinonStub;
		before: SinonStub;
		beforeEach: SinonStub;
		suite: SinonStub;
		test: SinonStub;
	};

	let factorySpy: SinonSpy;

	before(async () => {
		mock = new MockModule('src/compat/interfaces/tdd', require);

		mockTdd = {
			after: mock.stub().callsArgWith(0, mockSuite),
			afterEach: mock.stub().callsArgWith(0, mockTest, mockSuite),
			before: mock.stub().callsArgWith(0, mockSuite),
			beforeEach: mock.stub().callsArgWith(0, mockTest, mockSuite),
			suite: mock.stub().callsArgWith(1, mockSuite),
			test: mock.stub().callsArgWith(1, mockTest)
		};

		factorySpy = mock.spy();

		mock.mockDependencies({
			'intern/lib/interfaces/tdd': mockTdd
		});

		module = await mock.getModuleUnderTest();
	});

	afterEach(() => {
		mock.resetHistory();
	});

	after(() => {
		mock.destroy();
	});

	function addTest(name: keyof typeof _tdd, callArgs: () => any[], testFunction: () => void) {
		test(`.${name}`, () => {
			(module as any)[name](...callArgs());

			assert.isTrue(factorySpy.calledOnce);
			assert.isTrue(mockTdd[name].calledOnce);

			testFunction();
		});
	}

	function suiteLifecycle(name: 'before' | 'after') {
		addTest(name, () => [ factorySpy ], () => {
			assert.isTrue(factorySpy.firstCall.calledOn(mockSuite));
		});
	}

	function testLifecycle(name: 'beforeEach' | 'afterEach') {
		addTest(name, () => [ factorySpy ], () => {
			assert.isTrue(factorySpy.firstCall.calledOn(mockSuite));
			assert.isTrue(factorySpy.firstCall.calledWithExactly(mockTest));
		});
	}

	function testNamed(name: 'suite' | 'test', testName: string) {
		addTest(name, () => [ testName, factorySpy ], () => {
			assert.strictEqual(mockTdd[name].firstCall.args[0], testName);
			assert.isTrue(factorySpy.firstCall.calledOn(name === 'suite' ? mockSuite : mockTest));
		});
	}

	suiteLifecycle('before');
	testLifecycle('beforeEach');
	suiteLifecycle('after');
	testLifecycle('afterEach');
	testNamed('suite', 'foo suite');
	testNamed('test', 'foo test');
});
