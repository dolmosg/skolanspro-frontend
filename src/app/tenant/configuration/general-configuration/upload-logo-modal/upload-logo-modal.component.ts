import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

import { SklModalService } from '@shared/services/skl-modal-service';
import { UiButtonComponent } from '@shared/ui/ui-button/ui-button';

import { IOrganizationLogo } from '../organization-logos/organization-logos.component';
import { SkFileUploadComponent, SkFileUploadError } from '@shared/ui/sk-file-upload/sk-file-upload.component';

export interface UploadLogoModalData {
  logo: IOrganizationLogo;
}

export interface UploadLogoModalResult {
  saved: boolean;
  file?: File;
}

@Component({
  selector: 'app-upload-logo-modal',
  standalone: true,
  imports: [CommonModule, UiButtonComponent, SkFileUploadComponent, TranslatePipe],
  templateUrl: './upload-logo-modal.component.html',
  styleUrl: './upload-logo-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadLogoModalComponent {
  private readonly modal = inject(SklModalService);

  readonly data = input<UploadLogoModalData | null>(null);

  protected readonly logo = computed(() => this.data()?.logo ?? null);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly uploadError = signal<string | null>(null);

  protected readonly canSave = computed(() => !!this.selectedFile());

  protected onFilesChange(files: File[]): void {
    this.uploadError.set(null);
    this.selectedFile.set(files[0] ?? null);
  }

  protected onUploadError(error: SkFileUploadError): void {
    this.uploadError.set(error.message);
  }

  protected onCancel(): void {
    this.modal.close<UploadLogoModalResult>({
      saved: false,
    });
  }

  protected onSubmit(): void {
    const file = this.selectedFile();

    if (!file) {
      return;
    }

    this.modal.close<UploadLogoModalResult>({
      saved: true,
      file,
    });
  }
}