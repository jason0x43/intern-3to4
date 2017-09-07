const { suite, test, before, beforeEach, afterEach, after } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');

import { createContext, runInContext } from 'vm';
import { readFileSync } from 'fs';
import * as sinon from 'sinon';

suite('loader', () => {
	let sandbox: sinon.SinonSandbox;
	let context: {
		[key: string]: any;
		intern: {
			config?: {
				basePath: string;
			};
			registerLoader: sinon.SinonStub;
			log: sinon.SinonSpy;
			loadScript: sinon.SinonStub;
		};
		Promise: typeof Promise;
		global?: {
			require: sinon.SinonStub;
		};
		window?: {
			require: sinon.SinonStub;
		};
		'__coverage__': any;
	};

	before(() => {
		sandbox = sinon.sandbox.create();
	});

	beforeEach(() => {
		context = {
			intern: {
				config: {
					basePath: '/ham/spam'
				},
				registerLoader: sandbox.stub(),
				log: sandbox.spy(),
				loadScript: sandbox.stub()
			},
			Promise: Promise,
			'__coverage__': (global as any).__coverage__
		};
		createContext(context);
	});

	afterEach(() => {
		sandbox.reset();
	});

	after(() => {
		sandbox = context = null as any;
	});

	function addTest(name: string, options: any, globalName: string) {
		test(name, async (test) => {
			const requireStub = sandbox.stub();
			context[globalName] = {
				require: requireStub
			};

			const filename = require.resolve('src/loader');
			let code = readFileSync(filename, 'utf8');

			if ((test.executor as any).hasCoveredFiles) {
				code = (test.executor as any).instrumentCode(code, filename);
			}

			const loadScriptResult = Promise.resolve(undefined);
			context.intern.loadScript.returns(loadScriptResult);

			runInContext(code, context);

			assert.isTrue(context.intern.registerLoader.calledOnce);

			const optionsCopy = Object.assign({}, options);
			const injector = await context.intern.registerLoader.firstCall.args[0](options);

			assert.strictEqual(options.async, 'async' in optionsCopy ? optionsCopy.async : true);
			assert.strictEqual(options.baseUrl, 'baseUrl' in optionsCopy ? optionsCopy.baseUrl : '/ham/spam');
			assert.isFunction(injector);
			assert.isTrue(context.intern.log.calledTwice);
			assert.isTrue(requireStub.calledOnce);
			assert.isTrue(requireStub.alwaysCalledWithExactly(options));

			sandbox.resetHistory();

			const result = injector([ 'one', 'two', 'three' ]);
			requireStub.firstCall.args[1]();

			await result;

			assert.isTrue(context.intern.log.calledOnce);
			assert.isTrue(requireStub.calledOnce);
			assert.isTrue(requireStub.calledWith([ 'one', 'two', 'three' ], sinon.match.func));
		});
	}

	addTest('no async or baseUrl', {}, 'window');

	addTest('async and baseUrl', {
		async: false,
		baseUrl: '/foo/bar/baz'
	}, 'global');
});
