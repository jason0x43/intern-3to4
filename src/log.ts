export interface DeprecationMessage {
	property: string;
	message: string;
}

export interface LogTypes {
	deprecated: DeprecationMessage;
	error: string | Error;
	legacyReporter: string;
	unsupportedProperty: string;
	warning: string;
}

interface Message {
	time: Date;
	type: keyof LogTypes;
	data: any;
}

const messages: Message[] = [];
let logDisabled = false;

export function disabled(value?: boolean) {
	if (value !== undefined) {
		logDisabled = Boolean(value);
	}
	return logDisabled;
}

export default function log<K extends keyof LogTypes>(type: K, data: LogTypes[K]) {
	if (!logDisabled) {
		messages.push({ time: new Date(), type, data });
	}
}

export function messageCount(type?: keyof LogTypes) {
	if (typeof type !== 'string') {
		return messages.length;
	}
	return messages.filter(message => message.type === type).length;
}

export function hasMessages(type?: keyof LogTypes) {
	if (typeof type !== 'string') {
		return Boolean(messages.length);
	}
	return Boolean(messages.find(message => message.type === type));
}

export function forEachMessage<K extends keyof LogTypes>(type: K, callback: (data: LogTypes[K]) => void) {
	messages.forEach(message => {
		if (message.type === type) {
			callback(message.data);
		}
	});
}
