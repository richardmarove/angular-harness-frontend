import { Component, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService } from '../../../core/services/file';
import { SessionService } from '../../../core/services/session';

@Component({
  selector: 'app-editor-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-panel.html',
  styleUrl: './editor-panel.css',
})
export class EditorPanelComponent {
  readonly fileService = inject(FileService);
  readonly sessionService = inject(SessionService);

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.saveCurrentFile();
    }
  }

  selectTab(path: string): void {
    const id = this.sessionService.sessionId();
    if (id) {
      this.fileService.openFile(id, path);
    }
  }

  closeTab(path: string, event: MouseEvent): void {
    event.stopPropagation();
    this.fileService.closeTab(path);
  }

  onCodeInput(content: string): void {
    const active = this.fileService.activeTab();
    if (active) {
      this.fileService.updateBuffer(active, content);
    }
  }

  saveCurrentFile(): void {
    const active = this.fileService.activeTab();
    const id = this.sessionService.sessionId();
    if (active && id) {
      this.fileService.saveFile(id, active);
    }
  }

  getCurrentCode(): string {
    const active = this.fileService.activeTab();
    if (!active) return '';
    return this.fileService.fileBuffers()[active] ?? '';
  }

  isCurrentDirty(): boolean {
    const active = this.fileService.activeTab();
    return this.fileService.isDirty(active);
  }

  getFileType(path: string): 'ts' | 'css' | 'html' | 'json' | 'default' {
    if (!path) return 'default';
    const lower = path.toLowerCase();
    if (lower.endsWith('.ts')) return 'ts';
    if (lower.endsWith('.css') || lower.endsWith('.scss')) return 'css';
    if (lower.endsWith('.html')) return 'html';
    if (lower.endsWith('.json')) return 'json';
    return 'default';
  }

  getFileName(path: string): string {
    if (!path) return '';
    const parts = path.split('/');
    return parts[parts.length - 1] ?? path;
  }

  getLineNumbers(): number[] {
    const lines = this.getCurrentCode().split('\n').length;
    return Array.from({ length: Math.max(lines, 1) }, (_, i) => i + 1);
  }
}
