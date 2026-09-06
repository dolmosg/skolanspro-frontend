import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response.interface';
import { ApiService } from './api-service';
import { AuthStateSevice } from './auth-state-sevice';
import { NavigationService } from './navigation-service';

interface NavigationTestPayload {
  items: Array<{
    id: string;
    labelKey: string;
    route?: string;
  }>;
  allowedRoutes?: string[];
  permissionsVersion: number;
}

describe('NavigationService', () => {
  let service: NavigationService;
  let api: jasmine.SpyObj<ApiService>;
  let authState: jasmine.SpyObj<AuthStateSevice>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    authState = jasmine.createSpyObj<AuthStateSevice>(
      'AuthStateSevice',
      ['setAuthorizationSnapshot', 'clearAllowedRoutes'],
      { permissionsVersion: signal<number | null>(1) },
    );

    TestBed.configureTestingModule({
      providers: [
        NavigationService,
        { provide: ApiService, useValue: api },
        { provide: AuthStateSevice, useValue: authState },
      ],
    });

    service = TestBed.inject(NavigationService);
  });

  it('clears previous navigation and force-loads a complete replacement', async () => {
    api.get.and.returnValues(
      of(navigationResponse('root', '/home/root-dashboard', ['/configuration/root-settings'])),
      of(navigationResponse('admin', '/home/admin-dashboard', ['/administration/admin-users'])),
    );

    await service.load();
    expect(service.items().map((item) => item.id)).toEqual(['root']);

    service.clear();
    expect(service.items()).toEqual([]);
    expect(authState.clearAllowedRoutes).toHaveBeenCalled();

    await service.load(true);

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(service.items().map((item) => item.id)).toEqual(['admin']);
    expect(authState.setAuthorizationSnapshot).toHaveBeenCalledWith(
      ['/administration/admin-users'],
      2,
    );
  });

  it('ignores a stale response started before navigation was cleared', async () => {
    const previousRequest = new Subject<ApiResponse<NavigationTestPayload>>();
    const currentRequest = new Subject<ApiResponse<NavigationTestPayload>>();
    api.get.and.returnValues(previousRequest.asObservable(), currentRequest.asObservable());

    const previousLoad = service.load();
    service.clear();
    const currentLoad = service.load(true);

    previousRequest.next(
      navigationResponse('root', '/home/root-dashboard', ['/configuration/root-settings']),
    );
    previousRequest.complete();
    await previousLoad;

    expect(service.items()).toEqual([]);

    currentRequest.next(
      navigationResponse('admin', '/home/admin-dashboard', ['/administration/admin-users']),
    );
    currentRequest.complete();
    await currentLoad;

    expect(service.items().map((item) => item.id)).toEqual(['admin']);
    expect(authState.setAuthorizationSnapshot).toHaveBeenCalledTimes(1);
    expect(authState.setAuthorizationSnapshot).toHaveBeenCalledWith(
      ['/administration/admin-users'],
      2,
    );
  });

  it('does not reload when the permission version is unchanged', async () => {
    api.get.and.returnValue(
      of({ success: true, data: { permissionsVersion: 1 }, message: 'Version loaded.' }),
    );

    expect(await service.checkForPermissionChanges()).toBe('unchanged');
    expect(api.get).toHaveBeenCalledOnceWith('navigation/permissions-version');
  });

  it('deduplicates concurrent checks and reloads once when the version changed', async () => {
    const versionRequest = new Subject<ApiResponse<{ permissionsVersion: number }>>();
    api.get.and.returnValues(
      versionRequest.asObservable(),
      of(navigationResponse('admin', '/home/admin-dashboard', ['/administration/admin-users'])),
    );

    const first = service.checkForPermissionChanges();
    const second = service.checkForPermissionChanges();
    versionRequest.next({ success: true, data: { permissionsVersion: 2 }, message: 'Changed.' });
    versionRequest.complete();

    expect(await first).toBe('changed');
    expect(await second).toBe('changed');
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('preserves the previous navigation when a changed-version reload fails', async () => {
    api.get.and.returnValues(
      of(navigationResponse('root', '/home/root-dashboard', ['/configuration/root-settings'])),
      of({ success: true, data: { permissionsVersion: 2 }, message: 'Changed.' }),
      of({ success: false, data: {}, message: 'Reload unavailable.' }),
    );

    await service.load();

    expect(await service.checkForPermissionChanges()).toBe('unavailable');
    expect(service.items().map((item) => item.id)).toEqual(['root']);
    expect(authState.setAuthorizationSnapshot).toHaveBeenCalledTimes(1);
  });
});

function navigationResponse(
  id: string,
  route: string,
  allowedRoutes: string[],
): ApiResponse<NavigationTestPayload> {
  return {
    success: true,
    data: {
      items: [{ id, labelKey: `controllers.${id}`, route }],
      allowedRoutes,
      permissionsVersion: id === 'root' ? 1 : 2,
    },
    message: 'Navigation loaded.',
  };
}
