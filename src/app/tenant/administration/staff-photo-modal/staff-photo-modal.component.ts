import { Component, computed, inject, input, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { SklModalService } from '@shared/services/skl-modal-service';

import {
  SkFileUploadComponent,
  SkFileUploadError,
} from '@shared/ui/sk-file-upload/sk-file-upload.component';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

interface StaffPhotoModalData {
  person: {
    photo?: string | null;
    [key: string]: any;
  };
}

@Component({
  selector: 'app-staff-photo-modal',
  standalone: true,
  imports: [TranslateModule, SkFileUploadComponent, UiButtonComponent],
  templateUrl: './staff-photo-modal.component.html',
  styleUrl: './staff-photo-modal.component.scss',
})
export class StaffPhotoModalComponent {
  readonly data = input.required<StaffPhotoModalData>();

  private readonly modal = inject(SklModalService);

  protected readonly currentPhoto = computed(() => {
    return this.data().person?.photo ?? null;
  });

  selectedFile = signal<File | null>(null);
  errorMessage = signal<string | null>(null);

  onFilesChange(files: File[]): void {
    this.errorMessage.set(null);
    this.selectedFile.set(files[0] ?? null);
  }

  onUploadError(error: SkFileUploadError): void {
    this.errorMessage.set(error.message);
  }

  onCancel(): void {
    this.modal.close(null);
  }

  onConfirm(): void {
    const file = this.selectedFile();

    if (!file) {
      this.errorMessage.set('Selecciona una imagen antes de continuar.');
      return;
    }

    this.modal.close(file);
  }
}