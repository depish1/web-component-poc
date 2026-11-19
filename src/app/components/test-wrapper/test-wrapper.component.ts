import { Component, inject, signal, viewChild } from '@angular/core';
import { Documents } from '../../documents/documents.component';
import { DocumentMetadata, RepositoryType, SynchronizationMode } from '../../documents/documents.types';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ApiDocumentMetadata } from '../../documents/services/repository-a.service';

@Component({
  imports: [Documents],
  providers: [],
  selector: 'app-test-wrapper',
  templateUrl: './test-wrapper.html',
})
export class TestWrapper {
  private readonly documents = viewChild.required<Documents>('repoA');
  private readonly http = inject(HttpClient);
  private readonly filesUrl = 'http://localhost:3000/api/files';
  protected readonly synchronizationMode = signal<SynchronizationMode>('DEFERRED');
  protected readonly title = signal(`Dokumenty - ${this.synchronizationMode()}`);

  readonly selectedRepository = signal<RepositoryType>('A');

  listDocuments(): Promise<ApiDocumentMetadata[]> {
    return firstValueFrom(this.http.get<ApiDocumentMetadata[]>(this.filesUrl));
  }

  async handleGetDocuments() {
    const files = await this.listDocuments();

    const newFiles = files.map((response) => ({
      id: response.id,
      fileName: response.filename,
      mimeType: response.mimeType,
      size: response.size,
      createDate: response.createDate,
      modifyDate: response.modifyDate,
      retentionDate: response.retentionDate,
      user: response.user,
    }));
    console.log('newFiles', newFiles);
    this.documents().setData(newFiles);
  }

  async commit() {
    const x = await this.documents().commit();
    console.log('x', x);
    console.log('this.documents().getData()', this.documents().getData());
  }

  handleDocumentsChange(documents: DocumentMetadata[]): void {
    console.log('Lista dokumentów:', documents);
  }

  handleDocumentAdd(document: DocumentMetadata): void {
    console.log('Dodano dokument:', document);
  }

  handleDocumentRemove(document: DocumentMetadata): void {
    console.log('Usunięto dokument:', document);
  }

  setRepository(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedRepository.set(select.value as RepositoryType);
  }
}
