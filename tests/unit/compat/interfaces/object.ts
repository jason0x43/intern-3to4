import * as _object from 'src/compat/interfaces/object';

const { suite, test, before, afterEach, after } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

const MockModule = intern.getPlugin('mocking');

import * as sinon from 'sinon';

suite('compat/interfaces/object', () => {
	let mock: MockModule<typeof _object>;
	let module: typeof _object;
	let registerSuite: typeof _object.default;

	let mockObject: {
		default: sinon.SinonSpy;
	};

	let mockAspect: {
		on(object: any, property: string, handler: Function): void;
	};

	before(async () => {
		mock = new MockModule('src/compat/interfaces/object', require);

		mockObject = {
			default: mock.spy()
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

		mock.mockDependencies({
			'intern/lib/interfaces/object': mockObject,
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
		mockObject = null as any;
	});

	type AssertCall = (name: string, descriptor: any) => void;

	function baseAssertCall(name: string, matcher: sinon.SinonMatcher) {
		assert.isTrue(mockObject.default.calledOnce);
		assert.isTrue(mockObject.default.calledWith(name, matcher));
	}

	test('property handler', () => {
		const original = {
			name: 'foo',
			beforeEach() {},
			testFunc() {}
		};

		const handler = sinon.stub().returns(true);

		registerSuite(original, undefined, handler);

		baseAssertCall('foo', sinon.match.object);
		assert.deepEqual(mockObject.default.firstCall.args[1], {
			tests: {}
		});
		assert.isTrue(handler.calledTwice);
	});

	addTests('object argument', (object) => registerSuite(object), (name, descriptor) => {
		baseAssertCall(name, sinon.match.object);
		assert.deepEqual(mockObject.default.firstCall.args[1], descriptor);
	});
	addTests('function argument', (object) => registerSuite(() => object), (name, descriptor) => {
		baseAssertCall(name, sinon.match.func);
		assert.deepEqual(mockObject.default.firstCall.args[1](), descriptor);
	});

	function addTests(name: string, registerSuite: typeof _object.default, assertCall: AssertCall) {
		suite(name, () => {
			test('no lifecycle functions or timeout', () => {
				const original = {
					name: 'foo',

					bar() {}
				};
				registerSuite(original);

				assertCall('foo', {
					bar: original.bar
				});
			});

			test('timeout', () => {
				const original = {
					name: 'foo',
					timeout: 200,

					bar() {}
				};
				registerSuite(original);

				assertCall('foo', {
					timeout: 200,
					tests: {
						bar: original.bar
					}
				});
			});

			test('lifecycle functions', () => {
				const original = {
					name: 'foo lifecycle',

					setup() {},
					before() {},
					beforeEach() {},
					afterEach() {},
					after() {},
					teardown() {},

					bar() {}
				};
				registerSuite(original);

				assertCall('foo lifecycle', {
					before: [
						original.setup,
						original.before
					],
					beforeEach: original.beforeEach,
					afterEach: original.afterEach,
					after: [
						original.after,
						original.teardown
					],
					tests: {
						bar: original.bar
					}
				});
			});

			suite('nested', () => {
				test('no lifecycle functions or timeout', () => {
					const original = {
						name: 'foo',

						bar: {
							baz() {},
							blah() {}
						}
					};
					registerSuite(original);

					assertCall('foo', {
						bar: {
							baz: original.bar.baz,
							blah: original.bar.blah
						}
					});
				});

				suite('timeout', () => {
					test('top-level', () => {
						const original = {
							name: 'foo',
							timeout: 200,

							bar: {
								baz() {},
								blah() {}
							}
						};
						registerSuite(original);

						assertCall('foo', {
							timeout: 200,
							tests: {
								bar: {
									baz: original.bar.baz,
									blah: original.bar.blah
								}
							}
						});
					});

					test('sub-suite-level', () => {
						const original = {
							name: 'foo',

							bar: {
								timeout: 200,
								baz() {},
								blah() {}
							}
						};
						registerSuite(original);

						assertCall('foo', {
							bar: {
								timeout: 200,
								tests: {
									baz: original.bar.baz,
									blah: original.bar.blah
								}
							}
						});
					});

					test('top-level and sub-suite-level', () => {
						const original = {
							name: 'foo',
							timeout: 200,

							bar: {
								timeout: 300,

								baz() {},
								blah() {}
							}
						};
						registerSuite(original);

						assertCall('foo', {
							timeout: 200,
							tests: {
								bar: {
									timeout: 300,

									tests: {
										baz: original.bar.baz,
										blah: original.bar.blah
									}
								}
							}
						});
					});
				});

				suite('lifecycle functions', () => {
					test('top-level', () => {
						const original = {
							name: 'foo',

							setup() {},
							before() {},
							beforeEach() {},
							afterEach() {},
							after() {},
							teardown() {},

							bar: {
								baz() {},
								blah() {}
							}
						};
						registerSuite(original);

						assertCall('foo', {
							before: [
								original.setup,
								original.before
							],
							beforeEach: original.beforeEach,
							afterEach: original.afterEach,
							after: [
								original.after,
								original.teardown
							],

							tests: {
								bar: {
									baz: original.bar.baz,
									blah: original.bar.blah
								}
							}
						});
					});

					test('sub-suite-level', () => {
						const original = {
							name: 'foo',

							bar: {
								setup() {},
								before() {},
								beforeEach() {},
								afterEach() {},
								after() {},
								teardown() {},

								baz() {},
								blah() {}
							}
						};
						registerSuite(original);

						assertCall('foo', {
							bar: {
								before: [
									original.bar.setup,
									original.bar.before
								],
								beforeEach: original.bar.beforeEach,
								afterEach: original.bar.afterEach,
								after: [
									original.bar.after,
									original.bar.teardown
								],

								tests: {
									baz: original.bar.baz,
									blah: original.bar.blah
								}
							}
						});
					});

					test('top-level and sub-suite-level', () => {
						const original = {
							name: 'foo',

							setup() {},
							before() {},
							beforeEach() {},
							afterEach() {},
							after() {},
							teardown() {},

							bar: {
								setup() {},
								before() {},
								beforeEach() {},
								afterEach() {},
								after() {},
								teardown() {},

								baz() {},
								blah() {}
							}
						};
						registerSuite(original);

						assertCall('foo', {
							before: [
								original.setup,
								original.before
							],
							beforeEach: original.beforeEach,
							afterEach: original.afterEach,
							after: [
								original.after,
								original.teardown
							],

							tests: {
								bar: {
									before: [
										original.bar.setup,
										original.bar.before
									],
									beforeEach: original.bar.beforeEach,
									afterEach: original.bar.afterEach,
									after: [
										original.bar.after,
										original.bar.teardown
									],

									tests: {
										baz: original.bar.baz,
										blah: original.bar.blah
									}
								}
							}
						});
					});
				});
			});
		});
	}
});
