import { Component, input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DisplayMessage } from '../../../../core/services/chat-store';
import { ToolEventComponent } from '../tool-event/tool-event';

@Component({
  selector: 'app-tool-group',
  standalone: true,
  imports: [CommonModule, ToolEventComponent],
  templateUrl: './tool-group.html',
  styleUrl: './tool-group.css',
})
export class ToolGroupComponent {
  readonly calls = input<DisplayMessage[]>([]);

  readonly expanded = signal(false);

  toggle(): void {
    this.expanded.update((v) => !v);
  }

  readonly isStreaming = computed(() => this.calls().some((c) => c.streaming));
  readonly hasError = computed(() => this.calls().some((c) => !!c.toolError));

  get statusLabel(): string {
    if (this.isStreaming()) return 'Running…';
    if (this.hasError()) return 'Some failed';
    return 'All succeeded';
  }

  trackByCallId(_: number, msg: DisplayMessage): string {
    return msg.id;
  }
}
