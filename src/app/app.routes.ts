import { Routes } from '@angular/router';
import { Documents2Demo } from './documents2-demo/documents2-demo.component';
import { Documents3Demo } from './documents3-demo/documents3-demo.component';

export const routes: Routes = [
  { path: 'documents2', component: Documents2Demo },
  { path: 'documents3', component: Documents3Demo },
];
