import * as _log from 'src/log';

const { suite, test, beforeEach, afterEach } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

const MockModule = intern.getPlugin('mocking');

import { spy } from 'sinon';

suite('log', () => {
	let mock: MockModule<typeof _log>;
	let module: typeof _log;
	let log: typeof _log.default;

	beforeEach(async () => {
		mock = new MockModule('src/log', require);
		mock.mockDependencies();

		module = await mock.getModuleUnderTest();
		log = module.default;
	});

	afterEach(() => {
		mock.destroy();
	});

	test('module interface', () => {
		assert.isFunction(log);
		assert.isFunction(module.disabled);
		assert.isFunction(module.hasMessages);
		assert.isFunction(module.forEachMessage);
	});

	test('log', () => {
		log('deprecated',  {
			property: 'foo',
			message: 'bar'
		});

		assert.strictEqual(module.messageCount(), 1);

		log('deprecated',  {
			property: 'foo',
			message: 'bar'
		});

		assert.strictEqual(module.messageCount(), 2);
	});

	test('messageCount', () => {
		log('deprecated',  {
			property: 'foo',
			message: 'bar'
		});

		assert.strictEqual(module.messageCount('deprecated'), 1);
		assert.strictEqual(module.messageCount('error'), 0);
	});

	test('disabled', () => {
		assert.isFalse(module.disabled());

		assert.isTrue(module.disabled(true));
		assert.isTrue(module.disabled());

		log('deprecated',  {
			property: 'foo',
			message: 'bar'
		});

		assert.strictEqual(module.messageCount(), 0);

		assert.isFalse(module.disabled(false));
		assert.isFalse(module.disabled());

		log('deprecated',  {
			property: 'foo',
			message: 'bar'
		});

		assert.strictEqual(module.messageCount(), 1);
	});

	test('hasMessages', () => {
		assert.isFalse(module.hasMessages());
		assert.isFalse(module.hasMessages('deprecated'));

		log('deprecated', {
			property: 'foo',
			message: 'bar'
		});

		assert.isTrue(module.hasMessages());
		assert.isTrue(module.hasMessages('deprecated'));
		assert.isFalse(module.hasMessages('error'));
	});

	test('forEachMessage', () => {
		const deprecatedSpy = spy();
		const errorSpy = spy();

		module.forEachMessage('deprecated', deprecatedSpy);
		module.forEachMessage('error', errorSpy);

		assert.isFalse(deprecatedSpy.called);
		assert.isFalse(errorSpy.called);

		deprecatedSpy.reset();
		errorSpy.reset();

		log('deprecated', {
			property: 'foo',
			message: 'bar'
		});

		module.forEachMessage('deprecated', deprecatedSpy);
		module.forEachMessage('error', errorSpy);

		assert.isTrue(deprecatedSpy.calledOnce);
		assert.isFalse(errorSpy.called);
	});
});
