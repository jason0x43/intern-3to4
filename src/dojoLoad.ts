import * as loader from 'dojo/loader';
import { assign } from '@dojo/core/lang';
import Promise from '@dojo/shim/Promise';

export interface DojoLoad extends loader.IRootRequireMethods {
	<V>(mid: string): Promise<V>;
}

const dojoLoad: DojoLoad = function dojoLoad<V>(mid: string): Promise<V> {
	return new Promise<V>(resolve => {
		loader([mid], mod => {
			resolve(mod);
		});
	});
} as any;

assign(dojoLoad, loader);

export default dojoLoad;
