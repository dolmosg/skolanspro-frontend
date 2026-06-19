export const environment = {
  production: false,

  // CUANDO CORREMOS CENTRAL

  // appContextOverride: {
  //   enabled: true,
  //   type: 'central' as 'central' | 'tenant',
  //   tenantKey: null as string | null,
  // },

  // CUANDO CORREMOS LOS TENANTS

  appContextOverride: {
    enabled: true,
    type: 'tenant' as 'central' | 'tenant',
    tenantKey: 'copan' as string | null,
  },

  api: {
    protocol: 'https',
    rootDomain: 'skolanspro.test',
    apiRoute: '/api',
    centralPrefix: '/central',
    tenantPrefix: '/tenant',
  },
};
