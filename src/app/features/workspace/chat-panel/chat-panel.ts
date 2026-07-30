import {
  Component, inject, signal, ElementRef, ViewChild,
  AfterViewChecked, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AgentService } from '../../../core/services/agent';
import { ChatStoreService, DisplayMessage } from '../../../core/services/chat-store';
import { SessionService } from '../../../core/services/session';
import { ToolEventComponent } from './tool-event/tool-event';

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolEventComponent],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.css',
})
export class ChatPanelComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('messageList') private messageList!: ElementRef<HTMLDivElement>;

  private agentService = inject(AgentService);
  private chatStore = inject(ChatStoreService);
  readonly sessionService = inject(SessionService);
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
    this.chatStore.addMessage({ role: 'user', type: 'text', content: text, streaming: false });
    this.shouldScrollBottom = true;

    // Build history (text messages only — tool events are internal)
    const history = this.messages()
      .filter((m) => m.type === 'text')
      .map((m) => ({ role: m.role as 'user' | 'model', content: m.content }));

    // Add empty streaming AI text message
    const modelMsgId = this.chatStore.addMessage({
      role: 'model', type: 'text', content: '', streaming: true,
    });

    // Track active tool call message ID for result updates
    let activeToolMsgId: string | null = null;

    this.streamSub = this.agentService
      .runAgent({ messages: history, workingDir: this.sessionService.workingDir() })
      .subscribe({
        next: (event) => {
          this.shouldScrollBottom = true;

          if (event.type === 'tool_call') {
            // Insert a pending tool event row
            activeToolMsgId = this.chatStore.addMessage({
              role: 'tool',
              type: 'tool_call',
              content: '',
              toolName: event.name,
              toolArgs: event.args,
              streaming: true,
            });
          } else if (event.type === 'tool_result') {
            // Populate the pending tool row with the result
            if (activeToolMsgId) {
              this.chatStore.updateMessage(activeToolMsgId, {
                toolResult: event.result,
                toolError: event.error,
                streaming: false,
              });
              activeToolMsgId = null;
            }
          } else if (event.type === 'chunk') {
            this.chatStore.appendToMessage(modelMsgId, event.text);
          }
        },
        error: (err) => {
          this.chatStore.finalizeMessage(modelMsgId);
          if (activeToolMsgId) this.chatStore.finalizeMessage(activeToolMsgId);
          this.errorMsg.set(err?.message ?? 'Connection error. Please try again.');
          console.error('Agent error:', err);
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

  isToolMsg(msg: DisplayMessage): boolean {
    return msg.type === 'tool_call';
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
