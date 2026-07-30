import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tool-event',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tool-event.html',
  styleUrl: './tool-event.css',
})
export class ToolEventComponent {
  @Input() toolName = '';
  @Input() toolArgs: Record<string, unknown> = {};
  @Input() toolResult = '';
  @Input() toolError = '';
  @Input() isStreaming = false;

  readonly expanded = signal(false);
  readonly copied = signal(false);

  toggle(): void {
    this.expanded.update((v) => !v);
  }

  copyOutput(): void {
    const text = this.toolError || this.toolResult;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  get argsPreview(): string {
    const entries = Object.entries(this.toolArgs);
    if (entries.length === 0) return '';
    const [key, val] = entries[0];
    const str = String(val);
    return `${key}: "${str.length > 35 ? str.slice(0, 35) + '…' : str}"`;
  }
}
