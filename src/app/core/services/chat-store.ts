import { Injectable, signal, computed } from '@angular/core';

export type MessageType = 'text' | 'tool_call' | 'tool_result';

export interface DisplayMessage {
  id: string;
  role: 'user' | 'model' | 'tool';
  type: MessageType;
  content: string;
  // Tool-specific fields
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: string;
  toolError?: string;
  streaming: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ChatStoreService {
  private readonly _messages = signal<DisplayMessage[]>([]);

  readonly messages = computed(() => this._messages());
  readonly isStreaming = computed(() => this._messages().some((m) => m.streaming));

  addMessage(msg: Omit<DisplayMessage, 'id'>): string {
    const id = crypto.randomUUID();
    this._messages.update((msgs) => [...msgs, { ...msg, id }]);
    return id;
  }

  appendToMessage(id: string, chunk: string): void {
    this._messages.update((msgs) =>
      msgs.map((m) => (m.id === id ? { ...m, content: m.content + chunk } : m))
    );
  }

  updateMessage(id: string, patch: Partial<DisplayMessage>): void {
    this._messages.update((msgs) =>
      msgs.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }

  finalizeMessage(id: string): void {
    this._messages.update((msgs) =>
      msgs.map((m) => (m.id === id ? { ...m, streaming: false } : m))
    );
  }

  clear(): void {
    this._messages.set([]);
  }
}
