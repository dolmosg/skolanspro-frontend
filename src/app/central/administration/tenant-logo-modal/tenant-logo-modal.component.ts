import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { UiButtonComponent } from '../../../shared/ui/ui-button/ui-button';

import { SklModalService } from '../../../shared/services/skl-modal-service';

import {
  SkFileUploadComponent,
  SkFileUploadError,
} from '../../../shared/ui/sk-file-upload/sk-file-upload.component';

@Component({
  selector: 'app-tenant-logo-modal',
  imports: [CommonModule, TranslatePipe, SkFileUploadComponent, UiButtonComponent],
  templateUrl: './tenant-logo-modal.component.html',
  styleUrl: './tenant-logo-modal.component.scss',
})
/**
 * Modal component responsible for uploading a tenant logo.
 *
 * This component wraps the reusable `SkFileUploadComponent` to allow users
 * to select or drag-and-drop a single image file, preview it, and confirm
 * the upload.
 *
 * Behavior:
 * - Receives the selected tenant via modal data.
 * - Allows selecting a single file (logo).
 * - Emits the selected file when the user confirms (Save).
 * - Returns `null` when the user cancels the operation.
 *
 * The modal does NOT perform the upload itself; it only returns the file
 * to the caller (`tenants.component.ts`), which is responsible for
 * sending it to the backend.
 */
export class TenantLogoModalComponent {
  /** Modal service used to close the modal and return data to the caller. */
  private readonly modal = inject(SklModalService);
  /** Tenant associated with the logo being uploaded. */
  protected readonly tenant = signal<any | null>(null);
  /** Currently selected valid files (only one is expected for logo upload). */
  protected readonly selectedFiles = signal<File[]>([]);
  /** Error message produced by the upload component when validation fails. */
  protected readonly uploadErrorMessage = signal<string | null>(null);

  /**
   * Receives modal input data when the modal is opened.
   */
  onModalDataReceived(data: any): void {
    this.tenant.set(data?.tenant ?? null);
  }

  /**
   * Updates the selected files when the upload component emits valid files.
   * Also clears any previous validation error.
   */
  protected onFilesChange(files: File[]): void {
    this.uploadErrorMessage.set(null);
    this.selectedFiles.set(files);
  }

  /**
   * Handles validation errors emitted by the upload component.
   */
  protected onUploadError(error: SkFileUploadError): void {
    this.uploadErrorMessage.set(error.message);
  }

  /**
   * Closes the modal without returning a file.
   */
  protected onCancel(): void {
    this.modal.close(null);
  }

  /**
   * Returns the selected file to the caller and closes the modal.
   * If no file is selected, the action is ignored.
   */
  protected onSave(): void {
    const file = this.selectedFiles()[0];

    if (!file) {
      return;
    }
    this.modal.close(file);
  }
}
