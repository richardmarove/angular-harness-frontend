import { Injectable, signal } from '@angular/core';

export interface ThemeDefinition {
  id: string;
  label: string;
  swatch: string[];
}

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly themes: ThemeDefinition[] = [
    {
      id: 'gruvbox-light',
      label: 'Gruvbox Light',
      swatch: ['#fbf1c7', '#ebdbb2', '#d5c4a1', '#282828'],
    },
    {
      id: 'gruvbox-dark',
      label: 'Gruvbox Dark',
      swatch: ['#282828', '#3c3836', '#504945', '#ebdbb2'],
    },
  ];

  readonly current = signal<string>(this.getInitialTheme());

  constructor() {
    this.applyTheme(this.current());
  }

  setTheme(id: string): void {
    const found = this.themes.find((t) => t.id === id);
    if (!found) return;

    this.current.set(id);
    localStorage.setItem('theme', id);
    this.applyTheme(id);
  }

  private getInitialTheme(): string {
    const saved = localStorage.getItem('theme');
    if (saved && this.themes.some((t) => t.id === saved)) {
      return saved;
    }
    return 'gruvbox-light';
  }

  private applyTheme(id: string): void {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset['theme'] = id;
    }
  }
}
