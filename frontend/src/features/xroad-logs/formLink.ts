import { FORM_CONFIG } from '../control-forms/formRoutes';

/**
 * eToimiku X-tee logi `source_type` väärtused ei ühti 1:1 FORM_CONFIG
 * võtmetega — cron-voog kirjutab tramm-kontrollkaardi jaoks
 * `tram_control_card`, aga frontendi vormivõti on `tram_driver_form`
 * (vt DSL/Ruuter.internal/.../cron/etoimik-tram-decision-sync.yml).
 */
const SOURCE_TYPE_TO_FORM_KEY: Record<string, string> = {
  compound_form: 'compound_form',
  labour_inspection_form: 'labour_inspection_form',
  vehicle_technical_form: 'vehicle_technical_form',
  trailer_technical_form: 'trailer_technical_form',
  sp_driver_form: 'sp_driver_form',
  tram_control_card: 'tram_driver_form',
};

/** Tagastab lingi vormile, mille andmeid eToimiku päring kasutas, või `null` kui tundmatu/puudub. */
export function buildFormLink(
  sourceType?: string | null,
  recordId?: string | null,
): string | null {
  if (!sourceType || !recordId) return null;
  const key = SOURCE_TYPE_TO_FORM_KEY[sourceType];
  const config = key ? FORM_CONFIG[key] : undefined;
  return config ? `/control-forms${config.route}/${recordId}` : null;
}
