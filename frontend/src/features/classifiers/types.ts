export interface Classifier {
  id: string;
  code: string;
  name: string;
  description: string;
  total?: number;
  createdAt?: string;
  createdBy?: string;
}

export interface ClassifierValue {
  classifierId: string;
  classifierValueId: string;
  classifierCode: string;
  code: string;
  name: string;
  validFrom: string;
  validUntil: string;
  isValid: boolean;
  total?: number;
}
