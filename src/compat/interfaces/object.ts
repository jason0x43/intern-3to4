import _registerSuite from 'intern/lib/interfaces/object';

export default function registerSuite(oldDescriptor: { [key: string]: any }) {
	const name = oldDescriptor.name;
	const descriptor: { [key: string]: any } = {};
	let tests = descriptor;

	// Valid suite properties are everything but 'name', which is passed
	// directly to regsiterSuite
	const properties = Object.keys(oldDescriptor).filter(
		prop => prop !== 'name'
	);

	// If there are lifecycle properties, we need a 'tests' property
	// TODO: This is going to be needed for sub-suites, too
	if (properties.some(prop => Boolean(lifecycleProperties[prop]))) {
		descriptor.tests = tests = {};
	}

	properties.forEach(prop => {
		const value = oldDescriptor[prop];
		if (lifecycleProperties[prop]) {
			descriptor[prop] = value;
		} else {
			tests[prop] = value;
		}
	});

	return _registerSuite(name, descriptor);
}

const lifecycleProperties: { [key: string]: string } = {
	before: 'before',
	beforeEach: 'beforeEach',
	after: 'after',
	afterEach: 'afterEach',
	setup: 'before',
	teardown: 'after'
};
