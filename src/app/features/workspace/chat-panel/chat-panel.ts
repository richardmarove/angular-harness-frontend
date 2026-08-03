import {
  Component, inject, signal, ElementRef, ViewChild,
  AfterViewInit, AfterViewChecked, OnDestroy, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AgentService, AgentError } from '../../../core/services/agent';
import { ChatStoreService, DisplayMessage } from '../../../core/services/chat-store';
import { SessionService } from '../../../core/services/session';
import { ToolEventComponent } from './tool-event/tool-event';
import { ToolGroupComponent } from './tool-group/tool-group';
import { ThoughtCardComponent } from './thought-card/thought-card';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';

type RenderItem =
  | { kind: 'message'; id: string; msg: DisplayMessage }
  | { kind: 'tool_group'; id: string; calls: DisplayMessage[] };

export interface AgentErrorInfo {
  title: string;
  message: string;
  code?: number | string;
  raw?: string;
  retryAfterSec?: number;
  hasMutatingCalls: boolean;
  turnId?: string;
  isUnavailable: boolean;
}

const MUTATING_TOOLS = new Set(['write_file', 'run_command']);

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, ToolEventComponent, ToolGroupComponent, MarkdownPipe, ThoughtCardComponent],
  templateUrl: './chat-panel.html',
  styleUrl: './chat-panel.css',
  host: {
    'class': 'flex-1 flex flex-col min-h-0 overflow-hidden',
  },
})
export class ChatPanelComponent implements AfterViewInit, AfterViewChecked, OnDestroy {
  @ViewChild('messageList') private messageList!: ElementRef<HTMLDivElement>;
  @ViewChild('chatInput') private chatInputRef!: ElementRef<HTMLTextAreaElement>;

  private agentService = inject(AgentService);
  private chatStore = inject(ChatStoreService);
  readonly sessionService = inject(SessionService);
  private streamSub?: Subscription;

  readonly messages = this.chatStore.messages;
  readonly isStreaming = this.chatStore.isStreaming;
  readonly userInput = signal('');
  readonly errorMsg = signal<AgentErrorInfo | null>(null);
  readonly retryCountdown = signal(0);
  private countdownHandle?: ReturnType<typeof setInterval>;
  private static readonly UNAVAILABLE_BACKOFF = [3, 6, 12]; // seconds, escalating
  private unavailableAttempt = 0;
  private autoRetryHandle?: ReturnType<typeof setTimeout>;
  private lastHistory: { role: 'user' | 'model'; content: string }[] = [];
  private currentTurnId: string | null = null;

  readonly samplePrompts = signal([
    'Analyze workspace structure & components',
    'Check and fix potential build or lint errors',
    'Refactor client styling with modern dark theme',
  ]);

  private shouldScrollBottom = false;

  readonly renderItems = computed<RenderItem[]>(() => {
    const items: RenderItem[] = [];
    let currentGroup: DisplayMessage[] = [];

    const flushGroup = () => {
      if (currentGroup.length > 0) {
        items.push({ kind: 'tool_group', id: currentGroup[0].id, calls: currentGroup });
        currentGroup = [];
      }
    };

    for (const msg of this.messages()) {
      if (msg.type === 'tool_call') {
        currentGroup.push(msg);
      } else {
        flushGroup();
        items.push({ kind: 'message', id: msg.id, msg });
      }
    }
    flushGroup();
    return items;
  });

  ngAfterViewInit(): void {
    this.autoResize();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.streamSub?.unsubscribe();
    this.clearCountdown();
  }

  onInputChange(value: string): void {
    this.userInput.set(value);
    this.autoResize();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  sendQuickPrompt(promptText: string): void {
    this.userInput.set(promptText);
    this.send();
  }

  send(): void {
    const text = this.userInput().trim();
    if (!text || this.isStreaming()) return;

    this.errorMsg.set(null);
    this.clearCountdown();
    this.unavailableAttempt = 0;
    this.userInput.set('');

    this.chatStore.addMessage({ role: 'user', type: 'text', content: text, streaming: false });
    this.shouldScrollBottom = true;

    const history = this.messages()
      .filter((m) => m.type === 'text')
      .map((m) => ({ role: m.role as 'user' | 'model', content: m.content }));

    this.lastHistory = history;
    this.runAgent(history);
  }

  retry(): void {
    if (this.retryCountdown() > 0 || this.isStreaming()) return;
    const resumeTurnId = this.errorMsg()?.turnId;
    this.errorMsg.set(null);
    this.runAgent(this.lastHistory, resumeTurnId);
  }

  dismissError(): void {
    this.errorMsg.set(null);
    this.clearCountdown();
    this.unavailableAttempt = 0;
  }

  private runAgent(history: { role: 'user' | 'model'; content: string }[], resumeTurnId?: string): void {
    let modelMsgId: string | null = null;
    let activeToolMsgId: string | null = null;
    let thoughtMsgId: string | null = null;

    this.streamSub = this.agentService
      .runAgent({ messages: history, workingDir: this.sessionService.workingDir(), turnId: resumeTurnId })
      .subscribe({
        next: (event) => {
          this.shouldScrollBottom = true;

          if (event.type === 'turn') {
            this.currentTurnId = event.turnId;
          } else if (event.type === 'thought') {
            if (thoughtMsgId === null) {
              thoughtMsgId = this.chatStore.addMessage({
                role: 'model', type: 'thought', content: '', streaming: true,
              });
            }
            this.chatStore.appendToMessage(thoughtMsgId, event.text);
          } else if (event.type === 'tool_call') {
            if (thoughtMsgId) {
              this.chatStore.finalizeMessage(thoughtMsgId);
              thoughtMsgId = null;
            }
            activeToolMsgId = this.chatStore.addMessage({
              role: 'tool', type: 'tool_call', content: '',
              toolName: event.name, toolArgs: event.args, streaming: true,
            });
          } else if (event.type === 'tool_result') {
            if (activeToolMsgId) {
              this.chatStore.updateMessage(activeToolMsgId, {
                toolResult: event.result, toolError: event.error, streaming: false,
              });
              activeToolMsgId = null;
            }
          } else if (event.type === 'chunk') {
            if (thoughtMsgId) {
              this.chatStore.finalizeMessage(thoughtMsgId);
              thoughtMsgId = null;
            }
            if (modelMsgId === null) {
              modelMsgId = this.chatStore.addMessage({
                role: 'model', type: 'text', content: '', streaming: true,
              });
            }
            this.chatStore.appendToMessage(modelMsgId, event.text);
          }
        },
        error: (err: AgentError) => {
          if (thoughtMsgId) this.chatStore.finalizeMessage(thoughtMsgId);
          if (modelMsgId) this.chatStore.finalizeMessage(modelMsgId);
          if (activeToolMsgId) this.chatStore.finalizeMessage(activeToolMsgId);
          const turnId = err.turnId ?? this.currentTurnId ?? undefined;
          this.errorMsg.set(this.toErrorInfo(err, turnId));

          if (err.retryAfterSec) {
            this.startCountdown(err.retryAfterSec);
          } else if (err.status === 'UNAVAILABLE') {
            this.startAutoRetry();
          }
          console.error('Agent error:', err);
        },
        complete: () => {
          if (thoughtMsgId) this.chatStore.finalizeMessage(thoughtMsgId);
          if (modelMsgId) this.chatStore.finalizeMessage(modelMsgId);
          this.currentTurnId = null;
          this.unavailableAttempt = 0;
          this.shouldScrollBottom = true;
        },
      });
  }

  private toErrorInfo(err: AgentError, turnId?: string): AgentErrorInfo {
    let title = 'Something went wrong';
    if (err.status === 'RESOURCE_EXHAUSTED') title = 'Rate limit reached';
    else if (err.status === 'UNAVAILABLE') title = 'Model unavailable';
    else if (err.status === 'PERMISSION_DENIED') title = 'Access denied';
    else if (!err.status) title = 'Connection error';
    return {
      title,
      message: err.message || 'Please try again.',
      code: err.code,
      raw: err.raw,
      retryAfterSec: err.retryAfterSec,
      hasMutatingCalls: this.hadMutatingCallsSinceLastUserMsg(),
      turnId,
      isUnavailable: err.status === 'UNAVAILABLE',
    };
  }

  private hadMutatingCallsSinceLastUserMsg(): boolean {
    const msgs = this.messages();
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user' && msgs[i].type === 'text') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return false;

    return msgs
      .slice(lastUserIdx + 1)
      .some((m) => m.type === 'tool_call' && MUTATING_TOOLS.has(m.toolName ?? ''));
  }

  private startAutoRetry(): void {
    if (this.unavailableAttempt >= ChatPanelComponent.UNAVAILABLE_BACKOFF.length) return;
    const delay = ChatPanelComponent.UNAVAILABLE_BACKOFF[this.unavailableAttempt];
    this.unavailableAttempt++;
    this.retryCountdown.set(delay);

    this.countdownHandle = setInterval(() => {
      const next = this.retryCountdown() - 1;
      if (next <= 0) {
        this.clearCountdown();
        this.retryCountdown.set(0);
        this.retry(); // single source of truth — no separate setTimeout
      } else {
        this.retryCountdown.set(next);
      }
    }, 1000);
  }

  private startCountdown(seconds: number): void {
    this.retryCountdown.set(seconds);
    this.countdownHandle = setInterval(() => {
      const next = this.retryCountdown() - 1;
      if (next <= 0) {
        this.retryCountdown.set(0);
        this.clearCountdown();
      } else {
        this.retryCountdown.set(next);
      }
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.autoRetryHandle) clearTimeout(this.autoRetryHandle);
    this.autoRetryHandle = undefined;
  }

  clearChat(): void {
    this.streamSub?.unsubscribe();
    this.clearCountdown();
    this.currentTurnId = null;
    this.chatStore.clear();
  }

  isToolMsg(msg: DisplayMessage): boolean {
    return msg.type === 'tool_call';
  }

  trackById(_: number, item: RenderItem): string {
    return item.id;
  }

  private autoResize(): void {
    const el = this.chatInputRef?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  private scrollToBottom(): void {
    try {
      const el = this.messageList?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
