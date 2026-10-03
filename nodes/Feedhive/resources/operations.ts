import type { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';
type Operation = { name: string; value: string; method: Method; path: string; description: string };
type Resource = { name: string; value: string; operations: Operation[] };

// These are the public REST endpoints, not FeedHive's private app API.
export const resources: Resource[] = [
	{ name: 'Account', value: 'account', operations: [
		{ name: 'Check Credentials', value: 'status', method: 'GET', path: '/status', description: 'Check the API key and account' },
	] },
	{ name: 'Post', value: 'post', operations: [
		{ name: 'Get Many', value: 'getMany', method: 'GET', path: '/posts', description: 'Get a page of posts' },
		{ name: 'Get', value: 'get', method: 'GET', path: '/posts/:id', description: 'Get a post' },
		{ name: 'Create', value: 'create', method: 'POST', path: '/posts', description: 'Create a draft or scheduled post' },
		{ name: 'Update', value: 'update', method: 'PATCH', path: '/posts/:id', description: 'Update a post (fields sent replace their current value)' },
		{ name: 'Delete', value: 'delete', method: 'DELETE', path: '/posts/:id', description: 'Permanently delete a post' },
	] },
	{ name: 'Label', value: 'label', operations: [
		{ name: 'Get Many', value: 'getMany', method: 'GET', path: '/labels', description: 'Get a page of labels' },
		{ name: 'Get', value: 'get', method: 'GET', path: '/labels/:id', description: 'Get a label' },
		{ name: 'Create', value: 'create', method: 'POST', path: '/labels', description: 'Create a label' },
		{ name: 'Update', value: 'update', method: 'PATCH', path: '/labels/:id', description: 'Rename a label' },
		{ name: 'Delete', value: 'delete', method: 'DELETE', path: '/labels/:id', description: 'Permanently delete a label' },
	] },
	{ name: 'Media', value: 'media', operations: [
		{ name: 'Get Many', value: 'getMany', method: 'GET', path: '/media', description: 'Get a page of media' },
		{ name: 'Get', value: 'get', method: 'GET', path: '/media/:id', description: 'Get a media record' },
		{ name: 'Start Upload', value: 'startUpload', method: 'POST', path: '/media/uploads', description: 'Create a signed upload session (does not upload the binary)' },
		{ name: 'Complete Upload', value: 'completeUpload', method: 'POST', path: '/media/uploads/:id/complete', description: 'Finalize a separately uploaded file' },
		{ name: 'Delete', value: 'delete', method: 'DELETE', path: '/media/:id', description: 'Permanently delete media' },
	] },
	{ name: 'Plan Slot', value: 'planSlot', operations: [
		{ name: 'Get Many', value: 'getMany', method: 'GET', path: '/plan/slots', description: 'Get a page of plan slots' },
		{ name: 'Get', value: 'get', method: 'GET', path: '/plan/slots/:id', description: 'Get a plan slot' },
		{ name: 'Create', value: 'create', method: 'POST', path: '/plan/slots', description: 'Create a recurring plan slot' },
		{ name: 'Update', value: 'update', method: 'PATCH', path: '/plan/slots/:id', description: 'Update a plan slot' },
		{ name: 'Delete', value: 'delete', method: 'DELETE', path: '/plan/slots/:id', description: 'Permanently delete a plan slot' },
	] },
	{ name: 'Plan Assignment', value: 'planAssignment', operations: [
		{ name: 'Assign Next', value: 'assignNext', method: 'POST', path: '/plan/assign-next', description: 'Assign drafts to the next available plan slots (may schedule posts)' },
	] },
	{ name: 'Social Account', value: 'social', operations: [
		{ name: 'Get Many', value: 'getMany', method: 'GET', path: '/socials', description: 'Get connected social accounts' },
		{ name: 'Get', value: 'get', method: 'GET', path: '/socials/:id', description: 'Get a social account' },
	] },
	{ name: 'Analytics', value: 'analytics', operations: [
		{ name: 'Get Post Analytics', value: 'getPost', method: 'GET', path: '/analytics/posts/:id', description: 'Get analytics for a published post' },
		{ name: 'Get Social Analytics', value: 'getSocial', method: 'GET', path: '/analytics/socials/:id', description: 'Get analytics for a connected social account' },
	] },
];

const show = (resource: string, operations: string[]) => ({ resource: [resource], operation: operations });

const optionsFor = (resource: Resource) => resource.operations.map((operation) => ({
			name: operation.name, value: operation.value, description: operation.description,
			action: operation.description,
			routing: {
				output: { postReceive: [async function (items: INodeExecutionData[]) {
					for (const item of items) {
						if (item.json.success === false) {
							throw new Error(String(item.json.message ?? 'FeedHive API request failed'));
						}
					}
					return items;
				}] },
				request: {
					method: operation.method,
					url: operation.path.includes(':id')
						? `=${operation.path.replace(':id', '{{encodeURIComponent($parameter.id)}}')}`
						: operation.path,
				},
			},
		}));

// Keep the actual first operation as a literal default in each selector. The
// external n8n package scanner checks source defaults statically.
const operationSelectors: Record<string, INodeProperties> = {
	account: { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
		default: 'status', displayOptions: { show: { resource: ['account'] } }, options: optionsFor(resources[0]) },
	post: { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
		default: 'getMany', displayOptions: { show: { resource: ['post'] } }, options: optionsFor(resources[1]) },
	label: { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
		default: 'getMany', displayOptions: { show: { resource: ['label'] } }, options: optionsFor(resources[2]) },
	media: { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
		default: 'getMany', displayOptions: { show: { resource: ['media'] } }, options: optionsFor(resources[3]) },
	planSlot: { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
		default: 'getMany', displayOptions: { show: { resource: ['planSlot'] } }, options: optionsFor(resources[4]) },
	planAssignment: { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
		default: 'assignNext', displayOptions: { show: { resource: ['planAssignment'] } }, options: optionsFor(resources[5]) },
	social: { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
		default: 'getMany', displayOptions: { show: { resource: ['social'] } }, options: optionsFor(resources[6]) },
	analytics: { displayName: 'Operation', name: 'operation', type: 'options', noDataExpression: true,
		default: 'getPost', displayOptions: { show: { resource: ['analytics'] } }, options: optionsFor(resources[7]) },
};

export const operationProperties: INodeProperties[] = resources.flatMap((resource) => {
	const properties: INodeProperties[] = [operationSelectors[resource.value]];

	const withId = resource.operations.filter((operation) => operation.path.includes(':id')).map((operation) => operation.value);
	if (withId.length) {
		properties.push({
			displayName: 'ID', name: 'id', type: 'string', default: '', required: true,
			displayOptions: { show: show(resource.value, withId) },
			description: 'Identifier returned by the corresponding FeedHive list or create operation',
		});
	}

	const list = resource.operations.find((operation) => operation.value === 'getMany');
	if (list) {
		properties.push({ displayName: 'Limit', name: 'limit', type: 'number', default: 50,
			typeOptions: { minValue: 1, maxValue: 100 }, displayOptions: { show: show(resource.value, ['getMany']) },
			description: 'Max number of results to return', routing: { send: { type: 'query', property: 'limit' } } });
		properties.push({ displayName: 'Cursor', name: 'cursor', type: 'string', default: '',
			displayOptions: { show: show(resource.value, ['getMany']) },
			description: 'Opaque next_cursor from the previous response; leave blank for the first page',
			routing: { send: { type: 'query', property: 'cursor', value: '={{$value || undefined}}' } } });
	}

	const writes = resource.operations.filter((operation) => (operation.method === 'POST' || operation.method === 'PATCH') && operation.value !== 'completeUpload');
	if (writes.length) {
		properties.push({
			displayName: 'Request Body (JSON)', name: 'requestBody', type: 'json', default: '{}',
			displayOptions: { show: show(resource.value, writes.map((operation) => operation.value)) },
			description: 'FeedHive REST request body using documented snake_case fields. Only include the fields you intend to write. Scheduled posts and plan assignment can trigger publishing.',
			routing: { send: { preSend: [async function (requestOptions) {
				const raw = this.getNodeParameter('requestBody') as string | IDataObject;
				const body: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
				if (!body || typeof body !== 'object' || Array.isArray(body)) {
					throw new Error('Request body must be a JSON object');
				}
				return { ...requestOptions, body: body as IDataObject };
			}] } },
		});
	}
	return properties;
});

export const postFilters: INodeProperties[] = ['status', 'labels', 'socials'].map((name) => ({
	displayName: `${name[0].toUpperCase()}${name.slice(1)} Filter`,
	name, type: 'string', default: '', displayOptions: { show: show('post', ['getMany']) },
	description: `Optional comma-separated ${name === 'status' ? 'post statuses' : `${name} IDs`}`,
	routing: { send: { type: 'query', property: name, value: '={{$value || undefined}}' } },
}));
