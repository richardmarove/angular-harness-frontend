import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  readonly workingDir = signal<string>('');
  readonly sessionId = signal<string>('');
  readonly isConfigured = computed(() => !!this.workingDir());
  readonly isLoading = signal(false);
  readonly error = signal<string>('');

  async createSession(workingDir: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set('');

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workingDir }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `Server error ${res.status}`);
      }

      this.workingDir.set(data.workingDir);
      this.sessionId.set(data.id);
    } catch (err) {
      this.error.set(String(err instanceof Error ? err.message : err));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  clearSession(): void {
    this.workingDir.set('');
    this.sessionId.set('');
    this.error.set('');
  }
}
