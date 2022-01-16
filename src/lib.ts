export interface IClientConfig {
  live: Boolean;
  merchantId: string;
  merchantKey: string;
  passphrase?: string;
}
export interface PayfastGetSecretData {
  merchantId: string;
  paymentReference: string;
  paymentInternalReference: string;
}
export interface PayfastPaymentRequest {
  data: PayfastPaymentRequestData;
  client: IClientConfig;
}
export interface PayfastPaymentRequestData {
  amount: number;
  cancelUrl: string;
  returnUrl: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  cell?: string;
  paymentReference: string;
  paymentInternalReference: string;
  itemName: string;
  itemDescription?: string;
  sourcePluginName?: string;
  sendEmailConfirmation?: Boolean;
  sendEmailConfirmationTo?: string;
  paymentMethod?: string;
  customData1?: string;
  customData2?: string;
  customData3?: string;
}
export interface PayfastPaymentCompleteData {
  merchantId: string;
  paymentReference: string;
  paymentId: string;
  itemName: string;
  itemDescription?: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  customData1?: string;
  customData2?: string;
  customData3?: string;
  paymentInternalReference: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  cell?: string;
}

export interface PayfastADHocPaymentRequest {
  data: PayfastADHocPaymentRequestData;
  client: IClientConfig;
}
export interface PayfastADHocPaymentRequestData {
  token: string;
  amount: number;
  paymentReference: string;
  paymentInternalReference: string;
  itemName: string;
  itemDescription?: string;
  sourcePluginName?: string;
  customData1?: string;
  customData2?: string;
  customData3?: string;
}

export interface PayfastRecurringPaymentCompleteData extends PayfastPaymentCompleteData {
  token: string;
  billingDate?: string;
}

export enum PayFastPluginEvents {
  ping = 'ping',
  getPaymentRequest = 'get-payment-request',
  performAdHocPayment = 'perform-adhoc-payment'
}

export enum PayFastSourcePluginEvents {
  getSecret = "payfast-get-secret",
  paymentComplete = "payfast-payment-complete"
}

export interface PayfastPluginConfig {
  adhocUrl: string;
  liveUrl: string;
  sandboxUrl: string;
  commsToken: string;
  commsTokenIV: string;
  myHost: string;
  itnPath: string;
  sandboxConfig: PayfastSandboxConfig;
}

export interface PayfastPaymentRequestResponse {
  url: string;
  data: any;
}

export interface PayfastSandboxConfig {
  merchantId: string;
  merchantKey: string;
  passphrase?: string;
}