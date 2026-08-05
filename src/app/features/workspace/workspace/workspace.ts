import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatPanelComponent } from '../chat-panel/chat-panel';
import { FileTreeComponent } from '../file-tree/file-tree';
import { EditorPanelComponent } from '../editor-panel/editor-panel';
import { SessionSetupComponent } from '../session-setup/session-setup';
import { ThemeSwitcherComponent } from '../../../shared/theme-switcher/theme-switcher';
import { SessionService } from '../../../core/services/session';
import { FileService } from '../../../core/services/file';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [
    CommonModule,
    ChatPanelComponent,
    FileTreeComponent,
    EditorPanelComponent,
    SessionSetupComponent,
    ThemeSwitcherComponent,
  ],
  templateUrl: './workspace.html',
  styleUrl: './workspace.css',
})
export class WorkspaceComponent {
  readonly sessionService = inject(SessionService);
  readonly fileService = inject(FileService);
  readonly sidebarOpen = signal(true);
  readonly chatOpen = signal(true);

  constructor() {
    effect(() => {
      const id = this.sessionService.sessionId();
      if (id) {
        this.fileService.loadTree(id);
      } else {
        this.fileService.clear();
      }
    });
  }

  toggleSidebar(): void { this.sidebarOpen.update((v) => !v); }
  toggleChat(): void { this.chatOpen.update((v) => !v); }

  changeSession(): void {
    this.sessionService.clearSession();
    this.fileService.clear();
  }
}
