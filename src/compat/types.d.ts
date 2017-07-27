export interface RequireCallback {
	(mod: any): void;
}

export interface AmdRequire {
	(mids: string[], callback: RequireCallback): void;
}
