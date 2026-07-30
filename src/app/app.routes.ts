import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/workspace/workspace/workspace').then(
        (m) => m.WorkspaceComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
