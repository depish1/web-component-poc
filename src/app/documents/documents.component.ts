import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DocumentMetadata, RepositoryType, SynchronizationMode, Repository } from './documents.types';
import { RepositoryFactory } from './RepositoryFactory';
import { FileDownloadService } from './services/file-download.service';
import { DocumentsStore } from './services/documents-store.service';

@Component({
  imports: [],
  providers: [DocumentsStore, FileDownloadService],
  selector: 'app-documents',
  styleUrl: './documents.css',
  templateUrl: './documents.html',
})
export class Documents {
  readonly initialData = input<DocumentMetadata[]>([]);
  readonly repositoryType = input<RepositoryType>('A');
  readonly synchronizationMode = input<SynchronizationMode>('IMMEDIATE');
  readonly title = input<string>('');

  readonly documentsChanged = output<DocumentMetadata[]>();
  readonly documentAdded = output<DocumentMetadata>();
  readonly documentRemoved = output<string>();

  protected readonly store = inject(DocumentsStore);
  private readonly repositoryFactory = inject(RepositoryFactory);
  private readonly fileDownloadService = inject(FileDownloadService);

  readonly deletingIds = signal<ReadonlySet<string>>(new Set());
  readonly searchQuery = signal('');
  readonly committing = signal(false);

  private readonly activeRepository = computed(() => this.repositoryFactory.get(this.repositoryType()));

  readonly filteredDocuments = computed(() => {
    const query = this.searchQuery().trim().toLocaleLowerCase();
    return this.store.documents().filter((document) => document.metadata().fileName.toLocaleLowerCase().includes(query));
  });

  ngOnInit(): void {
    this.store.setData(this.initialData());
  }

  setData(documents: DocumentMetadata[]): void {
    this.store.setData(documents);
    this.documentsChanged.emit(this.store.getData());
  }

  getData(): DocumentMetadata[] {
    return this.store.getData();
  }

  async downloadDocument(localId: string): Promise<void> {
    const document = this.store.getDocumentByLocalId(localId);
    if (!document) return;
    const file = document.file();
    const metadata = document.metadata();

    try {
      let blob: Blob;

      if (file) {
        blob = file;
      } else {
        if (!metadata.id) {
          throw new Error(`Missing repository ID for document ${localId}`);
        }

        const repository = this.activeRepository();
        blob = await repository.download(metadata.id);
      }

      this.fileDownloadService.save(blob, metadata.fileName);
    } catch (error) {
      console.error('Document download failed:', error);
    }
  }

  async uploadDocument(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.item(0);
    if (!file) return;

    try {
      await this.addFile(file);
    } catch (error) {
      console.error('Failed to add document:', error);
    } finally {
      input.value = '';
    }
  }

  async commit(): Promise<void> {
    if (this.committing()) throw new Error('Commit already in progress');

    this.committing.set(true);

    try {
      await this.synchronizePendingDocuments();
    } finally {
      this.committing.set(false);
    }
  }

  undoDelete(localId: string): void {
    const document = this.store.getDocumentByLocalId(localId);
    if (!document) return;
    document.undoDelete();
    this.documentsChanged.emit(this.store.getData());
  }

  async removeDocument(localId: string): Promise<void> {
    console.log('8');
    const document = this.store.getDocumentByLocalId(localId);
    if (!document) return;

    try {
      if (document.isOnlyLocal()) {
        this.store.remove(document.localId);
        return;
      }

      if (this.synchronizationMode() === 'IMMEDIATE') {
        if (document.state() === 'DEFAULT') {
          await this.deleteDocumentRemotely(localId, this.activeRepository());
        }
      } else {
        document.markForDelete();
      }
      this.documentRemoved.emit(document.metadata().id || '');
      this.documentsChanged.emit(this.store.getData());
    } catch (error) {
      console.error(`Delete failed, localId: ${document.localId} ; ${error}`);
    } finally {
    }
  }

  async addFile(file: File): Promise<void> {
    const localId = this.store.add(file);

    this.documentsChanged.emit(this.store.getData());

    if (this.synchronizationMode() === 'IMMEDIATE') {
      try {
        await this.addDocumentRemotely(localId, this.activeRepository());
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  }

  private async synchronizePendingDocuments(): Promise<void> {
    const repository = this.activeRepository();

    const pending = this.store.documents().filter((document) => document.isPending());
    console.log('pending', pending);

    const results = await Promise.allSettled(
      pending.map((document) => {
        if (document.isToAdd()) return this.addDocumentRemotely(document.localId, repository);
        else return this.deleteDocumentRemotely(document.localId, repository);
      }),
    );

    console.log('results', results);

    const failures = results.filter((result) => result.status === 'rejected');
    console.log('failures', failures);

    if (failures.length > 0) {
      throw new AggregateError(
        failures.map((result) => result.reason),
        `Failed to synchronize ${failures.length} documents`,
      );
    }
  }

  private async addDocumentRemotely(localId: string, repository: Repository): Promise<void> {
    const document = this.store.getDocumentByLocalId(localId);
    if (!document) throw new Error(`Cannot find document: ${localId}`);
    const file = document.file();
    if (!file) throw new Error(`Missing file for document ${localId}`);
    document.startAdding();

    try {
      const metadata = await repository.upload(file);
      document.completeAdding(metadata.id as string);
      this.documentAdded.emit(metadata);
    } catch (error) {
      document.failAdding();
      throw error;
    }
  }

  private async deleteDocumentRemotely(localId: string, repository: Repository): Promise<void> {
    const document = this.store.getDocumentByLocalId(localId);
    if (!document) throw new Error(`Cannot find document: ${localId}`);
    const metadata = document.metadata();
    if (!metadata.id) throw new Error(`Missing repository ID for ${localId}`);
    document.startDeleting();

    try {
      await repository.remove(metadata.id);
      this.store.remove(document.localId);
      this.documentRemoved.emit(metadata.id);
    } catch (error) {
      document.failDeleting();
      throw error;
    }
  }
}
