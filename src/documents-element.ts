import { provideHttpClient } from '@angular/common/http';
import { createCustomElement } from '@angular/elements';
import { createApplication } from '@angular/platform-browser';
import { copyDocuments, DocumentsElementAdapter, DocumentsElementState } from './app/documents-element/documents-element-adapter';
import type { DocumentsElementOptions } from './app/documents-element/documents-element-adapter';
import type { DocumentMetadata } from './app/documents/documents.types';

interface GeneratedElement extends HTMLElement {
  adapterState: DocumentsElementState;
  connectedCallback(): void;
  disconnectedCallback(): void;
}

const tagName = 'baw-documents';
const registration = Symbol.for('web-component-poc.baw-documents.registration');

async function registerDocumentsElement(): Promise<void> {
  if (customElements.get(tagName)) return;

  const application = await createApplication({ providers: [provideHttpClient()] });
  const AngularElement = createCustomElement(DocumentsElementAdapter, {
    injector: application.injector,
  }) as unknown as new () => GeneratedElement;

  class DocumentsElement extends AngularElement {
    private configuration?: DocumentsElementState;

    override connectedCallback(): void {
      if (this.configuration) super.connectedCallback();
    }

    override disconnectedCallback(): void {
      if (this.configuration) super.disconnectedCallback();
    }

    init(options: DocumentsElementOptions = {}): void {
      if (this.configuration) throw new Error('The documents element is already initialized.');

      const state = new DocumentsElementState({ ...options });
      this.configuration = state;
      this.adapterState = state;
      if (this.isConnected) super.connectedCallback();
    }

    setData(documents: DocumentMetadata[]): void {
      const state = this.requireConfiguration();
      if (state.committing) throw new Error('Cannot replace documents during commit.');

      const replacement = copyDocuments(documents);
      state.data.set({ documents: replacement });
      if (this.isConnected) state.adapter?.applyReplacement();
      state.notifyChange(replacement);
    }

    getData(): DocumentMetadata[] {
      return copyDocuments(this.requireConfiguration().data().documents);
    }

    get isValid(): boolean {
      return this.requireConfiguration().validation().valid;
    }

    setValid(isValid: boolean, errMsg?: string): void {
      this.requireConfiguration().validation.set({
        valid: isValid,
        message: isValid ? undefined : errMsg,
      });
    }

    get isSynchronized(): boolean {
      return this.requireConfiguration().adapter?.documents().isSynchronized() ?? true;
    }

    async commit(): Promise<void> {
      const state = this.requireConfiguration();
      if (!this.isConnected || !state.adapter) {
        throw new Error('Connect the initialized documents element before committing.');
      }
      if (state.committing) throw new Error('Commit already in progress.');

      state.committing = true;
      try {
        await state.adapter.documents().commit();
      } finally {
        state.committing = false;
      }
    }

    private requireConfiguration(): DocumentsElementState {
      if (!this.configuration) throw new Error('Call init() on the documents element first.');
      return this.configuration;
    }
  }

  customElements.define(tagName, DocumentsElement);
}

export function initDocumentsElement(): Promise<void> {
  const existing = Reflect.get(globalThis, registration) as Promise<void> | undefined;
  if (existing) return existing;

  const pending = registerDocumentsElement().catch((error) => {
    if (Reflect.get(globalThis, registration) === pending) {
      Reflect.deleteProperty(globalThis, registration);
    }
    throw error;
  });

  Reflect.set(globalThis, registration, pending);
  return pending;
}

// Loading the bundle only exposes the entry point; BAW decides when to initialize Angular.
Object.assign(globalThis, { initDocumentsElement });
