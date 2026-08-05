import { Component, inject, signal, computed, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../core/services/theme';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative" #dropdownContainer>
      <!-- Trigger Button -->
      <button
        type="button"
        (click)="toggleOpen()"
        class="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium bg-surface-2 hover:bg-surface-3 border border-border text-text transition-all shadow-sm"
        title="Select Theme">
        <!-- Swatch preview -->
        <div class="flex items-center -space-x-1 overflow-hidden">
          @for (color of currentTheme()?.swatch || []; track color) {
            <span class="w-2.5 h-2.5 rounded-full border border-border" [style.background-color]="color"></span>
          }
        </div>
        <span>{{ currentTheme()?.label || 'Theme' }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-text-muted transition-transform" [class.rotate-180]="isOpen()" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown Panel -->
      @if (isOpen()) {
        <div class="absolute right-0 mt-1.5 w-48 rounded-lg bg-surface border border-border shadow-lg py-1 z-50 animate-fade-in font-sans">
          <div class="px-3 py-1.5 text-[10px] font-mono font-semibold text-text-muted uppercase tracking-wider border-b border-border/50">
            Appearance
          </div>
          <div class="py-1">
            @for (t of themeService.themes; track t.id) {
              <button
                type="button"
                (click)="selectTheme(t.id)"
                class="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-surface-2 transition-colors text-text">
                <div class="flex items-center gap-2.5">
                  <div class="flex items-center -space-x-1">
                    @for (color of t.swatch; track color) {
                      <span class="w-2.5 h-2.5 rounded-full border border-border" [style.background-color]="color"></span>
                    }
                  </div>
                  <span [class.font-semibold]="t.id === themeService.current()">{{ t.label }}</span>
                </div>
                @if (t.id === themeService.current()) {
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                }
              </button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class ThemeSwitcherComponent {
  readonly themeService = inject(ThemeService);
  readonly isOpen = signal(false);

  private elementRef = inject(ElementRef);

  readonly currentTheme = computed(() => {
    return this.themeService.themes.find((t) => t.id === this.themeService.current());
  });

  toggleOpen(): void {
    this.isOpen.update((v) => !v);
  }

  selectTheme(id: string): void {
    this.themeService.setTheme(id);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.isOpen.set(false);
  }
}
