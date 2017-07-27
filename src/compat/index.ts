/**
 * This is a port of intern3's 'intern' module.
 */

import Executor from 'intern/lib/executors/Executor';
import { AmdRequire, RequireCallback } from './types';

export let args: any;
export let executor: Executor;
export let mode: string;

export function load(id: string, _parentRequire: (mids: string[], callback: RequireCallback) => {}, callback: RequireCallback) {
	require([ './interfaces/' + id ], iface => {
		if (iface.default) {
			callback(iface.default);
		}
		else {
			callback(iface);
		}
	});
}

export function normalize(interfaceId: string) {
	return interfaceId;
}

declare var require: AmdRequire;
