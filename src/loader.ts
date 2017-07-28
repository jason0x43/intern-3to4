intern.registerLoader(options => {
	const globalObj: any = typeof window !== 'undefined' ? window : global;

	options.baseUrl = options.baseUrl || intern.config.basePath;
	if (!('async' in options)) {
		options.async = true;
	}

	intern.log('Using 3to4 loader');

	return intern.loadScript('node_modules/dojo/loader.js').then(() => {
		const require = globalObj.require;

		intern.log('Configuring 3to4 loader with:', options);
		require(options);

		return (modules: string[]) => {
			return new Promise<void>(resolve => {
				intern.log('Loading modules:', modules);
				require(modules, () => { resolve(); });
			});
		};
	});
});
