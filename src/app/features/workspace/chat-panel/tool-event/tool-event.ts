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

  toggle(): void {
    this.expanded.update((v) => !v);
  }

  get argsPreview(): string {
    const entries = Object.entries(this.toolArgs);
    if (entries.length === 0) return '';
    const [key, val] = entries[0];
    const str = String(val);
    return `${key}: "${str.length > 40 ? str.slice(0, 40) + '…' : str}"`;
  }

  get resultLines(): string[] {
    return (this.toolResult || '').split('\n').slice(0, 20);
  }
}
