import { Component, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { ApiResponse } from '../../shared/interfaces/api-response.interface';
import { AuthRole, TenantSwitchRoleSessionPayload } from '../../shared/interfaces/auth-session';
import { AuthStateSevice } from '../../shared/services/auth-state-sevice';
import { LanguageService } from '../../shared/services/language-service';
import { NavigationService } from '../../shared/services/navigation-service';
import { SiteStateService } from '../../shared/services/site-state';
import { ToastService } from '../../shared/services/toast-service';
import { UiIconComponent } from '../../shared/ui/ui-icon/ui-icon';
import { Breadcrumb } from '../breadcrumb/breadcrumb';
import { Topbar } from './topbar';

@Component({
  selector: 'app-ui-icon',
  standalone: true,
  template: '',
})
class MockUiIconComponent {
  readonly name = input.required<string>();
  readonly size = input<string>();
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  template: '',
})
class MockBreadcrumbComponent {}

describe('Topbar role switching', () => {
  let fixture: ComponentFixture<Topbar>;
  let authState: {
    userInitials: ReturnType<typeof signal<string>>;
    activeRole: ReturnType<typeof signal<AuthRole | null>>;
    availableRoles: ReturnType<typeof signal<AuthRole[]>>;
    userPicture: ReturnType<typeof signal<string | null>>;
    userName: ReturnType<typeof signal<string | null>>;
    context: ReturnType<typeof signal<'tenant'>>;
    switchRole: jasmine.Spy;
  };
  let navigation: jasmine.SpyObj<NavigationService>;
  let router: jasmine.SpyObj<Router>;
  let toast: jasmine.SpyObj<ToastService>;

  const adminRole: AuthRole = {
    id: 4,
    name: 'admin',
    translation: 'configuration.roles.translation.admin',
    path: '/old-selected-path',
  };

  const successfulResponse: ApiResponse<TenantSwitchRoleSessionPayload> = {
    success: true,
    data: {
      token: 'TOKEN_B',
      token_type: 'Bearer',
      context: 'tenant',
      tenant: 'copan',
      user: {
        id: 10,
        name: 'Test User',
        email: 'user@example.test',
        role_id: 1,
        actual_role: 4,
        role: {
          ...adminRole,
          path: '/home/admin-dashboard',
        },
        roles: [],
      },
    },
    message: 'Role switched.',
  };

  beforeEach(async () => {
    authState = {
      userInitials: signal('TU'),
      activeRole: signal<AuthRole | null>({
        id: 1,
        name: 'root',
        translation: 'configuration.roles.translation.root',
        path: '/home/root-dashboard',
      }),
      availableRoles: signal<AuthRole[]>([adminRole]),
      userPicture: signal<string | null>(null),
      userName: signal<string | null>('Test User'),
      context: signal<'tenant'>('tenant'),
      switchRole: jasmine.createSpy('switchRole'),
    };
    navigation = jasmine.createSpyObj<NavigationService>('NavigationService', ['clear', 'load']);
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl', 'navigate'], {
      events: of(),
    });
    router.navigateByUrl.and.resolveTo(true);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);

    await TestBed.configureTestingModule({
      imports: [Topbar],
      providers: [
        provideTranslateService(),
        { provide: AuthStateSevice, useValue: authState },
        { provide: NavigationService, useValue: navigation },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            root: {
              snapshot: { data: {}, url: [] },
              children: [],
            },
          },
        },
        { provide: ToastService, useValue: toast },
        {
          provide: LanguageService,
          useValue: {
            currentLanguage: () => 'es-MX',
            setLanguage: jasmine.createSpy('setLanguage'),
          },
        },
        {
          provide: SiteStateService,
          useValue: {
            languages: signal([]),
            languageCode: signal('es-MX'),
          },
        },
      ],
    })
      .overrideComponent(Topbar, {
        remove: { imports: [UiIconComponent, Breadcrumb] },
        add: { imports: [MockUiIconComponent, MockBreadcrumbComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Topbar);
    fixture.detectChanges();
  });

  it('prevents duplicate requests and navigates using only the backend response path', async () => {
    const pendingResponse = new Subject<ApiResponse<TenantSwitchRoleSessionPayload>>();
    let finishNavigationLoad: ((value: boolean) => void) | undefined;
    navigation.load.and.returnValue(
      new Promise<boolean>((resolve) => {
        finishNavigationLoad = resolve;
      }),
    );
    authState.switchRole.and.returnValue(pendingResponse.asObservable());

    const roleButton = fixture.nativeElement.querySelector(
      '.topbar__action-btn--role',
    ) as HTMLButtonElement;
    roleButton.click();
    fixture.detectChanges();

    const option = fixture.nativeElement.querySelector(
      '.topbar__menu-item--role',
    ) as HTMLButtonElement;
    option.click();
    option.click();

    expect(authState.switchRole).toHaveBeenCalledOnceWith({ role_id: 4 });

    pendingResponse.next(successfulResponse);
    pendingResponse.complete();
    await Promise.resolve();

    expect(router.navigateByUrl).not.toHaveBeenCalled();

    finishNavigationLoad?.(true);
    await fixture.whenStable();

    expect(navigation.clear).toHaveBeenCalledBefore(navigation.load);
    expect(navigation.load).toHaveBeenCalledOnceWith(true);
    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/tenant/home/admin-dashboard');
    expect(router.navigateByUrl).not.toHaveBeenCalledWith('/tenant/old-selected-path');
  });

  it('does not clear navigation or navigate after a logical failure', async () => {
    authState.switchRole.and.returnValue(
      of({
        success: false,
        data: null,
        message: 'Role not authorized.',
      }),
    );

    const roleButton = fixture.nativeElement.querySelector(
      '.topbar__action-btn--role',
    ) as HTMLButtonElement;
    roleButton.click();
    fixture.detectChanges();

    const option = fixture.nativeElement.querySelector(
      '.topbar__menu-item--role',
    ) as HTMLButtonElement;
    option.click();
    await fixture.whenStable();

    expect(toast.error).toHaveBeenCalledOnceWith('Role not authorized.');
    expect(navigation.clear).not.toHaveBeenCalled();
    expect(navigation.load).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});
