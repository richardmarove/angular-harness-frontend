import { Injectable, signal, computed } from '@angular/core';
import { ChatMessage } from './agent';

export interface DisplayMessage extends ChatMessage {
  id: string;
  streaming: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ChatStoreService {
  private readonly _messages = signal<DisplayMessage[]>([]);

  /** Read-only view of the messages array */
  readonly messages = computed(() => this._messages());

  /** Whether a response is currently streaming */
  readonly isStreaming = computed(() =>
    this._messages().some((m) => m.streaming)
  );

  /**
   * Appends a new message to the store.
   * Returns the generated ID so callers can update it later.
   */
  addMessage(msg: Omit<DisplayMessage, 'id'>): string {
    const id = crypto.randomUUID();
    this._messages.update((msgs) => [...msgs, { ...msg, id }]);
    return id;
  }

  /** Appends a text chunk to an in-progress streaming message */
  appendToMessage(id: string, chunk: string): void {
    this._messages.update((msgs) =>
      msgs.map((m) => (m.id === id ? { ...m, content: m.content + chunk } : m))
    );
  }

  /** Marks a streaming message as complete */
  finalizeMessage(id: string): void {
    this._messages.update((msgs) =>
      msgs.map((m) => (m.id === id ? { ...m, streaming: false } : m))
    );
  }

  /** Clears all messages */
  clear(): void {
    this._messages.set([]);
  }
}
