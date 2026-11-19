const startup = document.querySelector('#startup');
const template = document.querySelector('#documents-demo');
const requiredMessage = 'Dodaj co najmniej jeden plik.';

async function mountDemo(title) {
  const fragment = template.content.cloneNode(true);
  const form = fragment.querySelector('form');
  const documents = fragment.querySelector('baw-documents');
  const submit = form.querySelector('[type="submit"]');
  const read = form.querySelector('[data-read]');
  const replace = form.querySelector('[data-replace]');
  const errorMessage = form.querySelector('[data-error]');
  const output = form.querySelector('[data-output]');
  const lastEvent = form.querySelector('[data-event]');
  let submitted = false;

  function validate(data) {
    const valid = data.length > 0;
    if (submitted) documents.setValid(valid, valid ? undefined : requiredMessage);
    return valid;
  }

  function showData(data) {
    output.textContent = JSON.stringify(data, null, 2);
  }

  documents.addEventListener('documentsChanged', (event) => {
    validate(event.detail);
    showData(event.detail);
  });
  for (const eventName of ['documentAdded', 'documentRemoved']) {
    documents.addEventListener(eventName, (event) => {
      lastEvent.textContent = `${eventName}: ${event.detail.fileName}`;
    });
  }

  read.addEventListener('click', () => showData(documents.getData()));
  replace.addEventListener('click', () => documents.setData([]));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled) return;
    submitted = true;
    errorMessage.textContent = '';
    output.textContent = '';
    if (!validate(documents.getData()) || !documents.isValid) return;

    submit.disabled = true;
    replace.disabled = true;
    try {
      await documents.commit();
      if (!documents.isSynchronized()) {
        throw new Error('Dokumenty nadal oczekują na synchronizację.');
      }
      showData(documents.getData());
    } catch (error) {
      errorMessage.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      submit.disabled = false;
      replace.disabled = false;
    }
  });

  document.body.append(fragment);
  await documents.init({ title, repository: 'A', initialData: [], synchronizationMode: 'DEFERRED' });
  submit.disabled = false;
  read.disabled = false;
  replace.disabled = false;
}

try {
  await customElements.whenDefined('baw-documents');
  await Promise.all([mountDemo('Załączniki A'), mountDemo('Załączniki B')]);
  startup.textContent = '';
} catch (error) {
  startup.textContent = error instanceof Error ? error.message : String(error);
}
