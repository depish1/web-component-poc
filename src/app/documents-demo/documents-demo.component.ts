import { Component, signal, viewChildren } from '@angular/core';
import { FormField, form, minLength } from '@angular/forms/signals';
import { Documents } from '../documents/documents.component';
import type { DocumentMetadata } from '../documents/documents.types';

@Component({
  selector: 'app-documents-demo',
  imports: [Documents, FormField],
  template: `
    <h1>Documents — Signal Forms</h1>

    <form (submit)="save($event)">
      <app-documents [formField]="documentsForm.requiredDocuments" title="Dokumenty wymagane" synchronizationMode="DEFERRED" />
      <app-documents [formField]="documentsForm.additionalDocuments" title="Dokumenty dodatkowe" synchronizationMode="DEFERRED" />
      <button type="submit" [disabled]="saving()">Zapisz</button>
      <button type="button" [disabled]="saving()" (click)="replaceDocuments()">Wyczyść listę dodatkową</button>
    </form>

    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
    @if (result()) {
      <p role="status">Dokumenty zsynchronizowane.</p>
      <pre>{{ result() }}</pre>
    }
  `,
})
export class DocumentsDemo {
  private readonly controls = viewChildren(Documents);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly result = signal('');
  protected readonly data = signal({
    requiredDocuments: [] as DocumentMetadata[],
    additionalDocuments: [] as DocumentMetadata[],
  });
  protected readonly documentsForm = form(this.data, (path) => {
    minLength(path.requiredDocuments, 1, { message: 'Dodaj co najmniej jeden plik.' });
  });

  protected replaceDocuments(): void {
    if (this.saving()) return;
    this.documentsForm.additionalDocuments().value.set([]);
    this.result.set('');
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving()) return;

    this.result.set('');
    this.error.set('');
    this.documentsForm.requiredDocuments().markAsTouched();
    if (this.documentsForm().invalid()) return;

    this.saving.set(true);
    try {
      const controls = this.controls();
      const results = await Promise.allSettled(controls.map((control) => control.commit()));
      if (results.some((result) => result.status === 'rejected') || controls.some((control) => !control.isSynchronized())) {
        throw new Error('Nie udało się zsynchronizować wszystkich dokumentów.');
      }

      this.result.set(JSON.stringify(this.data(), null, 2));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.saving.set(false);
    }
  }
}
