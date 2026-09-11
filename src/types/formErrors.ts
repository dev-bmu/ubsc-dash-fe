// Types untuk form errors
export interface BasicInformationErrors {
  business_name?: string
  business_number?: string
  business_scale?: string
  registration_id?: string
  products_type?: string
}

export interface VariableCostsErrors {
  products_total?: string
  facility_total?: string
}

export interface FormErrors {
  basicInformation?: BasicInformationErrors
  variableCosts?: VariableCostsErrors
  facility?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: FormErrors
}
