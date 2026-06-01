import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { LoaderService } from '../../shared/services/loader-service';

/**
 * GlobalLoaderComponent
 * ---------------------
 * Global fullscreen loader overlay for the application.
 *
 * Responsibilities:
 * - Observe the global loading state from LoaderService
 * - Render a fullscreen blocking overlay while requests are in progress
 * - Provide a consistent loading experience across the app
 */
@Component({
  selector: 'app-global-loader-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-loader-component.html',
  styleUrl: './global-loader-component.scss',
})
export class GlobalLoaderComponent {
  private readonly loader = inject(LoaderService);

  /**
   * Public loading state consumed by the template.
   */
  protected readonly isLoading = computed(() => this.loader.isLoading());
}