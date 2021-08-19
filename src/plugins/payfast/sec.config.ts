import { PayfastPluginConfig } from '../../lib';
import * as crypto from 'crypto';

export default (): PayfastPluginConfig => {
  return {
    adhocUrl: 'https://api.payfast.co.za/subscriptions/{TOKEN}/adhoc',
    liveUrl: 'https://www.payfast.co.za/eng/process',
    sandboxUrl: 'https://sandbox.payfast.co.za/eng/process',
    myHost: 'http://localhost',
    itnPath: '/Payfast/ITN',
    commsToken: crypto.randomBytes(64).toString('hex').substring(2, 34), // 32
    commsTokenIV: crypto.randomBytes(16).toString('hex'), // 16
    sandboxConfig: {
      merchantId: '10021844',
      merchantKey: '5fua4woj28gkh',
      passphrase: 'uh_toot6RAID1gnup'
    }
  };
};