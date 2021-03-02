export interface IClientConfig {
  live: Boolean;
  merchantId: string;
  merchantKey: string;
  passphrase?: string;
}
export interface PayfastPaymentRequest {
  data: PayfastPaymentRequestData;
  client: IClientConfig;
}
export interface PayfastGetSecretData {
  merchantId: string;
  paymentReference: String;
  paymentInternalReference: String;
}
export interface PayfastPaymentRequestData {
  amount: Number;
  cancelUrl: String;
  returnUrl: String;
  firstName?: String;
  lastName?: String;
  email?: String;
  cell?: String;
  paymentReference: String;
  paymentInternalReference: String;
  itemName: String;
  itemDescription?: String;
  sourcePluginName: String;
  sendEmailConfirmation?: Boolean;
  sendEmailConfirmationTo?: String;
  paymentMethod?: string;
  customData1?: String;
  customData2?: String;
  customData3?: String;
}
export interface PayfastPaymentCompleteData {
  merchantId: string;
  paymentReference: String;
  paymentId: String;
  itemName: String;
  itemDescription?: String;
  grossAmount: Number;
  feeAmount: Number;
  netAmount: Number;
  customData1?: String;
  customData2?: String;
  customData3?: String;
  paymentInternalReference: String;
  firstName?: String;
  lastName?: String;
  email?: String;
  cell?: String;
}

export interface PayfastRecurringPaymentCompleteData extends PayfastPaymentCompleteData {
  token: string;
  billingDate?: string;
}

export enum PayFastPluginEvents {
  ping = 'ping',
  getPaymentRequest = 'get-payment-request'
}

export enum PayFastSourcePluginEvents {
  getSecret = "get-secret",
  paymentComplete = "payment-complete"
}

export interface PayfastPluginConfig {
  liveUrl: string;
  sandboxUrl: string;
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