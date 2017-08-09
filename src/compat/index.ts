/**
 * This is a port of intern3's 'intern' module.
 */

import Executor from 'intern/lib/executors/Executor';
import { AmdRequire, RequireCallback } from './types';

let args: any = null;
let executor: Executor | null = null;
let mode = 'runner';

const accessed: { [key: string]: any } = {};

export = {
	get args() {
		accessed.args = true;
		return args;
	},
	set args(value) {
		args = value;
	},

	get executor() {
		accessed.executor = true;
		return executor;
	},
	set executor(value) {
		executor = value;
	},

	get mode() {
		accessed.mode = true;
		return mode;
	},
	set mode(value) {
		mode = value;
	},

	get accessed(): { [key: string]: any; } {
		return Object.create(accessed);
	},

	load(id: string, _parentRequire: (mids: string[], callback: RequireCallback) => {}, callback: RequireCallback) {
		require([`./interfaces/${id}`], iface => {
			if (iface.default) {
				callback(iface.default);
			} else {
				callback(iface);
			}
		});
	},

	normalize(interfaceId: string) {
		return interfaceId;
	}
};

declare var require: AmdRequire;
