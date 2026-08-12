import { post } from '../../shared/api/client';
import type { XRoadCompany, XRoadAssociatedPerson, XRoadPerson } from './types';

interface LihtandmedCompanyRaw {
  ariregistri_kood: string;
  evnimi: string;
  oiguslik_vorm?: string;
  staatus: string;
  staatus_tekstina: string;
  evaadressid?: {
    aadress_ads__ads_normaliseeritud_taisaadress?: string;
    asukoha_ehak_tekstina?: string;
    indeks_ettevotja_aadressis?: string;
  };
}

interface LihtandmedRawResponse {
  lihtandmed_v3Response: {
    keha: {
      leitud_ettevotjate_arv: string;
      ettevotjad?: {
        item: LihtandmedCompanyRaw | LihtandmedCompanyRaw[];
      };
    };
  };
}

interface AssociatedPersonRaw {
  isiku_tyyp: string;
  isiku_roll: string;
  isiku_roll_tekstina: string;
  eesnimi?: string;
  nimi_arinimi: string;
  isikukood_registrikood: string;
  algus_kpv?: string;
  lopp_kpv?: string;
  staatus?: string;
}

interface AssociatedPersonsRawResponse {
  ettevottegaSeotudIsikud_v1Response: {
    keha: {
      seosed: {
        item: AssociatedPersonRaw | AssociatedPersonRaw[];
      };
    };
  };
}

function mapCompany(raw: LihtandmedCompanyRaw): XRoadCompany {
  return {
    registryCode: raw.ariregistri_kood ?? '',
    companyName: raw.evnimi ?? '',
    legalForm: raw.oiguslik_vorm,
    status: raw.staatus ?? '',
    statusText: raw.staatus_tekstina ?? '',
    address: raw.evaadressid?.aadress_ads__ads_normaliseeritud_taisaadress ?? '',
    city: raw.evaadressid?.asukoha_ehak_tekstina ?? '',
    postalCode: raw.evaadressid?.indeks_ettevotja_aadressis ?? '',
  };
}

function mapPerson(raw: AssociatedPersonRaw): XRoadAssociatedPerson {
  return {
    personType: (raw.isiku_tyyp as 'F' | 'J') ?? 'F',
    role: raw.isiku_roll ?? '',
    roleText: raw.isiku_roll_tekstina ?? '',
    firstName: raw.eesnimi,
    nameOrBusinessName: raw.nimi_arinimi ?? '',
    identityCode: raw.isikukood_registrikood ?? '',
    startDate: raw.algus_kpv,
    endDate: raw.lopp_kpv,
    status: raw.staatus,
  };
}

export const searchCompanyByRegCode = async (
  registryCode: string,
): Promise<XRoadCompany[]> => {
  const raw = await post<LihtandmedRawResponse>('/v1/xroad/arireg/lihtandmed', {
    registryCode,
  });
  const keha = raw?.lihtandmed_v3Response?.keha;
  const leitud = parseInt(keha?.leitud_ettevotjate_arv ?? '0', 10);
  if (leitud === 0 || !keha?.ettevotjad?.item) return [];
  const items = Array.isArray(keha.ettevotjad.item)
    ? keha.ettevotjad.item
    : [keha.ettevotjad.item];
  return items.map(mapCompany);
};

export const searchCompanyByName = async (
  companyName: string,
  maxResults = 10,
): Promise<XRoadCompany[]> => {
  const raw = await post<LihtandmedRawResponse>('/v1/xroad/arireg/lihtandmed', {
    companyName,
    maxResults,
  });
  const keha = raw?.lihtandmed_v3Response?.keha;
  const leitud = parseInt(keha?.leitud_ettevotjate_arv ?? '0', 10);
  if (leitud === 0 || !keha?.ettevotjad?.item) return [];
  const items = Array.isArray(keha.ettevotjad.item)
    ? keha.ettevotjad.item
    : [keha.ettevotjad.item];
  return items.map(mapCompany);
};

interface RrIsikudRawResponse {
  data: XRoadPerson | null;
}

export const searchPersonByCode = async (
  personalCode: string,
): Promise<XRoadPerson | null> => {
  const raw = await post<RrIsikudRawResponse>('/v1/xroad/rr/isikud', {
    personalCode,
  });
  return raw?.data ?? null;
};

export const getAssociatedPersons = async (
  registryCode: string,
): Promise<XRoadAssociatedPerson[]> => {
  const raw = await post<AssociatedPersonsRawResponse>(
    '/v1/xroad/arireg/associated-persons',
    { registryCode },
  );
  const item = raw?.ettevottegaSeotudIsikud_v1Response?.keha?.seosed?.item;
  if (!item) return [];
  const items = Array.isArray(item) ? item : [item];
  return items.map(mapPerson);
};
