import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../../core/services/session';

@Component({
  selector: 'app-session-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './session-setup.html',
  styleUrl: './session-setup.css',
})
export class SessionSetupComponent {
  private sessionService = inject(SessionService);

  readonly isLoading = this.sessionService.isLoading;
  readonly error = this.sessionService.error;
  readonly workingDir = signal('');

  readonly presets = signal([
    '/home/rickymarove/angular-learning/angular-harness',
    '/home/rickymarove/angular-learning/angular-harness/client',
  ]);

  selectPreset(preset: string): void {
    this.workingDir.set(preset);
  }

  onDirChange(value: string): void {
    this.workingDir.set(value);
  }

  async startSession(): Promise<void> {
    const dir = this.workingDir().trim();
    if (!dir) return;
    await this.sessionService.createSession(dir).catch(() => {/* error shown via signal */});
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.startSession();
  }
}
