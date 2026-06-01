import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../shared/services/api-service';
import { SiteStateService } from '../../../shared/services/site-state';
import { ToastService } from '../../../shared/services/toast-service';
import { AuthStateSevice } from '../../../shared/services/auth-state-sevice';

interface LogoutResponseData {
  context?: 'central' | 'tenant';
}

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logout.html',
  styleUrl: './logout.scss',
})
export class Logout implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly siteState = inject(SiteStateService);
  private readonly toast = inject(ToastService);
  private readonly authState = inject(AuthStateSevice);

  protected processing = true;

  async ngOnInit(): Promise<void> {
    await this.performLogout();
  }

  protected goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  private async performLogout(): Promise<void> {
    try {
      await firstValueFrom(this.api.post<LogoutResponseData>('logout', {}));
    } catch {
      this.toast.error('No fue posible cerrar la sesión en el servidor. Se cerrará localmente.');
    } finally {
      this.clearSession();
      this.processing = false;
    }
  }

  private clearSession(): void {
    this.authState.clear();
  }
}