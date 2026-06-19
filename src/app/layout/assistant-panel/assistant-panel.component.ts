import { CommonModule } from '@angular/common';
import { Component, HostListener, effect, inject, signal } from '@angular/core';
import { AssistantUiStateService } from '../../shared/services/assistant-ui-state-service';
import { AssistantContextService } from '../../shared/services/assistant-context-service';

interface AssistantPanelPosition {
  x: number;
  y: number;
}

interface AssistantPanelDragState {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
}

const ASSISTANT_PANEL_POSITION_STORAGE_KEY = 'skolans.assistant.panel.position';
const ASSISTANT_PANEL_WIDTH = 420;
const ASSISTANT_PANEL_HEIGHT = 560;
const ASSISTANT_PANEL_MARGIN = 16;
const ASSISTANT_PANEL_MIN_X = 280;
const ASSISTANT_PANEL_MIN_Y = 76;
const ASSISTANT_PANEL_MODAL_SAFE_MARGIN = 24;

/**
 * Floating assistant panel.
 *
 * This component owns the assistant window UI. It is intentionally isolated
 * from AppShell so future chat, context visualization, dragging, resizing and
 * AI interaction can evolve independently.
 */
@Component({
  selector: 'app-assistant-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './assistant-panel.component.html',
  styleUrl: './assistant-panel.component.scss',
})
export class AssistantPanelComponent {
  protected readonly ui = inject(AssistantUiStateService);
  protected readonly assistantContext = inject(AssistantContextService);
  protected readonly headerTitle = this.assistantContext.headerTitle;
  protected readonly headerDescription = this.assistantContext.headerDescription;
  protected readonly breadcrumb = this.assistantContext.contextBreadcrumb;

  private dragState: AssistantPanelDragState | null = null;
  private positionBeforeModal: AssistantPanelPosition | null = null;

  protected readonly position = signal<AssistantPanelPosition>(this.getInitialPosition());

  protected readonly panelStyle = () => {
    const position = this.position();

    return {
      left: `${position.x}px`,
      top: `${position.y}px`,
    };
  };

  constructor() {
    effect(() => {
      if (this.ui.isModalActive()) {
        this.enterModalSafePosition();
        return;
      }

      this.leaveModalSafePosition();
    });
  }

  protected close(): void {
    this.ui.close();
  }

  protected minimize(): void {
    this.ui.minimize();
  }

  protected startDrag(event: PointerEvent): void {
    const target = event.target as HTMLElement | null;

    if (target?.closest('button')) {
      return;
    }

    const currentPosition = this.position();

    this.dragState = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: currentPosition.x,
      startY: currentPosition.y,
    };

    event.preventDefault();
  }

  @HostListener('document:pointermove', ['$event'])
  protected onDocumentPointerMove(event: PointerEvent): void {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return;
    }

    const nextX = this.dragState.startX + event.clientX - this.dragState.startClientX;
    const nextY = this.dragState.startY + event.clientY - this.dragState.startClientY;

    this.position.set(this.clampPosition({ x: nextX, y: nextY }));
  }

  @HostListener('document:pointerup', ['$event'])
  protected onDocumentPointerUp(event: PointerEvent): void {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) {
      return;
    }

    this.dragState = null;

    if (!this.ui.isModalActive()) {
      this.savePosition(this.position());
    }
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    const nextPosition = this.clampPosition(this.position());
    this.position.set(nextPosition);

    if (!this.ui.isModalActive()) {
      this.savePosition(nextPosition);
    }
  }

  private enterModalSafePosition(): void {
    if (this.positionBeforeModal) {
      return;
    }

    this.positionBeforeModal = this.position();
    this.position.set(this.getModalSafePosition());
  }

  private leaveModalSafePosition(): void {
    if (!this.positionBeforeModal) {
      return;
    }

    this.position.set(this.clampPosition(this.positionBeforeModal));
    this.positionBeforeModal = null;
  }

  private getModalSafePosition(): AssistantPanelPosition {
    return this.clampPosition({
      x: window.innerWidth - ASSISTANT_PANEL_WIDTH - ASSISTANT_PANEL_MODAL_SAFE_MARGIN,
      y: this.getMinY() + ASSISTANT_PANEL_MODAL_SAFE_MARGIN,
    });
  }

  private getInitialPosition(): AssistantPanelPosition {
    const storedPosition = this.getStoredPosition();

    if (storedPosition) {
      return this.clampPosition(storedPosition);
    }

    return this.clampPosition({
      x: window.innerWidth - ASSISTANT_PANEL_WIDTH - 48,
      y: window.innerHeight - ASSISTANT_PANEL_HEIGHT - 120,
    });
  }

  private getStoredPosition(): AssistantPanelPosition | null {
    const rawPosition = window.localStorage.getItem(ASSISTANT_PANEL_POSITION_STORAGE_KEY);

    if (!rawPosition) {
      return null;
    }

    try {
      const parsedPosition = JSON.parse(rawPosition) as Partial<AssistantPanelPosition>;

      if (typeof parsedPosition.x === 'number' && typeof parsedPosition.y === 'number') {
        return {
          x: parsedPosition.x,
          y: parsedPosition.y,
        };
      }
    } catch {
      window.localStorage.removeItem(ASSISTANT_PANEL_POSITION_STORAGE_KEY);
    }

    return null;
  }

  private savePosition(position: AssistantPanelPosition): void {
    window.localStorage.setItem(ASSISTANT_PANEL_POSITION_STORAGE_KEY, JSON.stringify(position));
  }

  private clampPosition(position: AssistantPanelPosition): AssistantPanelPosition {
    const minX = this.getMinX();
    const minY = this.getMinY();
    const maxX = Math.max(minX, window.innerWidth - ASSISTANT_PANEL_WIDTH - ASSISTANT_PANEL_MARGIN);
    const maxY = Math.max(
      minY,
      window.innerHeight - ASSISTANT_PANEL_HEIGHT - ASSISTANT_PANEL_MARGIN,
    );

    return {
      x: Math.min(Math.max(position.x, minX), maxX),
      y: Math.min(Math.max(position.y, minY), maxY),
    };
  }

  private getMinX(): number {
    return window.innerWidth <= 720 ? ASSISTANT_PANEL_MARGIN : ASSISTANT_PANEL_MIN_X;
  }

  private getMinY(): number {
    return window.innerWidth <= 720 ? ASSISTANT_PANEL_MARGIN : ASSISTANT_PANEL_MIN_Y;
  }
}
