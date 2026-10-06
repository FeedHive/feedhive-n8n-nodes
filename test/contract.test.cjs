const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { resources, operationProperties } = require('../dist/nodes/Feedhive/resources/operations.js');
const { Feedhive } = require('../dist/nodes/Feedhive/Feedhive.node.js');
const { FeedhiveApi } = require('../dist/credentials/FeedhiveApi.credentials.js');

const expected = [
  'GET /status',
  'GET /posts', 'GET /posts/:id', 'POST /posts', 'PATCH /posts/:id', 'DELETE /posts/:id',
  'GET /labels', 'GET /labels/:id', 'POST /labels', 'PATCH /labels/:id', 'DELETE /labels/:id',
  'POST /media/uploads', 'POST /media/uploads/:id/complete', 'GET /media', 'GET /media/:id', 'DELETE /media/:id',
  'GET /plan/slots', 'GET /plan/slots/:id', 'POST /plan/slots', 'PATCH /plan/slots/:id',
  'DELETE /plan/slots/:id', 'POST /plan/assign-next',
  'GET /socials', 'GET /socials/:id', 'GET /analytics/posts/:postId', 'GET /analytics/socials/:id',
];

test('every published REST endpoint has one operation and no undocumented methods', () => {
  const actual = resources.flatMap(r => r.operations.map(o => `${o.method} ${o.path.replace('/analytics/posts/:id', '/analytics/posts/:postId')}`));
  assert.deepEqual(actual.slice().sort(), expected.slice().sort());
  for (const resource of resources) {
    const property = operationProperties.find(p => p.name === 'operation' && p.displayOptions.show.resource[0] === resource.value);
    assert.deepEqual(property.options.map(o => o.value), resource.operations.map(o => o.value));
    assert.equal(property.default, resource.operations[0].value);
    for (const operation of property.options) {
      assert.equal(operation.routing.request.method, resource.operations.find(o => o.value === operation.value).method);
    }
  }
});

test('n8n package and picker metadata use supported community-node conventions', () => {
  const pkg = require('../package.json');
  const codex = require('../dist/nodes/Feedhive/Feedhive.node.json');
  assert.equal(pkg.name, 'n8n-nodes-feedhive');
  assert.equal(pkg.license, 'MIT');
  assert.ok(pkg.keywords.includes('n8n-community-node-package'));
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.optionalDependencies, undefined);
  assert.equal(pkg.private, false);
  assert.equal(codex.node, `${pkg.name}.${new Feedhive().description.name}`);
  assert.deepEqual(codex.categories, ['Marketing & Content']);
});

test('node and credential icons use the FeedHive mark, not a scaffold placeholder', () => {
  const node = new Feedhive().description;
  const credential = new FeedhiveApi();
  assert.equal(node.icon.light, 'file:feedhive.svg');
  assert.equal(node.icon.dark, 'file:feedhive.dark.svg');
  assert.equal(credential.icon, 'file:../nodes/Feedhive/feedhive.svg');
  for (const name of ['feedhive.svg', 'feedhive.dark.svg']) {
    const svg = fs.readFileSync(path.join(__dirname, '../nodes/Feedhive', name), 'utf8');
    assert.match(svg, /viewBox="0 0 413 413"/);
    assert.match(svg, /fill="#2563EB"/);
    assert.equal((svg.match(/fill="white"/g) || []).length, 3);
    assert.doesNotMatch(svg, /feather-cpu|<rect|<line/);
  }
});

test('completing a media upload requires a session ID but no fabricated request body', () => {
  const node = new Feedhive().description;
  const id = node.properties.find(p => p.name === 'id' && p.displayOptions.show.resource[0] === 'media');
  assert.ok(id.displayOptions.show.operation.includes('completeUpload'));
  const body = node.properties.find(p => p.name === 'requestBody' && p.displayOptions.show.resource[0] === 'media');
  assert.ok(!body.displayOptions.show.operation.includes('completeUpload'));
  const template = require('../examples/operation-workflows.json').find(w => w.name.includes('Media') && w.name.includes('Complete Upload'));
  const action = template.nodes.find(n => n.parameters?.operation === 'completeUpload');
  assert.ok(action);
  assert.equal(Object.hasOwn(action.parameters, 'requestBody'), false);
});

test('credentials only go to FeedHive as a bearer header; no signed destination in node', () => {
  const credential = new FeedhiveApi();
  const node = new Feedhive().description;
  assert.equal(credential.authenticate.properties.headers.Authorization, '=Bearer {{$credentials.apiKey}}');
  assert.equal(credential.test.request.url, '/status');
  assert.equal(node.requestDefaults.baseURL, 'https://api.feedhive.com');
  assert.deepEqual(node.credentials, [{ name: 'feedhiveApi', required: true }]);
  assert.equal(resources.some(r => r.operations.some(o => o.method === 'PUT')), false);
});

test('nested post and plan bodies are JSON objects, not a string or an empty-name property', async () => {
  const postBody = { text: 'Fixture draft', status: 'draft', accounts: [], subposts: [{ text: 'Reply', media: [] }] };
  const prop = operationProperties.find(p => p.name === 'requestBody' && p.displayOptions.show.resource[0] === 'post');
  const transform = prop.routing.send.preSend[0];
  const out = await transform.call({ getNodeParameter: () => JSON.stringify(postBody) }, { method: 'POST', url: '/posts' });
  assert.deepEqual(out.body, postBody);
  assert.equal(out.url, '/posts');
  await assert.rejects(transform.call({ getNodeParameter: () => '[]' }, {}), /JSON object/);
});

test('cursor controls and status/label/social filters preserve public API query names', () => {
  const node = new Feedhive().description;
  const cursor = node.properties.find(p => p.name === 'cursor' && p.displayOptions.show.resource[0] === 'post');
  assert.equal(cursor.routing.send.property, 'cursor');
  for (const name of ['status', 'labels', 'socials']) {
    assert.equal(node.properties.find(p => p.name === name).routing.send.property, name);
  }
  assert.equal(node.properties.find(p => p.name === 'limit').typeOptions.maxValue, 100);
  for (const resource of ['post', 'label', 'media', 'planSlot', 'social']) {
    for (const name of ['limit', 'cursor']) {
      assert.ok(node.properties.some(p => p.name === name && p.displayOptions.show.resource[0] === resource));
    }
  }
});


test('successful envelopes stay intact and API failure envelopes surface as errors', async () => {
  const prop = operationProperties.find(p => p.name === 'operation' && p.displayOptions.show.resource[0] === 'post');
  const receive = prop.options.find(o => o.value === 'get').routing.output.postReceive[0];
  const success = [{ json: { success: true, data: { id: 'fixture' } } }];
  assert.deepEqual(await receive(success), success);
  await assert.rejects(receive([{ json: { success: false, message: 'Rate limit exceeded' } }]), /Rate limit exceeded/);
});
