import { Component, computed, ElementRef, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Documents } from '../documents/documents.component';
import { DocumentMetadata } from '../documents/documents.types';
import { DocumentsStore } from '../documents/services/documents-store.service';
import { FileDownloadService } from '../documents/services/file-download.service';

export interface DocumentsValidation {
  valid: boolean;
  message?: string;
}

@Component({
  selector: 'app-documents2',
  templateUrl: './documents2.html',
  styleUrl: '../documents/documents.css',
  host: { '(focusout)': 'handleFocusOut($event)' },
  providers: [
    DocumentsStore,
    FileDownloadService,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Documents2),
      multi: true,
    },
  ],
})
export class Documents2 extends Documents implements ControlValueAccessor {
  readonly validation = input<DocumentsValidation>({ valid: true });
  private readonly formDisabled = signal(false);
  readonly disabled = this.formDisabled.asReadonly();
  protected readonly actionsDisabled = computed(() => this.disabled() || this.isCommiting());

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private onChange: (value: DocumentMetadata[]) => void = () => {};
  private onTouched: () => void = () => {};
  private hasWrittenFormValue = false;
  private settingExternalData = false;
  private writeVersion = 0;

  constructor() {
    super();
    this.documentsChanged.subscribe((value) => {
      if (!this.settingExternalData) this.onChange(value);
    });
  }

  override ngOnInit(): void {
    if (!this.hasWrittenFormValue) super.ngOnInit();
  }

  writeValue(value: DocumentMetadata[] | null | undefined): void {
    this.hasWrittenFormValue = true;
    this.writeVersion++;
    this.store.setData(value ?? []);
  }

  override setData(documents: DocumentMetadata[]): void {
    this.settingExternalData = true;
    try {
      super.setData(documents);
    } finally {
      this.settingExternalData = false;
    }
  }

  registerOnChange(callback: (value: DocumentMetadata[]) => void): void {
    this.onChange = callback;
  }

  registerOnTouched(callback: () => void): void {
    this.onTouched = callback;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }

  protected handleFocusOut(event: FocusEvent): void {
    if (!this.disabled() && !this.host.nativeElement.contains(event.relatedTarget as Node | null)) {
      this.onTouched();
    }
  }

  override async addFile(file: File): Promise<void> {
    if (!this.disabled()) await super.addFile(file);
  }

  override async removeDocument(localId: string): Promise<void> {
    if (!this.disabled()) await super.removeDocument(localId);
  }

  override undoDelete(localId: string): void {
    if (!this.disabled()) super.undoDelete(localId);
  }

  override async downloadDocument(localId: string): Promise<void> {
    if (!this.disabled()) await super.downloadDocument(localId);
  }

  override async commit(): Promise<void> {
    const version = this.writeVersion;
    await super.commit();
    if (version !== this.writeVersion) {
      throw new Error('The document list was replaced during synchronization.');
    }
  }
}
