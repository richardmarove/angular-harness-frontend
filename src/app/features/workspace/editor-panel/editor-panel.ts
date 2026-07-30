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
  /** Placeholder content — replace with Monaco Editor integration */
  readonly placeholderCode = signal(`// Welcome to the Coding Agent
// Open a file from the explorer, or ask the AI to generate code.

function greet(name: string): string {
  return \`Hello, \${name}! Let's build something great.\`;
}

console.log(greet('Developer'));
`);

  readonly activeTab = signal('main.ts');
  readonly tabs = signal(['main.ts', 'styles.css', 'app.routes.ts']);

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
}
