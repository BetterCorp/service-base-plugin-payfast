import { Tools } from "@bettercorp/tools/lib/Tools";
import {
  IClientConfig,
  GetPaymentRequestResponse,
  AdhocPaymentRequestResponse,
} from "../../lib";
import Axios from "axios";
import * as crypto from "crypto";
import * as EXPRESS from "express";
import * as FS from "fs";
import * as PATH from "path";
import { eAndD } from "./eAndD";
import {
  IPluginLogger,
  ServiceCallable,
  ServicesBase,
} from "@bettercorp/service-base";
import { PayfastPluginConfig } from "./sec.config";
import { express } from "@bettercorp/service-base-plugin-web-server";
const bodyParser = require("body-parser");

export interface PayfastReturnableEvents extends ServiceCallable {
  ping(): Promise<boolean>;
  getPaymentRequest(
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
  ): Promise<GetPaymentRequestResponse>;
  performAdHocPayment(
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
  ): Promise<AdhocPaymentRequestResponse>;
}

export interface PayfastEmitEvents extends ServiceCallable {
  onPaymentComplete(
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
}
export interface PayfastEmitReturnableEvents extends ServiceCallable {
  onGetSecret(
    sourceReferenceKey: string,
    merchantId: string,
    paymentReference: string,
    paymentInternalReference: string
  ): Promise<string>;
}

export class Service extends ServicesBase<
  ServiceCallable,
  PayfastEmitEvents,
  PayfastReturnableEvents,
  PayfastEmitReturnableEvents,
  ServiceCallable,
  PayfastPluginConfig
> {
  private express: express;
  constructor(pluginName: string, cwd: string, log: IPluginLogger) {
    super(pluginName, cwd, log);
    this.express = new express(this);
  }

  public override async init(): Promise<void> {
    const self = this;
    await this.express.use(bodyParser.urlencoded({ extended: true }));
    this.express.use(async (req: any, res: any, next: Function) => {
      self.log.debug(
        `REQ[${req.method}] ${req.path} (${JSON.stringify(req.query)})`
      );
      res.setHeader("Access-Control-Allow-Headers", "*");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "*");

      if (req.method.toUpperCase() === "OPTIONS") return res.sendStatus(200);

      next();
    });
    this.express.post(
      (await this.getPluginConfig()).itnPath,
      (a: any, b: any) => self.ITNPost(a, b)
    );
    this.log.info("PAYFAST ITN READY");
    this.express.get("/Payfast/:token", async (req: any, res: any) => {
      try {
        /*const cipherText = Buffer.from(decodeURIComponent(req.params.token), "base64");
        const cipher = crypto.createDecipheriv("aes-256-ccm", Buffer.from(features.getPluginConfig().commsToken, 'hex'), crypto.pseudoRandomBytes(6).toString('hex'), {
            authTagLength: 16
        });
        let decrypted = Buffer.concat([cipher.update(cipherText), cipher.final()]).toString('utf8');*/
        let decrypted = await eAndD.decrypt(
          (
            await self.getPluginConfig()
          ).commsToken,
          (
            await self.getPluginConfig()
          ).commsTokenIV,
          decodeURIComponent(req.params.token)
        );
        let data = JSON.parse(decrypted);
        let now = new Date().getTime();
        if (now >= data.timeExpiry) throw "Time expired!";
        let content = FS.readFileSync(
          PATH.join(
            self.cwd,
            "./node_modules/@bettercorp/service-base-plugin-payfast/content/payfast/index.html"
          )
        ).toString();
        let variablesToClient = {
          url: data.url,
          fields: data.data,
        };
        content = content.replace(
          "{{VARIABLES}}",
          JSON.stringify(variablesToClient)
        );
        res.setHeader("content-type", "text/html");
        res.send(content);
      } catch (xcc) {
        self.log.error(xcc as any);
        res.status(400).send("An unknown error occurred");
      }
    });

    this.onReturnableEvent("ping", async () => await self.ping());
    this.onReturnableEvent(
      "getPaymentRequest",
      async (
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
      ): Promise<GetPaymentRequestResponse> =>
        await self.getPaymentRequest(
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
        )
    );
    this.onReturnableEvent(
      "performAdHocPayment",
      async (
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
      ): Promise<AdhocPaymentRequestResponse> =>
        await self.performAdHocPayment(
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
        )
    );

    // features.onReturnableEvent(null, PayFastPluginEvents.getPaymentRequest, async (resolve, reject, data: PayfastPaymentRequest) => {
    //   if (Tools.isNullOrUndefined(data)) return reject('DATA UNDEFINED');

    //   try {
    //     let workingObj: any = {
    //       merchant_id: data.client.merchantId,
    //       merchant_key: data.client.merchantKey,
    //       return_url: data.data.returnUrl,
    //       cancel_url: data.data.cancelUrl,
    //       notify_url: features.getPluginConfig<PayfastPluginConfig>().myHost + features.getPluginConfig<PayfastPluginConfig>().itnPath,
    //       name_first: data.data.firstName,
    //       name_last: data.data.lastName,
    //       email_address: data.data.email,
    //       cell_number: data.data.cell,
    //       m_payment_id: data.data.paymentReference,
    //       amount: `${data.data.amount.toFixed(2)}`,
    //       item_name: data.data.itemName,
    //       item_description: data.data.itemDescription,
    //       custom_str1: data.data.customData1,
    //       custom_str2: data.data.customData2,
    //       custom_str3: data.data.customData3,
    //       custom_str4: data.data.sourcePluginName,
    //       custom_str5: data.data.paymentInternalReference,
    //       payment_method: data.data.paymentMethod
    //     };
    //     let cleanObject: any = {};
    //     for (let key of Object.keys(workingObj)) {
    //       if (workingObj[key] === undefined || workingObj[key] === null) continue;
    //       cleanObject[key] = workingObj[key];
    //     }

    //     let arrayToSignature = [];
    //     for (let key of Object.keys(cleanObject)) {
    //       arrayToSignature.push(`${key}=${encodeURIComponent(cleanObject[key].trim())}`.replace(/%20/g, '+'));
    //     }
    //     if (!Tools.isNullOrUndefined(data.client.passphrase)) {
    //       arrayToSignature.push(`passphrase=${data.client.passphrase}`);
    //     }
    //     arrayToSignature.sort();
    //     cleanObject.signature = crypto.createHash('md5').update(arrayToSignature.join('&')).digest("hex");

    //     resolve({
    //       url: data.data.live ? features.getPluginConfig<PayfastPluginConfig>().liveUrl : features.getPluginConfig<PayfastPluginConfig>().sandboxUrl,
    //       data: cleanObject,
    //     });
    //   } catch (erc) {
    //     features.log.error(erc);
    //     reject(erc);
    //   }
    // });
  }

  private async ping(): Promise<boolean> {
    const self = this;
    return new Promise<boolean>(async (resolve) =>
      Axios.post((await self.getPluginConfig()).liveUrl)
        .then((x) => {
          resolve(x.status === 400);
        })
        .catch((x) => {
          self.log.error(x);
          resolve(false);
        })
    );
  }

  private async getPaymentRequest(
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
    const self = this;
    return new Promise(async (resolve, reject) => {
      let merchantConfig = (await self.getPluginConfig()).sandboxConfig;
      if (client.live === true) {
        merchantConfig.merchantId = client.merchantId;
        merchantConfig.merchantKey = client.merchantKey;
        merchantConfig.passphrase = client.passphrase;
      }

      try {
        let workingObj: any = {
          merchant_id: merchantConfig.merchantId,
          merchant_key: merchantConfig.merchantKey,
          return_url: returnUrl,
          cancel_url: cancelUrl,
          notify_url:
            (await self.getPluginConfig()).myHost +
            (await self.getPluginConfig()).itnPath,
          amount: `${amount.toFixed(2)}`,
          item_name: itemName,
        };

        // Optional Fields
        if (!Tools.isNullOrUndefined(firstName) && firstName !== "")
          workingObj.name_first = firstName!.substring(0, 100);
        if (!Tools.isNullOrUndefined(lastName) && lastName !== "")
          workingObj.name_last = lastName!.substring(0, 100);
        if (!Tools.isNullOrUndefined(email) && email !== "")
          workingObj.email_address = email!.substring(0, 100);
        if (!Tools.isNullOrUndefined(cell) && cell !== "")
          workingObj.cell_number = cell!.substring(0, 100);
        if (
          !Tools.isNullOrUndefined(paymentReference) &&
          paymentReference !== ""
        )
          workingObj.m_payment_id = paymentReference!.substring(0, 100);

        if (!Tools.isNullOrUndefined(itemDescription))
          workingObj.item_description = itemDescription;
        if (!Tools.isNullOrUndefined(customData1))
          workingObj.custom_str1 = customData1;
        if (!Tools.isNullOrUndefined(customData2))
          workingObj.custom_str2 = customData2;
        if (!Tools.isNullOrUndefined(customData3))
          workingObj.custom_str3 = customData3;
        if (!Tools.isNullOrUndefined(sourceReferenceKey))
          workingObj.custom_str4 = sourceReferenceKey;
        if (!Tools.isNullOrUndefined(paymentInternalReference))
          workingObj.custom_str5 = paymentInternalReference;
        if (!Tools.isNullOrUndefined(sendEmailConfirmation))
          workingObj.email_confirmation = sendEmailConfirmation ? "1" : "0";
        if (!Tools.isNullOrUndefined(sendEmailConfirmationTo))
          workingObj.confirmation_address = sendEmailConfirmationTo;
        if (!Tools.isNullOrUndefined(paymentMethod))
          workingObj.payment_method = paymentMethod;

        let arrayToSignature = [];
        for (let key of Object.keys(workingObj)) {
          if (Tools.isNullOrUndefined(workingObj[key])) continue;
          if (!Tools.isFunction(workingObj[key].trim))
            workingObj[key] = `${workingObj[key] || ""}`;
          let encoded = encodeURIComponent(workingObj[key].trim());
          if (encoded === "") continue;

          //arrayToSignature.push(`${key}=${encodeURIComponent(workingObj[key])}`.replace(/%20/g, '+'));
          arrayToSignature.push(`${key}=${encoded}`.replace(/%20/g, "+"));
        }
        if (!Tools.isNullOrUndefined(merchantConfig.passphrase)) {
          arrayToSignature.push(`passphrase=${merchantConfig.passphrase}`);
        }
        arrayToSignature.sort();
        workingObj.signature = crypto
          .createHash("md5")
          .update(arrayToSignature.join("&"))
          .digest("hex");

        let requestKey = await eAndD.encrypt(
          (
            await self.getPluginConfig()
          ).commsToken,
          (
            await self.getPluginConfig()
          ).commsTokenIV,
          JSON.stringify({
            url: client.live
              ? (
                  await self.getPluginConfig()
                ).liveUrl
              : (
                  await self.getPluginConfig()
                ).sandboxUrl,
            data: workingObj,
            random: crypto
              .randomBytes(Math.floor(Math.random() * 100 + 1))
              .toString("hex"),
          })
        );
        resolve({
          url: `${
            (await self.getPluginConfig()).myHost
          }/Payfast/${encodeURIComponent(requestKey)}`,
          request: {
            time: new Date().getTime(),
            timeExpiry: 0,
            amount: amount,
            merchantId: workingObj.merchant_id,
            firstName: workingObj.name_first,
            lastName: workingObj.name_last,
            email: workingObj.email_address,
            cell: workingObj.cell_number,
            paymentId: workingObj.m_payment_id,
          },
        });
      } catch (erc) {
        self.log.error(erc as any);
        reject(erc);
      }
    });
  }
  private async performAdHocPayment(
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
    const self = this;
    return new Promise(async (resolve, reject) => {
      let merchantConfig = (await self.getPluginConfig()).sandboxConfig;
      if (client.live === true) {
        merchantConfig.merchantId = client.merchantId;
        merchantConfig.merchantKey = client.merchantKey;
        merchantConfig.passphrase = client.passphrase;
      } else {
        return reject("No sandbox for ADHoc payments!");
      }

      try {
        if (!(await self.ping())) {
        }

        let headers: any = {
          "merchant-id": merchantConfig.merchantId,
          timestamp: new Date().toISOString().split(".")[0],
          version: "v1",
        };
        let workingObj: any = {
          notify_url:
            (await self.getPluginConfig()).myHost +
            (await self.getPluginConfig()).itnPath,
          m_payment_id: paymentReference,
          amount: `${(amount * 100).toFixed(0)}`,
          item_name: itemName,
        };
        self.log.info(
          `Performing ADHoc Payment request[${merchantConfig.merchantId}]: ${paymentReference} @${workingObj.amount}`
        );

        if (!Tools.isNullOrUndefined(itemDescription))
          workingObj.item_description = itemDescription;
        if (!Tools.isNullOrUndefined(customData1))
          workingObj.custom_str1 = customData1;
        if (!Tools.isNullOrUndefined(customData2))
          workingObj.custom_str2 = customData2;
        if (!Tools.isNullOrUndefined(customData3))
          workingObj.custom_str3 = customData3;
        if (!Tools.isNullOrUndefined(sourceReferenceKey))
          workingObj.custom_str4 = sourceReferenceKey;
        if (!Tools.isNullOrUndefined(paymentInternalReference))
          workingObj.custom_str5 = paymentInternalReference;

        let arrayToSignature = [];
        for (let key of Object.keys(headers)) {
          arrayToSignature.push(`${key}=${encodeURIComponent(headers[key])}`);
        }
        for (let key of Object.keys(workingObj)) {
          if (Tools.isNullOrUndefined(workingObj[key])) continue;
          if (!Tools.isFunction(workingObj[key].trim))
            workingObj[key] = `${workingObj[key] || ""}`;
          let encoded = encodeURIComponent(workingObj[key].trim());
          if (encoded === "") continue;
          arrayToSignature.push(`${key}=${encoded}`.replace(/%20/g, "+"));
        }
        if (!Tools.isNullOrUndefined(merchantConfig.passphrase)) {
          arrayToSignature.push(`passphrase=${merchantConfig.passphrase}`);
        }
        arrayToSignature.sort();
        headers.signature = crypto
          .createHash("md5")
          .update(arrayToSignature.join("&").replace(/%20/g, "+"))
          .digest("hex");
        headers["Content-Type"] = "application/x-www-form-urlencoded";

        self.log.debug(
          `MAKE PAYMENT REQ: ${(await self.getPluginConfig()).adhocUrl.replace(
            "{TOKEN}",
            token
          )}`
        );
        self.log.debug(headers);
        self.log.debug(workingObj);
        Axios({
          url: (await this.getPluginConfig()).adhocUrl.replace(
            "{TOKEN}",
            token
          ),
          method: "POST",
          data: Object.entries(workingObj)
            .map(
              (x: any) =>
                `${encodeURIComponent(x[0])}=${encodeURIComponent(x[1])}`
            )
            .join("&"),
          headers: headers,
        })
          .then((x) => {
            //self.log.debug(x);
            resolve({
              status: x.status,
              data: x.data,
            });
          })
          .catch((x) => {
            self.log.error(x);
            self.log.error(x.response);
            self.log.error(x.response.data);
            reject({
              status: x.response.status,
              data: x.response.data,
            });
          });
      } catch (erc) {
        this.log.error(erc as any);
        reject(erc);
      }
    });
  }
  private async ITNPost(req: EXPRESS.Request, res: EXPRESS.Response) {
    try {
      this.log.info("PAYFAST ITN RECEIVED");
      //this.log.debug((req as any).data);
      //this.log.debug(req.body);
      //this.log.debug(req.headers);
      let merchantSandboxConfig = (await this.getPluginConfig()).sandboxConfig;

      let arrayToSignature = [];
      for (let key of Object.keys(req.body)) {
        if (key == "signature") {
          continue;
        }
        arrayToSignature.push(`${key}=${encodeURIComponent(req.body[key])}`);
      }

      if (req.body.m_payment_id === merchantSandboxConfig.merchantId) {
        if (!Tools.isNullOrUndefined(merchantSandboxConfig.passphrase)) {
          arrayToSignature.push(
            `passphrase=${merchantSandboxConfig.passphrase}`
          );
        }
      } else {
        let secret = await this.emitEventAndReturn(
          "onGetSecret",
          req.body.custom_str4,
          req.body.merchant_id,
          req.body.m_payment_id,
          req.body.custom_str5
        );
        if (!Tools.isNullOrUndefined(secret)) {
          arrayToSignature.push(`passphrase=${secret}`);
        }
      }

      let signature = crypto
        .createHash("md5")
        .update(arrayToSignature.join("&").replace(/%20/g, "+"))
        .digest("hex");
      if (signature !== req.body.signature) {
        console.log("SIG FAILURE");
        return res.send(400);
      }

      switch (req.body.payment_status) {
        case "COMPLETE":
          {
            await this.emitEvent(
              "onPaymentComplete",
              req.body.merchant_id,
              req.body.m_payment_id,
              req.body.pf_payment_id,
              req.body.item_name,
              req.body.amount_gross,
              req.body.amount_fee,
              req.body.amount_net,
              req.body.custom_str5,
              req.body.item_description,
              req.body.custom_str1,
              req.body.custom_str2,
              req.body.custom_str3,
              req.body.name_first,
              req.body.name_last,
              req.body.email_address,
              req.body.cell_number
            );
          }
          break;
      }

      return res.send(200);
    } catch (exc) {
      this.log.error(exc as Error);
      return res.send(500);
    }
  }
}
