import { PayfastPluginConfig } from '../../lib';

export default (): PayfastPluginConfig => {
  return {
    liveUrl: 'https://www.payfast.co.za/eng/process',
    sandboxUrl: 'https://sandbox.payfast.co.za/eng/process',
    myHost: 'http://localhost',
    itnPath: '/Payfast/ITN',
    sandboxConfig: {
      merchantId: '10021844',
      merchantKey: '5fua4woj28gkh',
      passphrase: 'uh_toot6RAID1gnup'
    }
  };
};