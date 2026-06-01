import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideLucideConfig, provideLucideIcons } from '@lucide/angular';
import { provideToastr } from 'ngx-toastr';
import { routes } from './app.routes';
import { REGISTERED_ICONS } from './shared/icons/icon-registry';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideRouter(routes),
    provideAnimations(),
    provideToastr({
      timeOut: 2500,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      closeButton: false,
      progressBar: true,
    }),
    provideTranslateService({
      fallbackLang: 'es-MX',
      lang: 'es-MX',
      loader: provideTranslateHttpLoader({
        prefix: './i18n/',
        suffix: '.json',
      }),
    }),
    provideLucideIcons(...REGISTERED_ICONS),
    provideLucideConfig({
      size: 18,
      strokeWidth: 1.8,
    }),
  ],
};