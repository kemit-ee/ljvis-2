export interface FormConfig {
  classifierCode: string;
  route: string;
}

export const FORM_CONFIG: Record<string, FormConfig> = {
  foreign_violation_form: {
    classifierCode: 'FOREIGN_AUDIT',
    route: '/foreign-violation',
  },
  ti_kontrollkaart_form: {
    classifierCode: 'TI_KONTROLLKAART',
    route: '/ti-kontrollkaart',
  },
  reputation_noncompliance_form: {
    classifierCode: 'REPUTATION_NONCOMPLIANCE',
    route: '/reputation-noncompliance',
  },
  sp_compound_form: {
    classifierCode: 'SP_COMPOUND',
    route: '/sp-compound',
  },
  admin_procedure_form: {
    classifierCode: 'ADMIN_PROCEDURE',
    route: '/admin-procedure',
  },
  sp_driver_form: {
    classifierCode: 'SP_DRIVER_FORM',
    route: '/sp-driver',
  },
  sp_teammate_form: {
    classifierCode: 'SP_TEAMMATE_FORM',
    route: '/sp-teammate',
  },
  sp_vehicle_tech_form: {
    classifierCode: 'SP_VEHICLE_TECH',
    route: '/sp-vehicle-tech',
  },
  sp_trailer_tech_form: {
    classifierCode: 'SP_TRAILER_TECH',
    route: '/sp-trailer-tech',
  },
  sp_dangerous_goods_form: {
    classifierCode: 'SP_DANGEROUS_GOODS',
    route: '/sp-dangerous-goods',
  },
  sp_transport_suspended_form: {
    classifierCode: 'SP_TRANSPORT_SUSPENDED',
    route: '/sp-transport-suspended',
  },
};
