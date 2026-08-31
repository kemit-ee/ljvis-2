export interface ClassifierValueData {
  classifierValueKey: number;
  classifierCode: string;
  code: string;
  name: string;
  nameEn?: string;
  parentKey: number | null;
  description?: string;
  validFrom?: string;
  validUntil?: string | null;
  isValid?: boolean;
}
