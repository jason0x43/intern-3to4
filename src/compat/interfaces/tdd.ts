import * as tdd from 'intern/lib/interfaces/tdd';
import Test from 'intern/lib/Test';
import Suite from 'intern/lib/Suite';

export type SuiteFactory = (this: Suite) => void;
export type SuiteLifecycleFunction = (this: Suite) => (PromiseLike<any> | void);
export type TestLifecycleFunction = (this: Suite, test: Test) => (PromiseLike<any> | void);
export type TestFunction = (this: Test) => (PromiseLike<any> | void);

export function after(factory: SuiteLifecycleFunction) {
	return tdd.after(suite => {
		return factory.call(suite);
	});
}

export function afterEach(factory: TestLifecycleFunction) {
	return tdd.afterEach(((test: Test, suite: Suite)  => {
		return factory.call(suite, test);
	}) as any);
}

export function before(factory: SuiteLifecycleFunction) {
	return tdd.before(suite => {
		return factory.call(suite);
	});
}

export function beforeEach(factory: TestLifecycleFunction) {
	return tdd.beforeEach(((test: Test, suite: Suite)  => {
		return factory.call(suite, test);
	}) as any);
}

export function suite(name: string, factory: SuiteFactory) {
	return tdd.suite(name, suite => {
		factory.call(suite);
	});
}

export function test(name: string, factory: TestFunction) {
	return tdd.test(name, test => {
		return factory.call(test);
	});
}
