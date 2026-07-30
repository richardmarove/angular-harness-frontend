import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatPanelComponent } from '../chat-panel/chat-panel';
import { FileTreeComponent } from '../file-tree/file-tree';
import { EditorPanelComponent } from '../editor-panel/editor-panel';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [CommonModule, ChatPanelComponent, FileTreeComponent, EditorPanelComponent],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
})
export class WorkspaceComponent {
  readonly sidebarOpen = signal(true);
  readonly chatOpen = signal(true);

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  toggleChat(): void {
    this.chatOpen.update((v) => !v);
  }
}
