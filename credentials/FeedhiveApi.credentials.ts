import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties } from 'n8n-workflow';

export class FeedhiveApi implements ICredentialType {
	name = 'feedhiveApi';
	displayName = 'FeedHive API';
	icon = 'file:../nodes/Feedhive/feedhive.svg' as const;
	documentationUrl = 'https://docs.feedhive.com/rest-api/get-started';
	properties: INodeProperties[] = [{
		displayName: 'API Key', name: 'apiKey', type: 'string',
		typeOptions: { password: true }, required: true, default: '',
	}];
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
	};
	test: ICredentialTestRequest = {
		request: { baseURL: 'https://api.feedhive.com', url: '/status', method: 'GET' },
	};
}
