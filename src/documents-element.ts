import { provideHttpClient } from '@angular/common/http';
import { createCustomElement } from '@angular/elements';
import { createApplication } from '@angular/platform-browser';
import {
  DocumentsElementAdapter,
  DocumentsElementOptions,
} from './app/documents-element/documents-element.component';
import type { DocumentMetadata } from './app/documents/documents.types';

interface GeneratedDocumentsElement extends HTMLElement {
  options: DocumentsElementOptions;
  connect: (adapter: DocumentsElementAdapter) => void;
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
  }) as unknown as new () => GeneratedDocumentsElement;

  class DocumentsElement extends AngularElement {
    private adapter?: DocumentsElementAdapter;
    private initialization?: Promise<void>;
    private resolveReady?: () => void;
    private connected = false;
    private validation = { valid: true } as { valid: boolean; message?: string };

    override connectedCallback(): void {
      this.connected = true;
      if (this.initialization) super.connectedCallback();
    }

    override disconnectedCallback(): void {
      this.connected = false;
      if (this.initialization) super.disconnectedCallback();
    }

    init(options: DocumentsElementOptions = {}): Promise<void> {
      if (this.initialization) return this.initialization;

      this.initialization = new Promise<void>((resolve) => {
        this.resolveReady = resolve;
      });
      this.options = options;
      this.connect = (adapter) => {
        this.adapter = adapter;
        adapter.validation.set(this.validation);
        this.resolveReady?.();
        this.resolveReady = undefined;
      };

      if (this.connected) super.connectedCallback();
      return this.initialization;
    }

    get isValid(): boolean {
      return this.validation.valid;
    }

    setValid(isValid: boolean, errorMsg?: string): void {
      this.validation = { valid: isValid, message: isValid ? undefined : errorMsg };
      this.adapter?.validation.set(this.validation);
    }

    setData(documents: DocumentMetadata[]): void {
      this.requireAdapter().documents().setData(documents);
    }

    getData(): DocumentMetadata[] {
      return this.requireAdapter().documents().getData();
    }

    async commit(): Promise<void> {
      await this.requireAdapter().documents().commit();
    }

    isSynchronized(): boolean {
      return this.requireAdapter().documents().isSynchronized();
    }

    private requireAdapter(): DocumentsElementAdapter {
      if (!this.connected || !this.adapter) {
        throw new Error('Connect the documents element and await init() before using its API.');
      }
      return this.adapter;
    }
  }

  if (customElements.get(tagName)) {
    application.destroy();
    return;
  }
  customElements.define(tagName, DocumentsElement);
}

if (!Reflect.has(globalThis, registration)) {
  Reflect.set(globalThis, registration, registerDocumentsElement().catch((error) => {
    Reflect.deleteProperty(globalThis, registration);
    throw error;
  }));
}
