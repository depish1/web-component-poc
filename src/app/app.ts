import { Component, signal } from '@angular/core';
import { Documents } from './documents/documents.component';
import { DocumentMetadata, RepositoryType } from './documents/documents.types';
import { TestWrapper } from './components/test-wrapper/test-wrapper.component';

@Component({
  imports: [TestWrapper],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
