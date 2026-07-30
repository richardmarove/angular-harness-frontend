import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-editor-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './editor-panel.html',
  styleUrl: './editor-panel.css',
})
export class EditorPanelComponent {
  readonly activeTab = signal('main.ts');
  readonly tabs = signal(['main.ts', 'styles.css', 'app.routes.ts']);

  readonly fileContents: Record<string, string> = {
    'main.ts': `import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { WorkspaceComponent } from './app/features/workspace/workspace/workspace';

bootstrapApplication(WorkspaceComponent, appConfig)
  .catch((err) => console.error(err));
`,
    'styles.css': `@import "tailwindcss";

@theme {
  --color-surface: #090a0f;
  --color-accent: #6366f1;
}

html, body {
  background-color: var(--color-surface);
  font-family: "Plus Jakarta Sans", sans-serif;
}
`,
    'app.routes.ts': `import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/workspace/workspace/workspace').then((m) => m.WorkspaceComponent),
  },
];
`,
  };

  selectTab(tab: string): void {
    this.activeTab.set(tab);
  }

  closeTab(tab: string, event: MouseEvent): void {
    event.stopPropagation();
    this.tabs.update((t) => t.filter((x) => x !== tab));
    if (this.activeTab() === tab) {
      const remaining = this.tabs();
      this.activeTab.set(remaining[remaining.length - 1] ?? '');
    }
  }

  getCurrentCode(): string {
    const active = this.activeTab();
    if (!active) return '';
    return this.fileContents[active] ?? `// ${active}\n// File ready for editing.`;
  }

  getFileIcon(name: string): string {
    if (name.endsWith('.ts')) return '🔷';
    if (name.endsWith('.css')) return '🎨';
    if (name.endsWith('.html')) return '🟧';
    return '📄';
  }

  getLineNumbers(): number[] {
    const lines = this.getCurrentCode().split('\n').length;
    return Array.from({ length: lines }, (_, i) => i + 1);
  }
}
