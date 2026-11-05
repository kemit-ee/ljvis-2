import { get } from '../../shared/api/client';

export interface HubWsdlItem {
  name: string;
  label: string;
  url: string;
}

export interface HubWsdlFile {
  filename: string;
  contentType: string;
  content: string;
}

/** Haldus > ERRU: Hubi WSDL-ide loend (kinnine, backendis). */
export function fetchHubWsdlList(): Promise<HubWsdlItem[]> {
  return get<HubWsdlItem[]>('/v1/admin/erru/hub-wsdl/list');
}

/** Haldus > ERRU: backend tõmbab WSDL-i Hubist sTESTA kaudu ja tagastab sisu. */
export function downloadHubWsdl(name: string): Promise<HubWsdlFile> {
  return get<HubWsdlFile>('/v1/admin/erru/hub-wsdl/download', { name });
}
