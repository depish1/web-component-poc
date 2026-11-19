import { AfterViewInit, Component, input, output, signal, viewChild } from '@angular/core';
import { Documents2, DocumentsValidation } from '../documents2/documents2.component';
import { DocumentMetadata, RepositoryType, SynchronizationMode } from '../documents/documents.types';

export interface DocumentsElementOptions {
  repository?: RepositoryType;
  initialData?: DocumentMetadata[];
  synchronizationMode?: SynchronizationMode;
  title?: string;
}

@Component({
  selector: 'app-documents-element-adapter',
  imports: [Documents2],
  template: `
    <app-documents2
      [repositoryType]="options().repository ?? 'A'"
      [initialData]="options().initialData ?? []"
      [synchronizationMode]="options().synchronizationMode ?? 'IMMEDIATE'"
      [title]="options().title ?? 'Dokumenty'"
      [validation]="validation()"
      (documentsChanged)="documentsChanged.emit($event)"
      (documentAdded)="documentAdded.emit($event)"
      (documentRemoved)="documentRemoved.emit($event)"
    />
  `,
})
export class DocumentsElementAdapter implements AfterViewInit {
  readonly options = input.required<DocumentsElementOptions>();
  readonly connect = input.required<(adapter: DocumentsElementAdapter) => void>();
  readonly documentsChanged = output<DocumentMetadata[]>();
  readonly documentAdded = output<DocumentMetadata>();
  readonly documentRemoved = output<DocumentMetadata>();

  readonly documents = viewChild.required(Documents2);
  readonly validation = signal<DocumentsValidation>({ valid: true });

  ngAfterViewInit(): void {
    this.connect()(this);
  }
}
