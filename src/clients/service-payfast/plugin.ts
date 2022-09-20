import { ServiceCallable, ServicesClient } from "@bettercorp/service-base";
import {
  IClientConfig,
  GetPaymentRequestResponse,
  AdhocPaymentRequestResponse,
} from "../../lib";
import { PayfastPluginConfig } from "../../plugins/service-payfast/sec.config";
import {
  PayfastEmitEvents,
  PayfastEmitReturnableEvents,
  PayfastReturnableEvents,
} from "../../plugins/service-payfast/plugin";

export class payfast
  extends ServicesClient<
    ServiceCallable,
    PayfastEmitEvents,
    PayfastReturnableEvents,
    PayfastEmitReturnableEvents,
    ServiceCallable,
    PayfastPluginConfig
  >
  implements PayfastReturnableEvents
{
  public override readonly _pluginName = "service-payfast";

  public async ping(): Promise<boolean> {
    return await this._plugin.emitEventAndReturn("ping");
  }
  public async getPaymentRequest(
    client: IClientConfig,
    amount: number,
    cancelUrl: string,
    returnUrl: string,
    paymentReference: string,
    paymentInternalReference: string,
    itemName: string,
    firstName?: string,
    lastName?: string,
    email?: string,
    cell?: string,
    itemDescription?: string,
    sourceReferenceKey?: string,
    sendEmailConfirmation?: Boolean,
    sendEmailConfirmationTo?: string,
    paymentMethod?: string,
    customData1?: string,
    customData2?: string,
    customData3?: string
  ): Promise<GetPaymentRequestResponse> {
    return await this._plugin.emitEventAndReturn(
      "getPaymentRequest",
      client,
      amount,
      cancelUrl,
      returnUrl,
      paymentReference,
      paymentInternalReference,
      itemName,
      firstName,
      lastName,
      email,
      cell,
      itemDescription,
      sourceReferenceKey,
      sendEmailConfirmation,
      sendEmailConfirmationTo,
      paymentMethod,
      customData1,
      customData2,
      customData3
    );
  }
  public async performAdHocPayment(
    client: IClientConfig,
    token: string,
    amount: number,
    paymentReference: string,
    paymentInternalReference: string,
    itemName: string,
    itemDescription?: string,
    sourceReferenceKey?: string,
    customData1?: string,
    customData2?: string,
    customData3?: string
  ): Promise<AdhocPaymentRequestResponse> {
    return await this._plugin.emitEventAndReturn(
      "performAdHocPayment",
      client,
      token,
      amount,
      paymentReference,
      paymentInternalReference,
      itemName,
      itemDescription,
      sourceReferenceKey,
      customData1,
      customData2,
      customData3
    );
  }
  async onGetSecret(listener: {
    (
      sourceReferenceKey: string,
      merchantId: string,
      paymentReference: string,
      paymentInternalReference: string
    ): Promise<string>;
  }) {
    this._plugin.onReturnableEvent(
      "onGetSecret",
      async (
        sourceReferenceKey: string,
        merchantId: string,
        paymentReference: string,
        paymentInternalReference: string
      ): Promise<string> =>
        await listener(
          sourceReferenceKey,
          merchantId,
          paymentReference,
          paymentInternalReference
        )
    );
  }

  async onPaymentComplete(listener: {
    (
      merchantId: string,
      paymentReference: string,
      paymentId: string,
      itemName: string,
      grossAmount: number,
      feeAmount: number,
      netAmount: number,
      paymentInternalReference: string,
      itemDescription?: string,
      customData1?: string,
      customData2?: string,
      customData3?: string,
      firstName?: string,
      lastName?: string,
      email?: string,
      cell?: string
    ): Promise<void>;
  }) {
    this._plugin.onEvent(
      "onPaymentComplete",
      async (
        merchantId: string,
        paymentReference: string,
        paymentId: string,
        itemName: string,
        grossAmount: number,
        feeAmount: number,
        netAmount: number,
        paymentInternalReference: string,
        itemDescription?: string,
        customData1?: string,
        customData2?: string,
        customData3?: string,
        firstName?: string,
        lastName?: string,
        email?: string,
        cell?: string
      ): Promise<void> =>
        await listener(
          merchantId,
          paymentReference,
          paymentId,
          itemName,
          grossAmount,
          feeAmount,
          netAmount,
          paymentInternalReference,
          itemDescription,
          customData1,
          customData2,
          customData3,
          firstName,
          lastName,
          email,
          cell
        )
    );
  }
}
