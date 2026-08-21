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
}

describe('NavigationService', () => {
  let service: NavigationService;
  let api: jasmine.SpyObj<ApiService>;
  let authState: jasmine.SpyObj<AuthStateSevice>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['get']);
    authState = jasmine.createSpyObj<AuthStateSevice>('AuthStateSevice', ['setAllowedRoutes']);

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
    expect(authState.setAllowedRoutes).toHaveBeenCalledWith([]);

    await service.load(true);

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(service.items().map((item) => item.id)).toEqual(['admin']);
    expect(authState.setAllowedRoutes).toHaveBeenCalledWith(['/administration/admin-users']);
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
    expect(authState.setAllowedRoutes).toHaveBeenCalledTimes(2);
    expect(authState.setAllowedRoutes).toHaveBeenCalledWith([]);
    expect(authState.setAllowedRoutes).toHaveBeenCalledWith(['/administration/admin-users']);
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
    },
    message: 'Navigation loaded.',
  };
}
