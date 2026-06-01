export type AppContextType = 'central' | 'tenant';

export interface AppContext {
  type: AppContextType;
  hostname: string;
  subdomain: string | null;
  tenantKey: string | null;
  isCentral: boolean;
  isTenant: boolean;
}