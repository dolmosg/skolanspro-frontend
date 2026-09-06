import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AppContextService } from '@shared/services/app-context-service';
import { AuthStateSevice } from '../../shared/services/auth-state-sevice';
import { NavigationService } from '../../shared/services/navigation-service';
import { SiteStateService } from '../../shared/services/site-state';
import { AppShell } from './app-shell';

describe('AppShell permission refresh', () => {
  let fixture: ComponentFixture<AppShell>;
  let router: jasmine.SpyObj<Router>;
  let navigation: jasmine.SpyObj<NavigationService>;
  let authState: jasmine.SpyObj<AuthStateSevice>;

  beforeEach(async () => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl'], {
      events: new Subject(),
      url: '/tenant/configuration/levels',
      routerState: {
        snapshot: { root: { firstChild: null, data: {} } },
      } as unknown as Router['routerState'],
    });
    navigation = jasmine.createSpyObj<NavigationService>(
      'NavigationService',
      ['load', 'checkForPermissionChanges', 'hasRouteAccess'],
      { items: signal([]), loading: signal(false), error: signal<string | null>(null) },
    );
    authState = jasmine.createSpyObj<AuthStateSevice>('AuthStateSevice', ['hasAccess'], {
      allowedRoutes: signal([]),
      activeRole: signal({ id: 2, name: 'admin', translation: '', path: '/home/admin' }),
    });
    navigation.load.and.resolveTo(true);
    navigation.hasRouteAccess.and.returnValue(true);
    navigation.checkForPermissionChanges.and.resolveTo('unchanged');

    await TestBed.configureTestingModule({ imports: [AppShell] })
      .overrideComponent(AppShell, { set: { imports: [], template: '' } })
      .configureTestingModule({
        providers: [
          { provide: Router, useValue: router },
          { provide: NavigationService, useValue: navigation },
          { provide: AuthStateSevice, useValue: authState },
          {
            provide: SiteStateService,
            useValue: { tradename: signal('School'), appVersion: signal('1') },
          },
          { provide: AppContextService, useValue: { type: 'tenant' } },
        ],
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppShell);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('coalesces focus and visible events into one permission check', fakeAsync(() => {
    spyOnProperty(document, 'visibilityState', 'get').and.returnValue('visible');

    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    tick(101);
    flushMicrotasks();

    expect(navigation.checkForPermissionChanges).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  }));

  it('preserves the current route when the check is unavailable', fakeAsync(() => {
    navigation.checkForPermissionChanges.and.resolveTo('unavailable');

    window.dispatchEvent(new Event('focus'));
    tick(101);
    flushMicrotasks();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  }));

  it('navigates to the contextual role fallback after a revoked reload', fakeAsync(() => {
    navigation.checkForPermissionChanges.and.resolveTo('changed');
    navigation.hasRouteAccess.and.returnValue(false);

    window.dispatchEvent(new Event('focus'));
    tick(101);
    flushMicrotasks();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/tenant/home/admin');
  }));

  it('removes global listeners when the shell is destroyed', fakeAsync(() => {
    fixture.destroy();

    window.dispatchEvent(new Event('focus'));
    tick(101);
    flushMicrotasks();

    expect(navigation.checkForPermissionChanges).not.toHaveBeenCalled();
  }));
});
