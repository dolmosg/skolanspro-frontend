import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { UiButtonComponent } from '../../ui/ui-button/ui-button';
import { SklModalService } from '../../services/skl-modal-service';

export interface ISklConfirmModalData {
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Component({
  selector: 'app-skl-confirm-modal',
  standalone: true,
  imports: [CommonModule, UiButtonComponent],
  templateUrl: './skl-confirm-modal.html',
  styleUrl: './skl-confirm-modal.scss',
})
export class SklConfirmModal {
  private readonly modal = inject(SklModalService);

  readonly data = input<ISklConfirmModalData | null>(null);

  protected get message(): string {
    return this.data()?.message ?? '¿Estás seguro de realizar esta acción?';
  }

  protected get confirmLabel(): string {
    return this.data()?.confirmLabel ?? 'Confirmar';
  }

  protected get cancelLabel(): string {
    return this.data()?.cancelLabel ?? 'Cancelar';
  }

  protected get variant(): 'danger' | 'primary' | 'secondary' {
    const type = this.data()?.type;

    if (type === 'danger') return 'danger';
    if (type === 'warning') return 'secondary';
    if (type === 'info') return 'primary';

    return 'primary';
  }

  protected get tone(): 'danger' | 'warning' | 'info' {
    return this.data()?.type ?? 'info';
  }

  protected onConfirm(): void {
    this.modal.close(true);
  }

  protected onCancel(): void {
    this.modal.close(false);
  }
}
