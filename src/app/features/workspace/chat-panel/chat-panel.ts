import { Component, inject, signal, ElementRef, ViewChild, AfterViewChecked, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AgentService } from '../../../core/services/agent';
import { ChatStoreService, DisplayMessage } from '../../../core/services/chat-store';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.css',
})
export class ChatPanelComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('messageList') private messageList!: ElementRef<HTMLDivElement>;

  private agentService = inject(AgentService);
  private chatStore = inject(ChatStoreService);
  private streamSub?: Subscription;

  readonly messages = this.chatStore.messages;
  readonly isStreaming = this.chatStore.isStreaming;
  readonly userInput = signal('');
  readonly errorMsg = signal('');

  private shouldScrollBottom = false;

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.streamSub?.unsubscribe();
  }

  onInputChange(value: string): void {
    this.userInput.set(value);
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(): void {
    const text = this.userInput().trim();
    if (!text || this.isStreaming()) return;

    this.errorMsg.set('');
    this.userInput.set('');

    // Add user message
    this.chatStore.addMessage({ role: 'user', content: text, streaming: false });
    this.shouldScrollBottom = true;

    // Build history for API
    const history = this.messages().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Add empty streaming model message
    const modelMsgId = this.chatStore.addMessage({
      role: 'model',
      content: '',
      streaming: true,
    });

    this.streamSub = this.agentService.streamChat(history).subscribe({
      next: (chunk) => {
        this.chatStore.appendToMessage(modelMsgId, chunk);
        this.shouldScrollBottom = true;
      },
      error: (err) => {
        this.chatStore.finalizeMessage(modelMsgId);
        this.errorMsg.set('Connection error. Please try again.');
        console.error('Stream error:', err);
      },
      complete: () => {
        this.chatStore.finalizeMessage(modelMsgId);
        this.shouldScrollBottom = true;
      },
    });
  }

  clearChat(): void {
    this.streamSub?.unsubscribe();
    this.chatStore.clear();
  }

  trackById(_: number, msg: DisplayMessage): string {
    return msg.id;
  }

  private scrollToBottom(): void {
    try {
      const el = this.messageList?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
