import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService, FileNode } from '../../../core/services/file';
import { SessionService } from '../../../core/services/session';

@Component({
  selector: 'app-file-tree',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-tree.html',
  styleUrl: './file-tree.css',
})
export class FileTreeComponent {
  readonly fileService = inject(FileService);
  readonly sessionService = inject(SessionService);

  readonly creatingType = signal<'file' | 'folder' | null>(null);
  readonly newPathInput = signal<string>('');

  toggleFolder(node: FileNode): void {
    node.expanded = !node.expanded;
  }

  selectFile(node: FileNode): void {
    if (node.type === 'file') {
      const id = this.sessionService.sessionId();
      if (id) {
        this.fileService.openFile(id, node.path);
      }
    } else {
      this.toggleFolder(node);
    }
  }

  refreshTree(): void {
    const id = this.sessionService.sessionId();
    if (id) {
      this.fileService.loadTree(id);
    }
  }

  startCreate(type: 'file' | 'folder'): void {
    this.creatingType.set(type);
    this.newPathInput.set('');
  }

  cancelCreate(): void {
    this.creatingType.set(null);
    this.newPathInput.set('');
  }

  async confirmCreate(): Promise<void> {
    const type = this.creatingType();
    const relPath = this.newPathInput().trim();
    const id = this.sessionService.sessionId();

    if (type && relPath && id) {
      await this.fileService.createNode(id, relPath, type);
      this.cancelCreate();
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
    const updated = [...this.fileService.tree()];
    collapseRecursive(updated);
    this.fileService.tree.set(updated);
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
