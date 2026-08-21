import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { ApiResponse } from '../interfaces/api-response.interface';
import { AuthUser, TenantSwitchRoleSessionPayload } from '../interfaces/auth-session';
import { ApiService } from './api-service';
import { AuthStateSevice } from './auth-state-sevice';

describe('AuthStateSevice role switching', () => {
  let service: AuthStateSevice;
  let api: jasmine.SpyObj<ApiService>;

  const initialUser: AuthUser = {
    id: 10,
    name: 'Test User',
    email: 'user@example.test',
    role_id: 1,
    actual_role: 1,
    role: {
      id: 1,
      name: 'root',
      translation: 'configuration.roles.translation.root',
      path: '/home/root-dashboard',
    },
    roles: [
      {
        id: 4,
        name: 'admin',
        translation: 'configuration.roles.translation.admin',
        path: '/home/admin-dashboard',
      },
    ],
  };

  const switchedPayload: TenantSwitchRoleSessionPayload = {
    token: 'TOKEN_B',
    token_type: 'Bearer',
    context: 'tenant',
    tenant: 'copan',
    user: {
      ...initialUser,
      actual_role: 4,
      role: {
        id: 4,
        name: 'admin',
        translation: 'configuration.roles.translation.admin',
        path: '/home/admin-dashboard',
      },
      roles: [
        {
          id: 1,
          name: 'root',
          translation: 'configuration.roles.translation.root',
          path: '/home/root-dashboard',
        },
      ],
    },
  };

  beforeEach(() => {
    localStorage.clear();
    api = jasmine.createSpyObj<ApiService>('ApiService', ['post']);

    TestBed.configureTestingModule({
      providers: [AuthStateSevice, { provide: ApiService, useValue: api }],
    });

    service = TestBed.inject(AuthStateSevice);
    service.setSession({
      token: 'TOKEN_A',
      token_type: 'Bearer',
      context: 'tenant',
      tenant: 'copan',
      user: initialUser,
    });
    service.setAllowedRoutes(['home/root-dashboard']);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('posts only role_id and replaces the complete persisted session on success', async () => {
    const response: ApiResponse<TenantSwitchRoleSessionPayload> = {
      success: true,
      data: switchedPayload,
      message: 'Role switched.',
    };
    api.post.and.returnValue(of(response));

    await firstValueFrom(service.switchRole({ role_id: 4 }));

    expect(api.post).toHaveBeenCalledOnceWith('switch-role', { role_id: 4 });
    expect(service.token()).toBe('TOKEN_B');
    expect(service.user()?.actual_role).toBe(4);
    expect(service.activeRole()?.id).toBe(4);
    expect(service.availableRoles().map((role) => role.id)).toEqual([1]);
    expect(service.allowedRoutes()).toEqual([]);
    expect(localStorage.getItem('token')).toBe('TOKEN_B');

    const persistedUser = JSON.parse(localStorage.getItem('user') ?? '{}') as AuthUser;
    expect(persistedUser.actual_role).toBe(4);
    expect(persistedUser.role?.id).toBe(4);
    expect(persistedUser.roles?.map((role) => role.id)).toEqual([1]);
  });

  it('preserves the previous session when the backend returns a logical failure', async () => {
    const previousSession = service.session();
    const previousStoredUser = localStorage.getItem('user');
    const response: ApiResponse<TenantSwitchRoleSessionPayload> = {
      success: false,
      data: null,
      message: 'Role not authorized.',
    };
    api.post.and.returnValue(of(response));

    await firstValueFrom(service.switchRole({ role_id: 4 }));

    expect(service.session()).toEqual(previousSession);
    expect(localStorage.getItem('token')).toBe('TOKEN_A');
    expect(localStorage.getItem('user')).toBe(previousStoredUser);
    expect(service.allowedRoutes()).toEqual(['home/root-dashboard']);
  });

  it('preserves the previous session when the request fails', async () => {
    const previousSession = service.session();
    const previousStoredUser = localStorage.getItem('user');
    api.post.and.returnValue(throwError(() => new Error('Network failure')));

    await expectAsync(firstValueFrom(service.switchRole({ role_id: 4 }))).toBeRejected();

    expect(service.session()).toEqual(previousSession);
    expect(localStorage.getItem('token')).toBe('TOKEN_A');
    expect(localStorage.getItem('user')).toBe(previousStoredUser);
    expect(service.allowedRoutes()).toEqual(['home/root-dashboard']);
  });
});
