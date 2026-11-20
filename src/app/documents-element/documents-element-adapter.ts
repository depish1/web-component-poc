import { ChangeDetectorRef, Component, inject, Injector, input, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { form, FormField, validate } from '@angular/forms/signals';
import { Documents } from '../documents/documents.component';
import type { DocumentMetadata, RepositoryType, SynchronizationMode } from '../documents/documents.types';

export interface DocumentsElementOptions {
  initialData?: DocumentMetadata[];
  onChange?: (data: DocumentMetadata[]) => void;
  repository?: RepositoryType;
  synchronizationMode?: SynchronizationMode;
  title?: string;
}

export function copyDocuments(data: DocumentMetadata[]): DocumentMetadata[] {
  return data.map((document) => ({ ...document }));
}

export class DocumentsElementState {
  readonly data;
  readonly validation = signal<{ valid: boolean; message?: string }>({ valid: true });
  adapter?: DocumentsElementAdapter;
  committing = false;

  constructor(readonly options: DocumentsElementOptions) {
    this.data = signal({ documents: copyDocuments(options.initialData ?? []) });
  }

  notifyChange(data: DocumentMetadata[]): void {
    const callback = this.options.onChange;
    if (!callback) return;

    const snapshot = copyDocuments(data);
    // Let FormField finish publishing the value before the host reads it back.
    queueMicrotask(() => callback(snapshot));
  }
}

@Component({
  selector: 'app-documents-element-adapter',
  imports: [Documents, FormField],
  template: `
    <app-documents
      [formField]="field.documents"
      [repositoryType]="adapterState().options.repository ?? 'A'"
      [synchronizationMode]="adapterState().options.synchronizationMode ?? 'IMMEDIATE'"
      [title]="adapterState().options.title ?? 'Dokumenty'"
      (valueChange)="adapterState().notifyChange($event)"
    />
  `,
})
export class DocumentsElementAdapter implements OnInit, OnDestroy {
  readonly adapterState = input.required<DocumentsElementState>();
  readonly documents = viewChild.required(Documents);
  private readonly injector = inject(Injector);
  private readonly changeDetector = inject(ChangeDetectorRef);
  protected field!: ReturnType<typeof form<{ documents: DocumentMetadata[] }>>;

  ngOnInit(): void {
    const state = this.adapterState();
    this.field = form(
      state.data,
      (path) => {
        validate(path.documents, () => {
          const { valid, message } = state.validation();
          return valid ? undefined : { kind: 'baw', message };
        });
      },
      { injector: this.injector },
    );
    state.adapter = this;
  }

  ngOnDestroy(): void {
    const state = this.adapterState();
    if (state.adapter === this) state.adapter = undefined;
  }

  applyReplacement(): void {
    // Deliver the new input before an old upload's Promise can publish its result.
    this.changeDetector.detectChanges();
  }
}
