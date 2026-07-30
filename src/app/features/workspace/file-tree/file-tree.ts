import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  expanded?: boolean;
  icon?: string;
}

@Component({
  selector: 'app-file-tree',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-tree.html',
  styleUrl: './file-tree.css',
})
export class FileTreeComponent {
  readonly selectedFile = signal<string | null>(null);

  readonly tree = signal<FileNode[]>([
    {
      name: 'src',
      type: 'folder',
      expanded: true,
      children: [
        {
          name: 'app',
          type: 'folder',
          expanded: true,
          children: [
            { name: 'app.ts', type: 'file' },
            { name: 'app.html', type: 'file' },
            { name: 'app.routes.ts', type: 'file' },
          ],
        },
        { name: 'main.ts', type: 'file' },
        { name: 'styles.css', type: 'file' },
      ],
    },
    { name: 'angular.json', type: 'file' },
    { name: 'package.json', type: 'file' },
    { name: 'tsconfig.json', type: 'file' },
  ]);

  toggleFolder(node: FileNode): void {
    node.expanded = !node.expanded;
    this.tree.update((t) => [...t]); // trigger re-render
  }

  selectFile(node: FileNode): void {
    if (node.type === 'file') {
      this.selectedFile.set(node.name);
    } else {
      this.toggleFolder(node);
    }
  }

  getFileIcon(name: string): string {
    if (name.endsWith('.ts')) return '🟦';
    if (name.endsWith('.html')) return '🟧';
    if (name.endsWith('.css')) return '🎨';
    if (name.endsWith('.json')) return '🟨';
    if (name.endsWith('.md')) return '📄';
    return '📄';
  }
}
