export interface FormConfig {
  labelKey: string;
  route: string;
  hasParent: boolean;
  showOnDashboard: boolean;
  parentKey?: string;
  typeParam?: string;
}

export const FORM_CONFIG: Record<string, FormConfig> = {
  foreign_violation_form: {
    labelKey: 'forms.foreign_violation_form',
    route: '/foreign-violation',
    hasParent: false,
    showOnDashboard: true,
  },
  labour_inspection_form: {
    labelKey: 'forms.labour_inspection_form',
    route: '/labour-inspection',
    hasParent: false,
    showOnDashboard: true,
  },
  good_repute_form: {
    labelKey: 'forms.good_repute_form',
    route: '/good-repute',
    hasParent: false,
    showOnDashboard: true,
  },
  compound_form: {
    labelKey: 'forms.compound_form',
    route: '/compound',
    hasParent: false,
    showOnDashboard: true,
  },
  admin_procedure_form: {
    labelKey: 'forms.admin_procedure_form',
    route: '/admin-procedure',
    hasParent: false,
    showOnDashboard: false,
  },
  sp_driver_form: {
    labelKey: 'forms.sp_driver_form',
    route: '/sp-driver',
    hasParent: true,
    showOnDashboard: true,
    parentKey: 'compound_form',
    typeParam: 'driver',
  },
  sp_teammate_form: {
    labelKey: 'forms.sp_teammate_form',
    route: '/sp-teammate',
    hasParent: true,
    showOnDashboard: true,
    parentKey: 'compound_form',
    typeParam: 'teammate',
  },
  vehicle_technical_form: {
    labelKey: 'forms.technical_check.vehicleTitle',
    route: '/vehicle-technical',
    hasParent: true,
    showOnDashboard: true,
    parentKey: 'compound_form',
    typeParam: 'vehicle-technical',
  },
  trailer_technical_form: {
    labelKey: 'forms.technical_check.trailerTitle',
    route: '/trailer-technical',
    hasParent: true,
    showOnDashboard: true,
    parentKey: 'compound_form',
    typeParam: 'trailer-technical',
  },
  sp_dangerous_goods_form: {
    labelKey: 'forms.sp_dangerous_goods_form',
    route: '/sp-dangerous-goods',
    hasParent: true,
    showOnDashboard: true,
  },
  sp_transport_suspended_form: {
    labelKey: 'forms.sp_transport_suspended_form',
    route: '/sp-transport-suspended',
    hasParent: true,
    showOnDashboard: true,
  },
};
