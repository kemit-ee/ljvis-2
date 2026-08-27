import { post } from '../../shared/api/client';
import type {
  XRoadCompany,
  XRoadAssociatedPerson,
  XRoadPerson,
  XRoadVehicle,
  EtoimikCase,
} from './types';

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
    companyName: '',
    maxResults: 10,
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
    registryCode: '',
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

interface LiiklusregisterParing2RawResponse {
  data: XRoadVehicle[];
}

// LJVIS2-55. LJVIS forms only ever search by registration number, so that's
// the only parameter exposed here even though the backend service also
// accepts vinCode/idCode/registrationCertificateNumber.
export const searchVehicleByRegNr = async (
  registrationNumber: string,
): Promise<XRoadVehicle[]> => {
  const raw = await post<LiiklusregisterParing2RawResponse>(
    '/v1/xroad/liiklusregister/paring2',
    { registrationNumber },
  );
  return raw?.data ?? [];
};

/**
 * LJVIS2-56: e-Toimik AnnaIsikuKvalifikatsioonid — manual koondvorm query
 * (see EtoimikQueryCard). Ruuter's declaration.allowlist requires every
 * field to be present as a key even when unused by the caller's chosen
 * xs:choice branch (Ruuter-on-Rust `declare` step quirk — see
 * .ai/coding_guidelines_and_lessons_learned.md) — callers must always pass
 * all 8 fields, using `''` for the ones not applicable.
 */
export interface EtoimikQueryParams {
  caseNumber: string;
  referenceNumber: string;
  personalCode: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sourceType: string;
  sourceRecordId: string;
}

interface EtoimikQueryRawResponse {
  data: EtoimikCase | null;
}

export const queryEtoimikQualifications = async (
  params: EtoimikQueryParams,
): Promise<EtoimikCase | null> => {
  const raw = await post<EtoimikQueryRawResponse>(
    '/v1/xroad/etoimik/kvalifikatsioonid',
    { ...params },
  );
  return raw?.data ?? null;
};
