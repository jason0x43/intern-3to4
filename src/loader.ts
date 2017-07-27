intern.registerLoader(options => {
	const globalObj: any = typeof window !== 'undefined' ? window : global;

	options.baseUrl = options.baseUrl || intern.config.basePath;
	if (!('async' in options)) {
		options.async = true;
	}

	return intern.loadScript('node_modules/dojo/loader.js').then(() => {
		const require = globalObj.require;
		intern.log('Using Dojo loader');

		intern.log('Configuring Dojo loader with:', options);
		require(options);

		return (modules: string[]) => {
			return new Promise<void>(resolve => {
				intern.log('Loading modules:', modules);
				require(modules, () => { resolve(); });
			});
		};
	});
});
