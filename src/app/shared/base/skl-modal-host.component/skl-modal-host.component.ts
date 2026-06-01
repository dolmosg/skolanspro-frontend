import { CommonModule, NgComponentOutlet } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { SklModalComponent } from '../skl-modal-component/skl-modal-component';
import { SklModalService } from '../../services/skl-modal-service';

@Component({
  selector: 'app-skl-modal-host',
  standalone: true,
  imports: [CommonModule, NgComponentOutlet, SklModalComponent],
  templateUrl: './skl-modal-host.component.html',
  styleUrl: './skl-modal-host.component.scss',
})
export class SklModalHostComponent {
  protected readonly modal = inject(SklModalService);

  protected readonly state = this.modal.state;

  protected readonly isOpen = computed(() => this.state().open);

  protected readonly componentInputs = computed(() => {
    const data = this.state().data;
    return data == null ? {} : { data };
  });

  protected onClose(): void {
    this.modal.close();
  }
}