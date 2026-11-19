import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TestWrapper } from './components/test-wrapper/test-wrapper.component';

@Component({
  imports: [TestWrapper, RouterLink, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {}
