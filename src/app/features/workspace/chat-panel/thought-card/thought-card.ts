import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarkdownPipe } from '../../../../shared/pipes/markdown.pipe';

@Component({
  selector: 'app-thought-card',
  standalone: true,
  imports: [CommonModule, MarkdownPipe],
  templateUrl: './thought-card.html',
  styleUrl: './thought-card.css',
})
export class ThoughtCardComponent {
  @Input() content = '';
  @Input() isStreaming = false;

  readonly expanded = signal(false); // collapsed by default

  toggle(): void {
    this.expanded.update((v) => !v);
  }
}
