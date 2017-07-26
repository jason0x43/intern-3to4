// tslint:disable:interface-name
declare module 'dojo/loader' {
	export interface IConfig {
		baseUrl?: string;
		map?: IModuleMap;
		packages?: IPackage[];
		paths?: {
			[path: string]: string;
		};
	}
	export interface IDefine {
		(moduleId: string, dependencies: string[], factory: IFactory): void;
		(dependencies: string[], factory: IFactory): void;
		(factory: IFactory): void;
		(value: any): void;
	}
	export interface IFactory {
		(...modules: any[]): any;
	}
	export interface ILoaderPlugin {
		dynamic?: boolean;
		load?: (
			resourceId: string,
			require: IRequire,
			load: (value?: any) => void,
			config?: Object
		) => void;
		normalize?: (
			moduleId: string,
			normalize: (moduleId: string) => string
		) => string;
	}
	export interface IMapItem extends Array<any> {
		0: string;
		1: any;
		2: RegExp;
		3: number;
	}
	export interface IMapReplacement extends IMapItem {
		1: string;
	}
	export interface IMapRoot extends Array<IMapSource> {
		star?: IMapSource;
	}
	export interface IMapSource extends IMapItem {
		1: IMapReplacement[];
	}
	export interface IModule extends ILoaderPlugin {
		cjs: {
			exports: any;
			id: string;
			setExports: (exports: any) => void;
			uri: string;
		};
		def: IFactory;
		deps: IModule[];
		executed: any;
		injected: boolean;
		fix?: (module: IModule) => void;
		gc: boolean;
		mid: string;
		pack: IPackage;
		req: IRequire;
		require?: IRequire;
		result: any;
		url: string;
		loadQ?: IModule[];
		plugin?: IModule;
		prid: string;
	}
	export interface IModuleMap extends IModuleMapItem {
		[sourceMid: string]: IModuleMapReplacement;
	}
	export interface IModuleMapItem {
		[mid: string]: any;
	}
	export interface IModuleMapReplacement extends IModuleMapItem {
		[findMid: string]: string;
	}
	export interface IPackage {
		location?: string;
		main?: string;
		name?: string;
	}
	export interface IPackageMap {
		[packageId: string]: IPackage;
	}
	export interface IPathMap extends IMapReplacement {}
	export interface IRequire {
		(
			config: IConfig,
			dependencies?: string[],
			callback?: IRequireCallback
		): void;
		(dependencies: string[], callback: IRequireCallback): void;
		<ModuleType>(moduleId: string): ModuleType;
		toAbsMid(moduleId: string): string;
		toUrl(path: string): string;
	}
	export interface IRequireCallback {
		(...modules: any[]): void;
	}
}
