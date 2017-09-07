import _benchmark from 'intern/lib/interfaces/benchmark';
import BenchmarkTest from 'intern/lib/BenchmarkTest';

import registerSuite, { OldSuiteDescriptor as OldObjectSuiteDescriptor } from './object';
import { on } from '@dojo/core/aspect';

export interface OldSuiteDescriptor extends OldObjectSuiteDescriptor {
	afterEachLoop?(): Promise<any> | void;
	beforeEachLoop?(): Promise<any> | void;
}

export interface OldSuiteFactory {
	(): OldSuiteDescriptor;
}

export interface BenchmarkInterface {
	(descriptor: OldObjectSuiteDescriptor | OldSuiteFactory): void;
	async: typeof BenchmarkTest.async;
	skip: (testFunc: Function) => ((test: BenchmarkTest) => void);
}

const benchmark: BenchmarkInterface = function benchmark(descriptor: OldSuiteDescriptor | OldSuiteFactory) {
	registerSuite(descriptor, _benchmark, (property, value, suite) => {
		if (property === 'beforeEachLoop' || property === 'afterEachLoop') {
			on(suite, property, value);
			return true;
		}
		return false;
	});
} as any;

benchmark.async = BenchmarkTest.async;
benchmark.skip = (_testFunc: Function) => {
	return (test: BenchmarkTest) => {
		test.skip();
	};
};

export default benchmark;
