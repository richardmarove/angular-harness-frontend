import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export type AgentEvent =
  | { type: 'tool_call'; name: string; args: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: string; error?: string }
  | { type: 'chunk'; text: string }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface RunRequest {
  messages: ChatMessage[];
  workingDir: string;
}

@Injectable({
  providedIn: 'root',
})
export class AgentService {
  /**
   * Runs the agent loop for a given task. Returns an Observable that emits
   * typed AgentEvents (tool_call, tool_result, chunk, done, error).
   */
  runAgent(req: RunRequest): Observable<AgentEvent> {
    return new Observable((observer) => {
      const controller = new AbortController();

      fetch('/api/agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            observer.error(new Error((body as any).error ?? `HTTP ${response.status}`));
            return;
          }

          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let currentEvent = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (line.startsWith('event:')) {
                currentEvent = line.slice(6).trim();
              } else if (line.startsWith('data:')) {
                const raw = line.slice(5).trim();
                if (!raw) continue;

                try {
                  const payload = JSON.parse(raw);
                  const event: AgentEvent = { type: currentEvent as any, ...payload };

                  if (event.type === 'done') {
                    observer.next(event);
                    observer.complete();
                    return;
                  }

                  if (event.type === 'error') {
                    observer.error(new Error(event.message));
                    return;
                  }

                  observer.next(event);
                } catch {
                  // malformed JSON chunk — skip
                }

                currentEvent = '';
              }
            }
          }

          observer.complete();
        })
        .catch((err) => {
          if (err.name !== 'AbortError') observer.error(err);
        });

      return () => controller.abort();
    });
  }
}
