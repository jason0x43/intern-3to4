import _registerSuite, { ObjectSuiteDescriptor, ObjectSuiteFactory, Tests } from 'intern/lib/interfaces/object';
import { on } from '@dojo/core/aspect';

export interface OldSuiteDescriptor {
	[key: string]: any;

	name: string;
	timeout?: number;
	setup?(): Promise<any> | void;
	before?(): Promise<any> | void;
	beforeEach?(): Promise<any> | void;
	afterEach?(): Promise<any> | void;
	after?(): Promise<any> | void;
	teardown?(): Promise<any> | void;
}

export interface OldSuiteFactory {
	(): OldSuiteDescriptor;
}

function isOldSuiteFactory(value: any): value is OldSuiteFactory {
	return typeof value === 'function';
}

function defaultPropertyHandler(property: string, value: any, suite: ObjectSuiteDescriptor): boolean {
	if (lifecycleProperties[property]) {
		on(suite, lifecycleProperties[property], value);
		return true;
	}
	return false;
}

function transform(descriptor: OldSuiteDescriptor, propertyHandler?: PropertyHandler): ObjectSuiteDescriptor | Tests {
	const result = {} as (ObjectSuiteDescriptor | Tests);

	let suite = result as ObjectSuiteDescriptor;
	let tests = result as Tests;

	// Valid suite properties are everything but 'name', which is passed
	// directly to regsiterSuite
	const properties = Object.keys(descriptor).filter(
		prop => prop !== 'name' && prop !== 'timeout'
	);

	// If there are lifecycle properties, we need a 'tests' property
	if (properties.some(prop => Boolean(lifecycleProperties[prop])) || ('timeout' in descriptor)) {
		suite.tests = tests = {};
	}

	properties.forEach(prop => {
		const value = descriptor[prop];
		let handled: any = propertyHandler && propertyHandler(prop, value, suite);

		if (!handled) {
			handled = defaultPropertyHandler(prop, value, suite);
		}

		if (!handled) {
			if (typeof value === 'object') {
				const newDescriptor = transform(value);
				tests[value.name || prop] = newDescriptor;
				return true;
			}
			else {
				tests[prop] = value;
			}
		}
	});

	if ('timeout' in descriptor) {
		suite.timeout = descriptor.timeout;
	}

	return result;
}

export type PropertyHandler = (
	property: string,
	value: any,
	suiteDescriptor: ObjectSuiteDescriptor
) => boolean;

export default function registerSuite(
	suite: OldSuiteDescriptor | OldSuiteFactory,
	registerSuite = _registerSuite,
	propertyHandler?: PropertyHandler
) {
	let name: string;
	let transformed: ObjectSuiteDescriptor | ObjectSuiteFactory | Tests;

	if (isOldSuiteFactory(suite)) {
		name = suite().name;
		transformed = () => transform(suite(), propertyHandler);
	}
	else {
		name = suite.name;
		transformed = transform(suite, propertyHandler);
	}

	return registerSuite(name, transformed);
}

const lifecycleProperties: { [key: string]: string } = {
	before: 'before',
	beforeEach: 'beforeEach',
	after: 'after',
	afterEach: 'afterEach',
	setup: 'before',
	teardown: 'after'
};
