import { IDictionary } from "@bettercorp/tools/lib/Interfaces";

export interface IClientConfig {
  live: Boolean;
  merchantId: string;
  merchantKey: string;
  passphrase?: string;
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

export interface PayfastRecurringPaymentCompleteData
  extends PayfastPaymentCompleteData {
  token: string;
  billingDate?: string;
}

export interface GetPaymentRequestResponseData {
  time: number;
  timeExpiry: number;
  amount: number;
  merchantId: string;
  firstName: string;
  lastName: string;
  email: string;
  cell: string;
  paymentId: string;
}
export interface GetPaymentRequestResponse {
  url: string;
  request: GetPaymentRequestResponseData;
}
export interface AdhocPaymentRequestResponse {
  status: number;
  data: IDictionary<any>;
}
export interface PayfastPaymentRequestResponse {
  url: string;
  data: any;
}
