import { CPlugin, CPluginClient, IPlugin } from '@bettercorp/service-base/lib/ILib';
import { Tools } from '@bettercorp/tools/lib/Tools';
import { PayFastPluginEvents, PayfastPaymentRequest, PayfastPluginConfig, PayFastSourcePluginEvents, PayfastGetSecretData, PayfastPaymentCompleteData, PayfastADHocPaymentRequest } from '../../lib';
import Axios from 'axios';
import * as crypto from 'crypto';
import * as EXPRESS from 'express';
import { express } from '@bettercorp/service-base-plugin-web-server/lib/plugins/express/express';
import * as FS from 'fs';
import * as PATH from 'path';
import { eAndD } from './eAndD';
const bodyParser = require('body-parser');

export interface PayfastPaymentRequestResponse {
  url: string;
  data: any;
}
export interface PayfastADHocPaymentRequestResponse {
  status: number;
  data: any;
}
export interface PayfastGetSecret {
  merchantId: string;
  paymentReference: string;
  paymentInternalReference: string;
}
export type PromiseResolve<TData = any, TReturn = void> = (data: TData) => TReturn;
export class payfast extends CPluginClient<any> {
  public readonly _pluginName: string = "payfast";
  private _refPluginName: string;
  constructor(self: IPlugin) {
    super(self);
    this._refPluginName = this.refPlugin.pluginName;
  }

  async ping(): Promise<boolean> {
    return this.emitEventAndReturn(PayFastPluginEvents.ping);
  }

  async startPaymentRequest(request: PayfastPaymentRequest): Promise<PayfastPaymentRequestResponse> {
    request.data.sourcePluginName = this._refPluginName;
    return this.emitEventAndReturn(PayFastPluginEvents.getPaymentRequest, request);
  }

  async performAdHocPayment(request: PayfastADHocPaymentRequest): Promise<PayfastADHocPaymentRequestResponse> {
    request.data.sourcePluginName = this._refPluginName;
    return this.emitEventAndReturn(PayFastPluginEvents.performAdHocPayment, request);
  }

  async onGetSecret(listener: (resolve: PromiseResolve<string, void>, reject: PromiseResolve<any, void>, request: PayfastGetSecret) => void) {
    this.refPlugin.onReturnableEvent(this._refPluginName, PayFastSourcePluginEvents.getSecret, listener as any);
  }

  async onPaymentComplete(listener: (response: PayfastPaymentCompleteData) => void) {
    this.refPlugin.onEvent(this._refPluginName, PayFastSourcePluginEvents.paymentComplete, listener as any);
  }
}

export class Plugin extends CPlugin<PayfastPluginConfig> {
  express!: express;

  private async ping(resolve: Function) {
    const self = this;
    Axios.post((await self.getPluginConfig()).liveUrl).then(x => {
      resolve(x.status === 400);
    }).catch(x => {
      self.log.error(x);
      resolve(false);
    });
  }

  private async getPaymentRequest(resolve: Function, reject: Function, data: PayfastPaymentRequest) {
    if (Tools.isNullOrUndefined(data)) return reject('DATA UNDEFINED');

    let merchantConfig = (await this.getPluginConfig()).sandboxConfig;
    if (data.client.live === true) {
      merchantConfig.merchantId = data.client.merchantId;
      merchantConfig.merchantKey = data.client.merchantKey;
      merchantConfig.passphrase = data.client.passphrase;
    }

    try {
      let workingObj: any = {
        merchant_id: merchantConfig.merchantId,
        merchant_key: merchantConfig.merchantKey,
        return_url: data.data.returnUrl,
        cancel_url: data.data.cancelUrl,
        notify_url: (await this.getPluginConfig()).myHost + (await this.getPluginConfig()).itnPath,
        name_first: data.data.firstName,
        name_last: data.data.lastName,
        email_address: data.data.email,
        cell_number: data.data.cell,
        m_payment_id: data.data.paymentReference,
        amount: `${ data.data.amount.toFixed(2) }`,
        item_name: data.data.itemName
      };

      if (!Tools.isNullOrUndefined(data.data.itemDescription))
        workingObj.item_description = data.data.itemDescription;
      if (!Tools.isNullOrUndefined(data.data.customData1))
        workingObj.custom_str1 = data.data.customData1;
      if (!Tools.isNullOrUndefined(data.data.customData2))
        workingObj.custom_str2 = data.data.customData2;
      if (!Tools.isNullOrUndefined(data.data.customData3))
        workingObj.custom_str3 = data.data.customData3;
      if (!Tools.isNullOrUndefined(data.data.sourcePluginName))
        workingObj.custom_str4 = data.data.sourcePluginName;
      if (!Tools.isNullOrUndefined(data.data.paymentInternalReference))
        workingObj.custom_str5 = data.data.paymentInternalReference;
      if (!Tools.isNullOrUndefined(data.data.sendEmailConfirmation))
        workingObj.email_confirmation = data.data.sendEmailConfirmation ? '1' : '0';
      if (!Tools.isNullOrUndefined(data.data.sendEmailConfirmationTo))
        workingObj.confirmation_address = data.data.sendEmailConfirmationTo;
      if (!Tools.isNullOrUndefined(data.data.paymentMethod))
        workingObj.payment_method = data.data.paymentMethod;

      let arrayToSignature = [];
      for (let key of Object.keys(workingObj)) {
        //arrayToSignature.push(`${key}=${encodeURIComponent(workingObj[key])}`.replace(/%20/g, '+'));
        arrayToSignature.push(`${ key }=${ encodeURIComponent(workingObj[key].trim()) }`.replace(/%20/g, '+'));
      }
      if (!Tools.isNullOrUndefined(merchantConfig.passphrase)) {
        arrayToSignature.push(`passphrase=${ merchantConfig.passphrase }`);
      }
      arrayToSignature.sort();
      workingObj.signature = crypto.createHash('md5').update(arrayToSignature.join('&')).digest("hex");

      let requestKey = await eAndD.encrypt(this, JSON.stringify({
        url: data.client.live ? (await this.getPluginConfig()).liveUrl : (await this.getPluginConfig()).sandboxUrl,
        data: workingObj,
        random: crypto.randomBytes(Math.floor((Math.random() * 100) + 1)).toString('hex')
      }));
      resolve({
        url: `${ (await this.getPluginConfig()).myHost }/Payfast/${ encodeURIComponent(requestKey) }`,
        request: {
          time: new Date().getTime(),
          timeExpiry: 0,
          amount: data.data.amount,
          merchantId: workingObj.merchant_id,
          firstName: workingObj.name_first,
          lastName: workingObj.name_last,
          email: workingObj.email_address,
          cell: workingObj.cell_number,
          paymentId: workingObj.m_payment_id
        }
      });
    } catch (erc) {
      this.log.error(erc);
      reject(erc);
    }
  }
  private async performAdHocPayment(resolve: Function, reject: Function, data: PayfastADHocPaymentRequest) {
    if (Tools.isNullOrUndefined(data)) return reject('DATA UNDEFINED');

    let merchantConfig = (await this.getPluginConfig()).sandboxConfig;
    if (data.client.live === true) {
      merchantConfig.merchantId = data.client.merchantId;
      merchantConfig.merchantKey = data.client.merchantKey;
      merchantConfig.passphrase = data.client.passphrase;
    } else {
      return reject('No sandbox for ADHoc payments!');
    }

    try {
      let headers: any = {
        "merchant-id": merchantConfig.merchantId,
        "timestamp": new Date().toISOString().split('.')[0],
        "version": "v1",
      };
      let workingObj: any = {
        notify_url: (await this.getPluginConfig()).myHost + (await this.getPluginConfig()).itnPath,
        m_payment_id: data.data.paymentReference,
        amount: `${ (data.data.amount * 100).toFixed(0) }`,
        item_name: data.data.itemName
      };
      this.log.info(`Performing ADHoc Payment request[${ merchantConfig.merchantId }]: ${ data.data.paymentReference } @${ workingObj.amount }`);

      if (!Tools.isNullOrUndefined(data.data.itemDescription))
        workingObj.item_description = data.data.itemDescription;
      if (!Tools.isNullOrUndefined(data.data.customData1))
        workingObj.custom_str1 = data.data.customData1;
      if (!Tools.isNullOrUndefined(data.data.customData2))
        workingObj.custom_str2 = data.data.customData2;
      if (!Tools.isNullOrUndefined(data.data.customData3))
        workingObj.custom_str3 = data.data.customData3;
      if (!Tools.isNullOrUndefined(data.data.sourcePluginName))
        workingObj.custom_str4 = data.data.sourcePluginName;
      if (!Tools.isNullOrUndefined(data.data.paymentInternalReference))
        workingObj.custom_str5 = data.data.paymentInternalReference;

      let arrayToSignature = [];
      for (let key of Object.keys(headers)) {
        arrayToSignature.push(`${ key }=${ encodeURIComponent(headers[key]) }`);
      }
      for (let key of Object.keys(workingObj)) {
        arrayToSignature.push(`${ key }=${ encodeURIComponent(workingObj[key].trim()) }`.replace(/%20/g, '+'));
      }
      if (!Tools.isNullOrUndefined(merchantConfig.passphrase)) {
        arrayToSignature.push(`passphrase=${ merchantConfig.passphrase }`);
      }
      arrayToSignature.sort();
      headers.signature = crypto.createHash('md5').update(arrayToSignature.join('&').replace(/%20/g, '+')).digest("hex");
      headers['Content-Type'] = 'application/x-www-form-urlencoded';

      this.log.debug(`MAKE PAYMENT REQ: ${ (await this.getPluginConfig()).adhocUrl.replace('{TOKEN}', data.data.token) }`);
      this.log.debug(headers);
      this.log.debug(workingObj);
      const self = this;
      Axios({
        url: (await this.getPluginConfig()).adhocUrl.replace('{TOKEN}', data.data.token),
        method: 'POST',
        data: Object.entries(workingObj)
          .map((x: any) => `${ encodeURIComponent(x[0]) }=${ encodeURIComponent(x[1]) }`)
          .join('&'),
        headers: headers
      }).then(x => {
        self.log.debug(x);
        resolve({
          status: x.status,
          data: x.data
        });
      }).catch(x => {
        self.log.error(x);
        self.log.error(x.response);
        self.log.error(x.response.data);
        reject({
          status: x.response.status,
          data: x.response.data
        });
      });
    } catch (erc) {
      this.log.error(erc);
      reject(erc);
    }
  }

  init(): Promise<void> {
    const self = this;
    return new Promise(async (resolve) => {
      self.express = new express(self);

      await self.express.use(bodyParser.urlencoded({ extended: true }));
      self.express.use(async (req: any, res: any, next: Function) => {
        self.log.debug(`REQ[${ req.method }] ${ req.path } (${ JSON.stringify(req.query) })`);
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', '*');

        if (req.method.toUpperCase() === 'OPTIONS')
          return res.sendStatus(200);

        next();
      });
      self.express.post((await self.getPluginConfig()).itnPath, (a: any, b: any) => self.ITNPost(a, b));
      self.log.info('PAYFAST ITN READY');
      self.express.get('/Payfast/:token', async (req: any, res: any) => {
        try {
          /*const cipherText = Buffer.from(decodeURIComponent(req.params.token), "base64");
          const cipher = crypto.createDecipheriv("aes-256-ccm", Buffer.from(features.getPluginConfig().commsToken, 'hex'), crypto.pseudoRandomBytes(6).toString('hex'), {
              authTagLength: 16
          });
          let decrypted = Buffer.concat([cipher.update(cipherText), cipher.final()]).toString('utf8');*/
          let decrypted = await eAndD.decrypt(self, decodeURIComponent(req.params.token));
          let data = JSON.parse(decrypted);
          let now = new Date().getTime();
          if (now >= data.timeExpiry)
            throw 'Time expired!';
          let content = FS.readFileSync(PATH.join(self.cwd, './node_modules/@bettercorp/service-base-plugin-payfast/content/payfast/index.html')).toString();
          let variablesToClient = {
            url: data.url,
            fields: data.data
          };
          content = content.replace('{{VARIABLES}}', JSON.stringify(variablesToClient));
          res.setHeader('content-type', 'text/html');
          res.send(content);
        }
        catch (xcc) {
          self.log.error(xcc);
          res.status(400).send('An unknown error occurred');
        }
      });

      self.onReturnableEvent(null, PayFastPluginEvents.ping, async (a) => await self.ping(a));
      self.onReturnableEvent(null, PayFastPluginEvents.getPaymentRequest, (a, b, c) => self.getPaymentRequest(a, b, c));
      self.onReturnableEvent(null, PayFastPluginEvents.performAdHocPayment, (a, b, c) => self.performAdHocPayment(a, b, c));

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

      resolve();
    });
  }

  private payfast_lastPaymentId: Array<string> = [];

  private async ITNPost(req: EXPRESS.Request, res: EXPRESS.Response) {
    if (this.payfast_lastPaymentId.length > 50) {
      this.payfast_lastPaymentId.splice(50);
    }
    try {
      this.log.info('PAYFAST ITN RECEIVED');
      this.log.debug((req as any).data);
      this.log.debug(req.body);
      this.log.debug(req.headers);
      let merchantSandboxConfig = (await this.getPluginConfig()).sandboxConfig;

      let arrayToSignature = [];
      for (let key of Object.keys(req.body)) {
        if (key == 'signature') {
          continue;
        }
        arrayToSignature.push(`${ key }=${ encodeURIComponent(req.body[key]) }`);
      }

      if (req.body.m_payment_id === merchantSandboxConfig.merchantId) {
        if (!Tools.isNullOrUndefined(merchantSandboxConfig.passphrase)) {
          arrayToSignature.push(`passphrase=${ merchantSandboxConfig.passphrase }`);
        }
      } else {
        let secret = await this.emitEventAndReturn<PayfastGetSecretData, string | null | undefined>(req.body.custom_str4, PayFastSourcePluginEvents.getSecret, {
          merchantId: req.body.merchant_id,
          paymentReference: req.body.m_payment_id,
          paymentInternalReference: req.body.custom_str5
        });
        if (!Tools.isNullOrUndefined(secret)) {
          arrayToSignature.push(`passphrase=${ secret }`);
        }
      }

      let signature = crypto.createHash('md5').update(arrayToSignature.join('&').replace(/%20/g, '+')).digest("hex");
      if (signature !== req.body.signature) {
        console.log('SIG FAILURE');
        return res.send(400);
      }

      switch (req.body.payment_status) {
        case 'COMPLETE': {
          this.emitEvent<PayfastPaymentCompleteData>(req.body.custom_str4, PayFastSourcePluginEvents.paymentComplete, {
            merchantId: req.body.merchant_id,
            paymentReference: req.body.m_payment_id,
            paymentId: req.body.pf_payment_id,
            itemName: req.body.item_name,
            itemDescription: req.body.item_description,
            grossAmount: req.body.amount_gross,
            feeAmount: req.body.amount_fee,
            netAmount: req.body.amount_net,
            customData1: req.body.custom_str1,
            customData2: req.body.custom_str2,
            customData3: req.body.custom_str3,
            paymentInternalReference: req.body.custom_str5,
            firstName: req.body.name_first,
            lastName: req.body.name_last,
            email: req.body.email_address,
            cell: req.body.cell_number,
          });
        } break;
      }

      return res.send(200);
    } catch (exc) {
      this.log.error(exc);
      return res.send(500);
    }
  }
}