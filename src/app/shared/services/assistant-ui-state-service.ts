import { Injectable, computed, signal } from '@angular/core';

export type AssistantUiState =
  | 'idle'
  | 'context-ready'
  | 'thinking'
  | 'ready'
  | 'listening'
  | 'error'
  | 'suggestion';

@Injectable({
  providedIn: 'root',
})
export class AssistantUiStateService {
  private readonly state = signal<AssistantUiState>('idle');
  private readonly opened = signal(false);
  private readonly minimized = signal(false);
  private readonly modalModeActive = signal(false);

  readonly currentState = this.state.asReadonly();
  readonly isOpened = this.opened.asReadonly();
  readonly isMinimized = this.minimized.asReadonly();
  readonly modalActive = this.modalModeActive.asReadonly();

  readonly stateClass = computed(() => `assistant--${this.state()}`);
  readonly isModalActive = computed(() => this.modalModeActive());

  open(): void {
    this.opened.set(true);
    this.minimized.set(false);
  }

  close(): void {
    this.opened.set(false);
  }

  minimize(): void {
    this.minimized.set(true);
  }

  restore(): void {
    this.minimized.set(false);
    this.opened.set(true);
  }

  setState(state: AssistantUiState): void {
    this.state.set(state);
  }

  enterModalMode(): void {
    this.modalModeActive.set(true);
  }

  leaveModalMode(): void {
    this.modalModeActive.set(false);
  }

  flashReady(): void {
    this.state.set('ready');
    window.setTimeout(() => this.state.set('context-ready'), 300);
  }
}
