export const environment = {
  production: true,

  appContextOverride: {
    enabled: false,
    type: 'central' as 'central' | 'tenant',
    tenantKey: null as string | null,
  },


  api: {
    protocol: 'https',
    rootDomain: 'skolans.net',
    apiRoute: '/api',
    centralPrefix: '/central',
    tenantPrefix: '/tenant',
  },
};
