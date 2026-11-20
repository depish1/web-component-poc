import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (error) => errors.push(error));
const w = new JSDOM('<body></body>', {
  url: 'http://localhost:4200/',
  runScripts: 'outside-only',
  virtualConsole: vc,
}).window;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(label, predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await delay(20);
  }
  throw new Error(label + ': ' + w.document.body.textContent + ' ' + errors.map((e) => e.stack).join(' '));
}
Object.assign(w, { TextEncoder, TextDecoder, AbortController, AbortSignal, Response, Headers });
const requests = [];
w.fetch = (url, options) => new Promise((resolve) => requests.push({ url, options, resolve }));
const build = fs.readFileSync('dist/documents-element/browser/main.js', 'utf8');
w.eval('(()=>{' + build + '})()');
await w.customElements.whenDefined('baw-documents');
const firstDefinition = w.customElements.get('baw-documents');
w.eval('(()=>{' + build + '})()');
assert.equal(w.customElements.get('baw-documents'), firstDefinition);
function element(options, attachFirst = false) {
  const el = w.document.createElement('baw-documents');
  if (attachFirst) w.document.body.append(el);
  assert.equal(el.init(options), undefined);
  if (!attachFirst) w.document.body.append(el);
  return el;
}
const metadata = (id, fileName = 'seed.txt') => ({
  id,
  fileName,
  size: 3,
  mimeType: 'text/plain',
  createDate: '',
  modifyDate: '',
  retentionDate: null,
});
const changes = [];
const main = element({ initialData: [metadata('seed')], synchronizationMode: 'DEFERRED', onChange: (data) => changes.push(data) });
const immediateChanges = [];
const other = element({ synchronizationMode: 'IMMEDIATE', onChange: (data) => immediateChanges.push(data) }, true);
await until('mount', () => other.querySelector('input[type=file]'));
assert.equal(main.getData()[0].id, 'seed');
assert.equal(other.getData().length, 0);
assert.equal(changes.length, 0);
main.setValid(false, 'BAW error');
await until('invalid before touched', () => main.querySelector('[role=alert]')?.textContent === 'BAW error');
assert.equal(main.isValid, false);
assert.equal(main.isSynchronized, true);
main.setValid(false);
await until('invalid without message', () => !main.querySelector('[role=alert]') && main.querySelector('[aria-invalid=true]'));
main.setValid(true);
await until('cleared validation', () => !main.querySelector('[aria-invalid=true]'));
function pick(el, name) {
  const input = el.querySelector('input[type=file]');
  const file = new w.File(['x'], name, { type: 'text/plain' });
  Object.defineProperty(input, 'files', { configurable: true, value: { item: () => file } });
  input.dispatchEvent(new w.Event('change', { bubbles: true }));
}
function confirm(request, id, filename) {
  request.resolve(new Response(JSON.stringify({ ...metadata(id), filename }), { status: 201 }));
}
pick(main, 'deferred.txt');
assert.equal(main.getData()[1].fileName, 'deferred.txt');
assert.equal(main.isSynchronized, false);
assert.equal(main.isValid, true);
await until('change on add', () => changes.length === 1);
assert.equal(requests.length, 0);
const commit = main.commit();
assert.throws(() => main.setData([]), /during commit/);
await until('deferred request', () => requests.length === 1);
confirm(requests.shift(), 'uploaded', 'deferred.txt');
await commit;
await until('change on upload', () => changes.length === 2);
assert.equal(main.getData()[1].id, 'uploaded');
assert.equal(main.isSynchronized, true);
main.setData([]);
assert.equal(main.getData().length, 0);
await until('change on setData', () => changes.length === 3);
assert.equal(changes[2].length, 0);
pick(main, 'queued.txt');
main.setData([]);
await main.commit();
assert.equal(requests.length, 0);

pick(other, 'discarded.txt');
await until('immediate upload', () => requests.length === 1);
const upload = requests.shift();
other.setData([metadata('replacement')]);
assert.equal(other.isSynchronized, true);
await until('immediate notifications', () => immediateChanges.length === 2);
confirm(upload, 'discarded', 'discarded.txt');
await delay(30);
assert.deepEqual(
  Array.from(other.getData(), (item) => item.id),
  ['replacement'],
);
assert.equal(immediateChanges.length, 2);
const remove = [...other.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Usuń');
remove.click();
await until('immediate delete', () => requests.length === 1);
const deletion = requests.shift();
assert.equal(deletion.options.method, 'DELETE');
other.setData([metadata('replacement', 'reloaded.txt')]);
await until('delete notifications', () => immediateChanges.length === 4);
deletion.resolve(new Response(null, { status: 204 }));
await delay(30);
assert.equal(other.getData()[0].fileName, 'reloaded.txt');
assert.equal(other.isSynchronized, true);
assert.equal(immediateChanges.length, 4);
assert.equal(errors.length, 0, errors.map((e) => e.stack).join(' '));
console.log('Built Web Component contract passed');
w.close();
