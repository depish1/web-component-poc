import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
for (const name of [
  'window', 'document', 'HTMLElement', 'Element', 'Node', 'CustomEvent',
  'MutationObserver', 'Event', 'customElements', 'navigator', 'Document', 'ShadowRoot',
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

const element = document.createElement('baw-documents');
let changed;
element.init({ onChange: (data) => { changed = data; } });
element.setData([{ id: 'doc-1' }]);
await Promise.resolve();
assert.equal(element.getData()[0].id, 'doc-1');
assert.equal(changed[0].id, 'doc-1');
element.setValid(false, 'Required');
assert.equal(element.isValid, false);
await assert.rejects(element.commit(), /Connect the initialized documents element/);

console.log('OK: jawna rejestracja, ponowienie po błędzie, wielokrotne załadowanie i API instancji');
