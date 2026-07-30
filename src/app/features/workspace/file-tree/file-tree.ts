import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FileNode {
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
            { name: 'app.config.ts', type: 'file' },
          ],
        },
        { name: 'main.ts', type: 'file' },
        { name: 'styles.css', type: 'file' },
      ],
    },
    { name: 'angular.json', type: 'file' },
    { name: 'package.json', type: 'file' },
    { name: 'tsconfig.json', type: 'file' },
    { name: 'README.md', type: 'file' },
  ]);

  toggleFolder(node: FileNode): void {
    node.expanded = !node.expanded;
    this.tree.update((t) => [...t]);
  }

  selectFile(node: FileNode): void {
    if (node.type === 'file') {
      this.selectedFile.set(node.name);
    } else {
      this.toggleFolder(node);
    }
  }

  collapseAll(): void {
    const collapseRecursive = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'folder') {
          node.expanded = false;
          if (node.children) collapseRecursive(node.children);
        }
      }
    };
    const updated = [...this.tree()];
    collapseRecursive(updated);
    this.tree.set(updated);
  }

  getFileType(name: string): 'ts' | 'html' | 'css' | 'json' | 'md' | 'config' | 'default' {
    const lower = name.toLowerCase();
    if (lower.endsWith('.ts')) return 'ts';
    if (lower.endsWith('.html')) return 'html';
    if (lower.endsWith('.css') || lower.endsWith('.scss')) return 'css';
    if (lower.endsWith('.json')) return 'json';
    if (lower.endsWith('.md')) return 'md';
    if (lower.includes('config') || lower.startsWith('.')) return 'config';
    return 'default';
  }
}
