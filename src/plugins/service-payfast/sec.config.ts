import { SecConfig } from "@bettercorp/service-base";
import * as crypto from "crypto";

export interface PayfastPluginConfig {
  adhocUrl: string; // Payfast Adhoc URL
  liveUrl: string; // Payfast Live URL
  sandboxUrl: string; // Payfast Sandbox URL
  commsToken: string; // Comms Token: ** Special encryption token
  commsTokenIV: string; // Comms Token IV: ** Special encryption token
  myHost: string; // My Host: like https://example.com
  itnPath: string; // My ITN Path: Allows you to change the ITN path
  sandboxConfig: PayfastSandboxConfig; // Sandbox Config: Default/test config
}

export interface PayfastSandboxConfig {
  merchantId: string; // Merchant ID
  merchantKey: string; // Merchant Key
  passphrase?: string; // Passphrase / Secret Key
}

export class Config extends SecConfig<PayfastPluginConfig> {
  migrate(
    mappedPluginName: string,
    existingConfig: PayfastPluginConfig
  ): PayfastPluginConfig {
    return {
      adhocUrl:
        existingConfig.adhocUrl !== undefined
          ? existingConfig.adhocUrl
          : "https://api.payfast.co.za/subscriptions/{TOKEN}/adhoc",
      liveUrl:
        existingConfig.liveUrl !== undefined
          ? existingConfig.liveUrl
          : "https://www.payfast.co.za/eng/process",
      sandboxUrl:
        existingConfig.sandboxUrl !== undefined
          ? existingConfig.sandboxUrl
          : "https://sandbox.payfast.co.za/eng/process",
      myHost:
        existingConfig.myHost !== undefined
          ? existingConfig.myHost
          : "http://localhost",
      itnPath:
        existingConfig.itnPath !== undefined
          ? existingConfig.itnPath
          : "/Payfast/ITN",
      commsToken:
        existingConfig.commsToken !== undefined
          ? existingConfig.commsToken
          : crypto.randomBytes(64).toString("hex").substring(2, 34), // 32
      commsTokenIV:
        existingConfig.commsTokenIV !== undefined
          ? existingConfig.commsTokenIV
          : crypto.randomBytes(16).toString("hex"), // 16
      sandboxConfig: {
        merchantId:
          existingConfig.sandboxConfig !== undefined &&
          existingConfig.sandboxConfig.merchantId !== undefined
            ? existingConfig.sandboxConfig.merchantId
            : "10021844",
        merchantKey:
          existingConfig.sandboxConfig !== undefined &&
          existingConfig.sandboxConfig.merchantKey !== undefined
            ? existingConfig.sandboxConfig.merchantKey
            : "5fua4woj28gkh",
        passphrase:
          existingConfig.sandboxConfig !== undefined &&
          existingConfig.sandboxConfig.passphrase !== undefined
            ? existingConfig.sandboxConfig.passphrase
            : "uh_toot6RAID1gnup",
      },
    };
  }
}
