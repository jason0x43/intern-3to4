#!/usr/bin/env node

import { createWriteStream } from 'fs';
import { red, yellow } from 'chalk';
import * as wrapAnsi from 'wrap-ansi';
import { basename, join } from 'path';
import * as loader from 'dojo/loader';
const Intern = require('./compat/index');

import convert from './convert';
import log, { forEachMessage, hasMessages } from './log';
import dojoLoad from './dojoLoad';

const args = process.argv.slice(2);

if (args.length < 1) {
	console.log(
		`usage: ${basename(process.argv[1])} CONFIG.JS [ OUTPUT.JSON ]`
	);
	process.exit(1);
}

const cwd = process.cwd();
const dojoLoader = loader;
const internConfig = {
	baseUrl: cwd.replace(/\\/g, '/'),
	packages: [
		{
			name: 'intern',
			location: join(__dirname, 'compat'),
			main: 'index.js'
		}
	],
	map: {
		intern: {
			dojo: 'node_modules/dojo',
			chai: 'node_modules/chai/chai',
			diff: 'node_modules/diff/diff',
			// benchmark requires lodash and platform
			benchmark: 'node_modules/benchmark/benchmark',
			lodash: 'node_modules/lodash-amd/main',
			platform: 'node_modules/platform/platform'
		},
		'*': {
			'intern/dojo': 'node_modules/dojo'
		}
	}
};

let stdout: NodeJS.WritableStream = process.stdout;
if (args.length > 1) {
	stdout = createWriteStream(args[1], { flags: 'w' });
}

let stderr: NodeJS.WritableStream = process.stderr;
let columns = (<any>process.stderr).columns;
if (args.length > 2) {
	stderr = createWriteStream(args[2], { flags: 'w+' });
	columns = undefined;
}

dojoLoader(internConfig);

(async () => {
	try {
		const intern = await dojoLoad<typeof Intern>('intern');
		intern.mode = 'runner';
		const mid = dojoLoader.toAbsMid(args[0]);
		const config = await convert(mid, cwd);
		const configString = JSON.stringify(config, null, '    ');
		stdout.write(`${configString}\n`);

		const accessed = intern.accessed;
		if (accessed.mode) {
			log(
				'warning',
				"The config is using 'mode' from Intern main module. If this is " +
				'being used for environment-specific, please see the following ' +
				'page for alternatives: ' +
				'https://github.com/theintern/intern/blob/master/docs/configuration.md#environment-specific-config'
			);
		}

		['args', 'executor'].forEach(key => {
			if (accessed[key]) {
				log(
					'warning',
					`Config is using '${key}' from Intern main module.`
				);
			}
		});
	} catch (error) {
		log('error', error);
	}

	forEachMessage('warning', message => {
		print(`${yellow('WARNING')} ${message}\n`);
	});

	forEachMessage('deprecated', message => {
		print(
			`${yellow(
				'WARNING'
			)} The property '${message.property}' is deprecated. ` +
			`${message.message || ''}\n`
		);
	});

	forEachMessage('unsupportedProperty', message => {
		print(
			`${yellow(
				'WARNING'
			)} The property '${message}' is unknown.\n`
		);
	});

	if (hasMessages('legacyReporter')) {
		print(
			`${yellow(
				'WARNING'
			)} The following legacy reporters should be rewritten ` +
				"as Intern 4 reporters and loaded using the 'plugins' config property. See " +
				'https://github.com/theintern/intern/blob/master/docs/extending.md#reporters.\n'
		);

		forEachMessage('legacyReporter', message => {
			print(`  * ${message}\n`);
		});
	}

	forEachMessage('error', error => {
		print(`${red('ERROR')} ${error}\n`);
		if (error instanceof Error && error.stack) {
			error.stack.split('\n').slice(1).forEach(line => {
				print(`${line}\n`);
			});
		}
	});

	if (stdout !== process.stdout) {
		stdout.end();
	}

	if (stderr !== process.stderr) {
		stderr.end();
	}
})();

function print(text: string) {
	if (columns) {
		text = wrapAnsi(text, Math.min(80, columns - 10), <any>{ trim: false });
	}
	stderr.write(text);
}
