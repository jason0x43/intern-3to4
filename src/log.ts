export interface Message {
	time: Date;
	type: string;
	data: any;
}

export interface DeprecationMessage {
	property: string;
	message: string;
}

export const messages: Message[] = [];

export default function log(type: string, data: any) {
	messages.push({ time: new Date(), type, data });
}
