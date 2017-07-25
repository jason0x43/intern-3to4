import { createWriteStream } from 'fs';
import { red, yellow } from 'chalk';
import * as loader from 'dojo/loader';
import convertConfig from './config';
import log, { messages, DeprecationMessage } from './log';
import * as wrapAnsi from 'wrap-ansi';

const args = process.argv.slice(2);

if (args.length < 1) {
	console.log(`usage: convert.js CONFIG.JS [ OUTPUT.JSON ]`);
	process.exit(1);
}

const dojoLoader: loader.IRequire = <any>loader;
const internConfig = {
	baseUrl: process.cwd().replace(/\\/g, '/'),
	packages: [{ name: 'intern', location: 'node_modules/intern' }],
	map: {
		intern: {
			dojo: 'intern/browser_modules/dojo',
			chai: 'intern/browser_modules/chai/chai',
			diff: 'intern/browser_modules/diff/diff',
			// benchmark requires lodash and platform
			benchmark: 'intern/browser_modules/benchmark/benchmark',
			lodash: 'intern/browser_modules/lodash-amd/main',
			platform: 'intern/browser_modules/platform/platform'
		},
		'*': {
			'intern/dojo': 'intern/browser_modules/dojo'
		}
	}
};

let stdout = process.stdout;
if (args.length > 1) {
	stdout = createWriteStream(args[1], { flags: 'w' });
}

let stderr = process.stderr;
let columns = (<any>process.stderr).columns;
if (args.length > 2) {
	stderr = createWriteStream(args[2], { flags: 'w+' });
	columns = undefined;
}

dojoLoader(internConfig);

(async () => {
	try {
		const config = await convertConfig(dojoLoader, args[0]);
		const configString = JSON.stringify(config, null, '    ');
		stdout.write(`${configString}\n`);
	} catch (error) {
		log('error', error);
	}

	writeText(
		messages
			.filter(message => message.type === 'warning')
			.map(message => message.data)
			.reduce((text: string, message: string) => {
				return text + `${message}\n`;
			}, '')
	);

	writeText(
		messages
			.filter(message => message.type === 'deprecated')
			.reduce((text: string, message: any) => {
				const info = <DeprecationMessage>message.data;
				text += `[${message.time.toISOString()}] `;
				text += `${yellow(
					'WARNING'
				)} The property '${info.property}' is deprecated. `;
				if (info.message) {
					text += info.message;
				}
				return `${text}\n`;
			}, '')
	);

	writeText(
		messages
			.filter(message => message.type === 'unsupportedProperty')
			.reduce((text: string, message: any) => {
				text += `[${message.time.toISOString()}] `;
				text += `${yellow(
					'WARNING'
				)} The property '${message.data}' is unknown.\n`;
				return text;
			}, '')
	);

	const legacyReporters = messages.filter(
		message => message.type === 'legacyReporter'
	);
	if (legacyReporters.length > 0) {
		writeText(
			`[${legacyReporters[0].time.toISOString()}] ` +
				`${yellow(
					'WARNING'
				)} The following legacy reporters should be rewritten ` +
				`as Intern 4 reporters and loaded loaded using the 'plugins' config property. See ` +
				'https://github.com/theintern/intern/blob/master/docs/extending.md#reporters.\n'
		);
		legacyReporters.forEach(reporter => {
			writeText(`  * ${reporter.data}\n`);
		});
	}

	writeText(
		messages
			.filter(message => message.type === 'error')
			.reduce((text: string, message: any) => {
				const error = message.data;
				text += `[${message.time.toISOString()}] `;
				text += `${red('ERROR')} ${error}`;
				if (error instanceof Error && error.stack) {
					error.stack.split('\n').slice(1).forEach(line => {
						text += `${line}\n`;
					});
				}
				return `${text}\n`;
			}, '')
	);

	if (stdout !== process.stdout) {
		stdout.end();
	}

	if (stderr !== process.stderr) {
		stderr.end();
	}
})();

function writeText(text: string) {
	if (columns) {
		text = wrapAnsi(text, Math.min(80, columns - 4), <any>{ trim: false });
	}
	stderr.write(text);
}
