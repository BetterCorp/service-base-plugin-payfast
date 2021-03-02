import { IPlugin, PluginFeature } from '@bettercorp/service-base/lib/ILib';
import { Tools } from '@bettercorp/tools/lib/Tools';
import { PayFastPluginEvents, PayfastPaymentRequest, PayfastPluginConfig, PayFastSourcePluginEvents, PayfastGetSecretData, PayfastPaymentCompleteData } from '../../lib';
import Axios from 'axios';
import * as crypto from 'crypto';

export class Plugin implements IPlugin {
  init (features: PluginFeature): Promise<void> {
    let payfast_lastPaymentId: Array<string> = [];
    return new Promise((resolve) => {
      features.onReturnableEvent(null, PayFastPluginEvents.ping, async (resolve, reject, data: any) => {
        if (Tools.isNullOrUndefined(data)) return reject('DATA UNDEFINED');

        Axios.post(features.getPluginConfig<PayfastPluginConfig>().liveUrl).then(x => {
          resolve(x.status === 400);
        }).catch(x => {
          features.log.error(x);
          resolve(false);
        });
      });
      features.onReturnableEvent(null, PayFastPluginEvents.getPaymentRequest, async (resolve, reject, data: PayfastPaymentRequest) => {
        if (Tools.isNullOrUndefined(data)) return reject('DATA UNDEFINED');

        let merchantConfig = features.getPluginConfig<PayfastPluginConfig>().sandboxConfig;
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
            notify_url: features.getPluginConfig<PayfastPluginConfig>().myHost + merchantConfig.itnPath,
            name_first: data.data.firstName,
            name_last: data.data.lastName,
            email_address: data.data.email,
            cell_number: data.data.cell,
            m_payment_id: data.data.paymentReference,
            amount: `${data.data.amount.toFixed(2)}`,
            item_name: data.data.itemName,
            item_description: data.data.itemDescription,
            custom_str1: data.data.customData1,
            custom_str2: data.data.customData2,
            custom_str3: data.data.customData3,
            custom_str4: data.data.sourcePluginName,
            custom_str5: data.data.paymentInternalReference,
            payment_method: data.data.paymentMethod
          };
          let cleanObject: any = {};
          for (let key of Object.keys(workingObj)) {
            if (workingObj[key] === undefined || workingObj[key] === null) continue;
            cleanObject[key] = workingObj[key];
          }

          let arrayToSignature = [];
          for (let key of Object.keys(cleanObject)) {
            arrayToSignature.push(`${key}=${encodeURIComponent(cleanObject[key].trim())}`.replace(/%20/g, '+'));
          }
          if (!Tools.isNullOrUndefined(merchantConfig.passphrase)) {
            arrayToSignature.push(`passphrase=${merchantConfig.passphrase}`);
          }
          arrayToSignature.sort();
          cleanObject.signature = crypto.createHash('md5').update(arrayToSignature.join('&')).digest("hex");

          resolve({
            url: data.data.live ? features.getPluginConfig<PayfastPluginConfig>().liveUrl : features.getPluginConfig<PayfastPluginConfig>().sandboxUrl,
            data: cleanObject,
          });
        } catch (erc) {
          features.log.error(erc);
          reject(erc);
        }
      });

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

      features.initForPlugins('plugin-express', 'post', {
        arg1: features.getPluginConfig<PayfastPluginConfig>().itnPath,
        arg2: async (req: any, res: any) => {
          if (payfast_lastPaymentId.length > 50) {
            payfast_lastPaymentId.splice(50);
          }
          try {
            let merchantSandboxConfig = features.getPluginConfig<PayfastPluginConfig>().sandboxConfig;

            let arrayToSignature = [];
            for (let key of Object.keys(req.data)) {
              if (key == 'signature') {
                continue;
              }
              arrayToSignature.push(`${key}=${encodeURIComponent(req.data[key])}`);
            }

            if (req.data.m_payment_id === merchantSandboxConfig.merchantId) {
              if (!Tools.isNullOrUndefined(merchantSandboxConfig.passphrase)) {
                arrayToSignature.push(`passphrase=${merchantSandboxConfig.passphrase}`);
              }
            } else {
              let secret = await features.emitEventAndReturn<PayfastGetSecretData, string | null | undefined>(req.data.custom_str4, PayFastSourcePluginEvents.getSecret, {
                merchantId: req.data.merchant_id,
                paymentReference: req.data.m_payment_id,
                paymentInternalReference: req.data.custom_str5
              });
              if (!Tools.isNullOrUndefined(secret)) {
                arrayToSignature.push(`passphrase=${secret}`);
              }
            }

            let signature = crypto.createHash('md5').update(arrayToSignature.join('&').replace(/%20/g, '+')).digest("hex");
            if (signature !== req.data.signature) {
              console.log('SIG FAILURE');
              return res.send(400);
            }

            switch (req.data.payment_status) {
              case 'COMPLETE': {
                features.emitEvent<PayfastPaymentCompleteData>(req.data.custom_str4, PayFastSourcePluginEvents.paymentComplete, {
                  merchantId: req.data.merchant_id,
                  paymentReference: req.data.m_payment_id,
                  paymentId: req.data.pf_payment_id,
                  itemName: req.data.item_name,
                  itemDescription: req.data.item_description,
                  grossAmount: req.data.amount_gross,
                  feeAmount: req.data.amount_fee,
                  netAmount: req.data.amount_net,
                  customData1: req.data.custom_str1,
                  customData2: req.data.custom_str2,
                  customData3: req.data.custom_str3,
                  paymentInternalReference: req.data.custom_str5,
                  firstName: req.data.name_first,
                  lastName: req.data.name_last,
                  email: req.data.email_address,
                  cell: req.data.cell_number,
                });
              } break;
            }

            res.send(200);
          } catch (exc) {
            features.log.error(exc);
            res.send(500);
          }
        }
      });

      resolve();
    });
  }
}