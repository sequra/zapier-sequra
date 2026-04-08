// authentication.js
const authentication = {
  type: 'custom',
  fields: [
    {
      key: 'base_url',
      label: 'Environment',
      required: true,
      choices: {
        'https://live.sequrapi.com': 'Live seQura',
        'https://live.sequra.svea.com': 'Live SVEA',
        'https://sandbox.sequrapi.com': 'Sandbox seQura',
        'https://sandbox.sequra.svea.com': 'Sandbox SVEA'
      },
      helpText: 'Select the seQura environment to connect to. See [seQura API docs](https://docs.sequra.com/) for details.'
    },
    { key: 'account_key', label: 'Username', required: true, type: 'string', helpText: 'Basic Auth username. Find it in [your seQura dashboard](https://portal.sequra.com/).' },
    { key: 'account_secret', label: 'Password', required: true, type: 'password', helpText: 'Basic Auth password. Find it in [your seQura dashboard](https://portal.sequra.com/).' }
  ],
  connectionLabel: '{{account_key}} ({{base_url}})',
  test: (z, bundle) => {
    const { base_url, account_key, account_secret } = bundle.authData;
    if (!base_url || !account_key || !account_secret) {
      throw new z.errors.Error('Missing seQura credentials.');
    }
    const allowedUrls = [
      'https://live.sequrapi.com',
      'https://live.sequra.svea.com',
      'https://sandbox.sequrapi.com',
      'https://sandbox.sequra.svea.com'
    ];
    if (!allowedUrls.includes(base_url)) {
      throw new z.errors.Error('Invalid environment URL. Please select a valid seQura environment.');
    }
    if (/\s/.test(account_key) || /\s/.test(account_secret)) {
      throw new z.errors.Error('Credentials must not contain whitespace.');
    }
    return { ok: true };
  }
};

module.exports = authentication;
