import * as chai from 'chai';
import { RequireCallback } from './types';

chai.config.includeStack = true;

export function load(id: string, _parentRequire: any, callback: RequireCallback) {
	if (!id) {
		callback(chai);
		return;
	}

	const _chai = <any>chai;

	if (!_chai[id]) {
		throw new Error('Invalid chai interface "' + id + '"');
	}

	if (!_chai[id].AssertionError) {
		_chai[id].AssertionError = chai.AssertionError;
	}

	callback(_chai[id]);
}

export function normalize(id: string) {
	return id;
}
