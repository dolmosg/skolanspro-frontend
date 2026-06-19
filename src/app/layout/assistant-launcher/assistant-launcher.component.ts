import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { AssistantPanelComponent } from '../assistant-panel/assistant-panel.component';
import { AssistantUiStateService } from '../../shared/services/assistant-ui-state-service';

const ASSISTANT_MODAL_COMPACT_MAX_WIDTH = 1599;

interface AssistantVisibilitySnapshot {
  opened: boolean;
  minimized: boolean;
}

/**
 * Global assistant launcher.
 *
 * This component owns the floating avatar entry point and coordinates the
 * visibility of the assistant panel. AppShell should only render this component
 * and remain unaware of the assistant internals.
 */
@Component({
  selector: 'app-assistant-launcher',
  standalone: true,
  imports: [CommonModule, AssistantPanelComponent],
  templateUrl: './assistant-launcher.component.html',
  styleUrl: './assistant-launcher.component.scss',
})
export class AssistantLauncherComponent {
  protected readonly ui = inject(AssistantUiStateService);
  private readonly viewportWidth = signal(window.innerWidth);
  private readonly modalDockExpanded = signal(false);
  private visibilityBeforeModal: AssistantVisibilitySnapshot | null = null;

  protected readonly useModalCompactMode = computed(() => {
    return this.ui.isModalActive() && this.viewportWidth() <= ASSISTANT_MODAL_COMPACT_MAX_WIDTH;
  });

  protected readonly showLauncher = computed(() => {
    if (this.ui.isModalActive()) {
      return (
        !this.modalDockExpanded() &&
        (!this.ui.isOpened() || this.ui.isMinimized() || this.useModalCompactMode())
      );
    }

    return !this.ui.isOpened() || this.ui.isMinimized();
  });

  protected readonly showPanel = computed(() => {
    if (this.ui.isModalActive()) {
      return (
        this.ui.isOpened() &&
        !this.ui.isMinimized() &&
        (!this.useModalCompactMode() || this.modalDockExpanded())
      );
    }

    return this.ui.isOpened() && !this.ui.isMinimized();
  });

  protected readonly launcherOverModalBackdrop = computed(() => {
    return this.ui.isModalActive() && this.showLauncher();
  });

  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.viewportWidth.set(window.innerWidth);
  }

  constructor() {
    effect(() => {
      const modalActive = this.ui.isModalActive();
      const compactMode = this.useModalCompactMode();
      const opened = this.ui.isOpened();
      const minimized = this.ui.isMinimized();

      if (!modalActive) {
        this.restoreVisibilityBeforeModal();
        this.modalDockExpanded.set(false);
        return;
      }

      this.captureVisibilityBeforeModal();

      if (compactMode && opened && !minimized && !this.modalDockExpanded()) {
        this.ui.minimize();
        return;
      }

      if (this.modalDockExpanded() && (!opened || minimized)) {
        this.modalDockExpanded.set(false);
      }
    });
  }

  protected openAssistant(): void {
    if (this.ui.isModalActive()) {
      if (!this.ui.isOpened() || this.ui.isMinimized()) {
        this.ui.restore();
      }

      this.modalDockExpanded.set(true);
      return;
    }

    if (this.ui.isOpened() && !this.ui.isMinimized()) {
      this.ui.minimize();
      return;
    }

    this.ui.restore();
  }

  private captureVisibilityBeforeModal(): void {
    if (this.visibilityBeforeModal) {
      return;
    }

    this.visibilityBeforeModal = {
      opened: this.ui.isOpened(),
      minimized: this.ui.isMinimized(),
    };
  }

  private restoreVisibilityBeforeModal(): void {
    const snapshot = this.visibilityBeforeModal;

    if (!snapshot) {
      return;
    }

    this.visibilityBeforeModal = null;

    if (!snapshot.opened) {
      this.ui.close();
      return;
    }

    this.ui.restore();

    if (snapshot.minimized) {
      this.ui.minimize();
    }
  }
}
