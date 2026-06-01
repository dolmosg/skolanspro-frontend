export interface IPersonCommunicationCatalogItem {
  id: number;
  description?: string | null;
  name?: string | null;
  translation?: string | null;
}

export interface IPersonCountry {
  id: number;
  name: string;
  phone_code: string;
}

export interface IPersonMail {
  id?: number;
  person_id?: number;
  mail_type_id?: number | null;
  email?: string;
  active?: boolean;
  isDefault?: boolean;
  type?: IPersonCommunicationCatalogItem | null;
}

export interface IPersonPhone {
  id?: number;
  person_id?: number;
  phone?: string;
  phone_type_id?: number | null;
  country_id?: number | null;
  phone_type?: IPersonCommunicationCatalogItem | null;
  phoneType?: IPersonCommunicationCatalogItem | null;
  country?: IPersonCountry | null;
}

export interface IPersonCommunicationCatalogs {
  phone_types: IPersonCommunicationCatalogItem[];
  mail_types: IPersonCommunicationCatalogItem[];
  address_types: IPersonCommunicationCatalogItem[];
  countries: IPersonCountry[];
  default_country_id: number | null;
}

export interface IPersonMailModalData {
  personId: number;
  email?: IPersonMail | null;
  mailTypes: IPersonCommunicationCatalogItem[];
}

export interface IPersonMailModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    person_id: number;
    mail_type_id: number | null;
    email: string;
    active: boolean;
  };
}

export interface IPersonPhoneModalData {
  personId: number;
  phone?: IPersonPhone | null;
  phoneTypes: IPersonCommunicationCatalogItem[];
  countries: IPersonCountry[];
  defaultCountryId: number | null;
}

export interface IPersonPhoneModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    person_id: number;
    phone: string;
    phone_type_id: number | null;
    country_id: number | null;
  };
}

export interface IPersonAddress {
  id?: number;
  person_id?: number;
  name?: string | null;
  street?: string | null;
  outdoor?: string | null;
  indoor?: string | null;
  colony?: string | null;
  city?: string | null;
  state?: string | null;
  municipality?: string | null;
  zip_code?: string | null;
  address_type_id?: number | null;
  country_id?: number | null;
  address_type?: IPersonCommunicationCatalogItem | null;
  addressType?: IPersonCommunicationCatalogItem | null;
  country?: IPersonCountry | null;
}

export interface IPersonAddress {
  id?: number;
  person_id?: number;
  name?: string | null;
  street?: string | null;
  outdoor?: string | null;
  indoor?: string | null;
  colony?: string | null;
  city?: string | null;
  state?: string | null;
  municipality?: string | null;
  zip_code?: string | null;
  address_type_id?: number | null;
  country_id?: number | null;
  address_type?: IPersonCommunicationCatalogItem | null;
  addressType?: IPersonCommunicationCatalogItem | null;
  country?: IPersonCountry | null;
}

export interface IPersonAddressModalData {
  personId: number;
  address?: IPersonAddress | null;
  addressTypes: IPersonCommunicationCatalogItem[];
  countries: IPersonCountry[];
  defaultCountryId: number | null;
}

export interface IPersonAddressModalResult {
  saved: boolean;
  mode: 'create' | 'edit';
  payload: {
    person_id: number;
    name: string | null;
    street: string;
    outdoor: string;
    indoor: string | null;
    colony: string;
    city: string;
    state: string;
    municipality: string;
    zip_code: string;
    address_type_id: number;
    country_id: number;
  };
}
