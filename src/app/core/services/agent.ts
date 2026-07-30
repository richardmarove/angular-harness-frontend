import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class AgentService {
  /**
   * Sends the conversation history to the Hono backend and returns
   * an Observable that emits streamed text chunks via SSE.
   */
  streamChat(messages: ChatMessage[]): Observable<string> {
    return new Observable((observer) => {
      const controller = new AbortController();

      fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            observer.error(new Error(`HTTP ${response.status}: ${response.statusText}`));
            return;
          }

          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (line.startsWith('data:')) {
                const data = line.slice(5).trim();
                if (data === '[DONE]') {
                  observer.complete();
                  return;
                }
                if (data) observer.next(data);
              }

              if (line.startsWith('event: error')) {
                observer.error(new Error('Stream error from server'));
                return;
              }
            }
          }
          observer.complete();
        })
        .catch((err) => {
          if (err.name !== 'AbortError') observer.error(err);
        });

      // Teardown: abort fetch when Observable is unsubscribed
      return () => controller.abort();
    });
  }
}
