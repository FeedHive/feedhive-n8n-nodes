import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { operationProperties, postFilters, resources } from './resources/operations';

export class Feedhive implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FeedHive', name: 'feedhive',
		icon: { light: 'file:feedhive.svg', dark: 'file:feedhive.dark.svg' },
		group: ['transform'], version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with the supported FeedHive Public REST API',
		usableAsTool: true,
		defaults: { name: 'FeedHive' },
		inputs: [NodeConnectionTypes.Main], outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'feedhiveApi', required: true }],
		requestDefaults: {
			baseURL: 'https://api.feedhive.com',
			headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
		},
		properties: [
			{ displayName: 'Resource', name: 'resource', type: 'options', noDataExpression: true,
				options: resources.map(({ name, value }) => ({ name, value })), default: 'post' },
			...operationProperties, ...postFilters,
		],
	};
}
