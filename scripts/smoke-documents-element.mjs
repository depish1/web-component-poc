import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
for (const name of [
  'window',
  'document',
  'HTMLElement',
  'Element',
  'Node',
  'CustomEvent',
  'MutationObserver',
  'Event',
  'customElements',
  'navigator',
  'Document',
  'ShadowRoot',
]) {
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
}

const { initDocumentsElement } = await import('../dist/documents-element/main.js');

assert.equal(customElements.get('baw-documents'), undefined, 'Loading the bundle must not register the element');
assert.equal(globalThis.initDocumentsElement, initDocumentsElement, 'BAW must be able to call the entry point');

const originalDefine = customElements.define.bind(customElements);
let attempts = 0;
customElements.define = (...args) => {
  attempts++;
  if (attempts === 1) throw new Error('Simulated registration failure');
  return originalDefine(...args);
};

await assert.rejects(initDocumentsElement(), /Simulated registration failure/);
assert.equal(customElements.get('baw-documents'), undefined);

const first = initDocumentsElement();
const concurrent = initDocumentsElement();
assert.equal(first, concurrent, 'Concurrent calls must share one registration');
await Promise.all([first, concurrent]);

assert.equal(attempts, 2, 'Registration should be retried exactly once');
assert.equal(typeof customElements.get('baw-documents'), 'function');
await initDocumentsElement();
assert.equal(attempts, 2, 'Repeated initialization must not register the element again');

// Re-evaluate the same bundle to simulate attaching the script more than once.
const reloaded = await import('../dist/documents-element/main.js?second-load');
await reloaded.initDocumentsElement();
assert.equal(attempts, 2, 'Reloading the bundle must preserve the registration guard');

const metadata = (id) => ({
  id,
  fileName: `${id}.pdf`,
  mimeType: 'application/pdf',
  size: 1024,
  createDate: '2026-01-01',
  modifyDate: '2026-01-01',
  retentionDate: null,
});
const publicFields = (data) => data.map((document) => Object.fromEntries(Object.entries(document)));

const firstElement = document.createElement('baw-documents');
const secondElement = document.createElement('baw-documents');
const changes = [];
const initialData = [metadata('first')];
const readyFirst = firstElement.init({
  repository: 'A',
  initialData,
  onChange: (data) => changes.push(data),
});
const readySecond = secondElement.init({ repository: 'B' });
initialData[0].fileName = 'Changed by host before attachment';

assert.equal(firstElement.isSynchronized, false, 'No adapter exists before attachment');
assert.throws(() => firstElement.getData(), /await init\(\)/);
await assert.rejects(firstElement.commit(), /await init\(\)/);

document.body.append(firstElement, secondElement);
await Promise.all([readyFirst, readySecond]);
assert.equal('adapterState' in firstElement, false, 'The adapter state must not be exposed as an input');
await assert.rejects(firstElement.init({}), /already initialized/);
assert.deepEqual(publicFields(firstElement.getData()), [metadata('first')]);
assert.deepEqual(publicFields(secondElement.getData()), []);
assert.deepEqual(changes, [], 'Initial data must not trigger onChange');

firstElement.setData([metadata('updated')]);
await Promise.resolve();
assert.deepEqual(changes.map(publicFields), [[metadata('updated')]]);
assert.deepEqual(publicFields(firstElement.getData()), [metadata('updated')]);
assert.deepEqual(publicFields(secondElement.getData()), [], 'Instances must not share their state');

firstElement.setValid(false, 'Required');
assert.equal(firstElement.isValid, false);
assert.equal(secondElement.isValid, true);
const committing = secondElement.commit();
assert.throws(() => secondElement.setData([metadata('blocked')]), /Cannot replace documents during commit/);
await committing;
assert.equal(secondElement.isSynchronized, true);

const attachedElement = document.createElement('baw-documents');
document.body.append(attachedElement);
await attachedElement.init({ initialData: [metadata('third')] });
assert.deepEqual(publicFields(attachedElement.getData()), [metadata('third')]);

firstElement.remove();
await new Promise((resolve) => setTimeout(resolve, 30));
assert.equal(firstElement.isSynchronized, false);
assert.throws(() => firstElement.getData(), /await init\(\)/, 'Destroyed adapter must not remain accessible');

const failingElement = document.createElement('baw-documents');
const failedReady = failingElement.init({ initialData: [null] });
document.body.append(failingElement);
await assert.rejects(failedReady, 'Angular initialization failure must reject init()');
assert.throws(() => failingElement.getData(), /await init\(\)/);

console.log('OK: rejestracja, gotowość adapterów, niezależne instancje, API i sprzątanie po zniszczeniu');
