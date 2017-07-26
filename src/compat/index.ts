import Executor from 'intern/lib/executors/Executor';

export interface RequireCallback {
	(mod: any): void;
}

/**
 * The arguments Intern was started with, post-processing (e.g.,
 * repeated arguments are converted to arrays).
 */
export let args: any;

/**
 * The executor for the current test run.
 */
export let executor: Executor;

/**
 * AMD plugin API interface for easy loading of test interfaces.
 */
export function load(id: string, _parentRequire: (mids: string[], callback: RequireCallback) => {}, callback: RequireCallback) {
	require([ 'intern/lib/interfaces/' + id ], callback);
}

export function normalize(interfaceId: string) {
	// The loader should not attempt to normalize values passed to the
	// loader plugin as module IDs, since they are not module IDs.
	return interfaceId;
}

/**
 * The planned execution mode. One of 'client', 'runner', or 'custom'.
 */
export let mode: string;

interface AmdRequire {
	(mids: string[], callback: RequireCallback): void;
}

declare var require: AmdRequire;
