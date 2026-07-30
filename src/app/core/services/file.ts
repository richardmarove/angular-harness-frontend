import { Injectable, signal, computed } from '@angular/core';

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  expanded?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class FileService {
  readonly tree = signal<FileNode[]>([]);
  readonly openTabs = signal<string[]>([]);
  readonly activeTab = signal<string>('');
  
  // Storage for file contents: buffered (live edits) and saved (disk version)
  readonly fileBuffers = signal<Record<string, string>>({});
  readonly savedBuffers = signal<Record<string, string>>({});
  
  readonly isLoadingTree = signal(false);
  readonly isReadingFile = signal(false);
  readonly isSavingFile = signal(false);
  readonly saveStatus = signal<string>('');
  readonly error = signal<string>('');

  /** Returns true if a path has unsaved changes */
  isDirty(path: string): boolean {
    if (!path) return false;
    const current = this.fileBuffers()[path];
    const saved = this.savedBuffers()[path];
    return current !== undefined && current !== saved;
  }

  /** Load directory tree for a session */
  async loadTree(sessionId: string): Promise<void> {
    if (!sessionId) return;
    this.isLoadingTree.set(true);
    this.error.set('');

    try {
      const res = await fetch(`/api/session/${sessionId}/tree`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Failed to load tree (HTTP ${res.status})`);
      }

      // Merge expanded states from current tree
      const currentExpanded = new Set<string>();
      const collectExpanded = (nodes: FileNode[]) => {
        for (const n of nodes) {
          if (n.expanded) currentExpanded.add(n.path);
          if (n.children) collectExpanded(n.children);
        }
      };
      collectExpanded(this.tree());

      const applyExpanded = (nodes: FileNode[]) => {
        for (const n of nodes) {
          if (n.type === 'folder' && currentExpanded.has(n.path)) {
            n.expanded = true;
          }
          if (n.children) applyExpanded(n.children);
        }
      };
      applyExpanded(data.tree);

      this.tree.set(data.tree);
    } catch (err: any) {
      this.error.set(err.message ?? 'Error loading file tree');
    } finally {
      this.isLoadingTree.set(false);
    }
  }

  /** Open a file and set as active tab */
  async openFile(sessionId: string, relativePath: string): Promise<void> {
    if (!sessionId || !relativePath) return;

    // Add to open tabs if not present
    if (!this.openTabs().includes(relativePath)) {
      this.openTabs.update((tabs) => [...tabs, relativePath]);
    }
    this.activeTab.set(relativePath);

    // Fetch from disk if not yet loaded in buffer
    if (this.fileBuffers()[relativePath] === undefined) {
      this.isReadingFile.set(true);
      try {
        const res = await fetch(`/api/session/${sessionId}/file?path=${encodeURIComponent(relativePath)}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error ?? 'Failed to read file');

        const content = data.content ?? '';
        this.fileBuffers.update((b) => ({ ...b, [relativePath]: content }));
        this.savedBuffers.update((b) => ({ ...b, [relativePath]: content }));
      } catch (err: any) {
        this.error.set(err.message ?? 'Error opening file');
      } finally {
        this.isReadingFile.set(false);
      }
    }
  }

  /** Update buffer for live editing in textarea */
  updateBuffer(relativePath: string, content: string): void {
    if (!relativePath) return;
    this.fileBuffers.update((b) => ({ ...b, [relativePath]: content }));
  }

  /** Save file changes to disk */
  async saveFile(sessionId: string, relativePath: string): Promise<void> {
    if (!sessionId || !relativePath) return;
    const content = this.fileBuffers()[relativePath] ?? '';

    this.isSavingFile.set(true);
    this.saveStatus.set('Saving…');

    try {
      const res = await fetch(`/api/session/${sessionId}/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: relativePath, content }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to save file');

      this.savedBuffers.update((b) => ({ ...b, [relativePath]: content }));
      this.saveStatus.set('✓ Saved');
      setTimeout(() => this.saveStatus.set(''), 3000);
    } catch (err: any) {
      this.error.set(err.message ?? 'Error saving file');
      this.saveStatus.set('Save failed');
    } finally {
      this.isSavingFile.set(false);
    }
  }

  /** Close a file tab */
  closeTab(relativePath: string): void {
    const tabs = this.openTabs().filter((t) => t !== relativePath);
    this.openTabs.set(tabs);

    if (this.activeTab() === relativePath) {
      this.activeTab.set(tabs[tabs.length - 1] ?? '');
    }
  }

  /** Create new file or folder */
  async createNode(sessionId: string, relativePath: string, type: 'file' | 'folder'): Promise<void> {
    if (!sessionId || !relativePath) return;

    try {
      const res = await fetch(`/api/session/${sessionId}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: relativePath, type }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to create');

      await this.loadTree(sessionId);
      if (type === 'file') {
        await this.openFile(sessionId, relativePath);
      }
    } catch (err: any) {
      this.error.set(err.message ?? 'Error creating item');
    }
  }

  /** Clear all file state when session ends */
  clear(): void {
    this.tree.set([]);
    this.openTabs.set([]);
    this.activeTab.set('');
    this.fileBuffers.set({});
    this.savedBuffers.set({});
    this.saveStatus.set('');
    this.error.set('');
  }
}
