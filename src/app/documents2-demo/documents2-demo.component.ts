import { Component, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Documents2 } from '../documents2/documents2.component';
import type { DocumentMetadata } from '../documents/documents.types';

@Component({
  selector: 'app-documents2-demo',
  imports: [Documents2, ReactiveFormsModule],
  template: `
    <h1>Documents2 — Reactive Forms</h1>
    <form [formGroup]="form" (ngSubmit)="save()">
      <app-documents2
        formControlName="documents"
        title="Załączniki"
        synchronizationMode="DEFERRED"
        [validation]="{
          valid: documents.valid || documents.disabled || !(documents.touched || submitted()),
          message: 'Dodaj co najmniej jeden plik.',
        }"
      />
      <button type="submit" [disabled]="documents.disabled || saving()">Zapisz</button>
      <button type="button" [disabled]="saving()" (click)="reset()">Resetuj</button>
      <button type="button" [disabled]="saving()" (click)="toggleDisabled()">
        {{ documents.disabled ? 'Włącz pole' : 'Wyłącz pole' }}
      </button>
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
export class Documents2Demo {
  private readonly component = viewChild.required(Documents2);
  protected readonly documents = new FormControl<DocumentMetadata[]>([], {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly form = new FormGroup({ documents: this.documents });
  protected readonly submitted = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly result = signal('');

  protected async save(): Promise<void> {
    if (this.saving() || this.documents.disabled) return;
    this.submitted.set(true);
    this.result.set('');
    this.error.set('');
    if (this.form.invalid) return;

    this.saving.set(true);
    try {
      const component = this.component();
      await component.commit();
      if (!component.isSynchronized()) {
        throw new Error('Dokumenty nadal oczekują na synchronizację.');
      }
      this.result.set(JSON.stringify(component.getData(), null, 2));
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.saving.set(false);
    }
  }

  protected reset(): void {
    this.form.reset();
    this.submitted.set(false);
    this.error.set('');
    this.result.set('');
  }

  protected toggleDisabled(): void {
    if (this.documents.disabled) {
      this.documents.enable();
    } else {
      this.documents.disable();
    }
  }
}
