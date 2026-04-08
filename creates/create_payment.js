// creates/create_payment.js
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fetchProductChoices = async (z, bundle) => {
  const baseUrl = bundle.authData.base_url.replace(/\/+$/, '');
  const url = `${baseUrl}/merchants/${bundle.authData.account_key}/payment_methods`;
  const res = await z.request({ method: 'GET', url });
  const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;

  const choices = {
      tbs: 'Any available',
  };
  for (const option of data.payment_options || []) {
    for (const method of option.methods || []) {
      if (method.product && !choices[method.product]) {
        choices[method.product] = method.title;
      }
    }
  }
  return choices;
};

const perform = async (z, bundle) => {
  const { channel, reference, email, phone, given_names, surnames,
    item_names, item_quantities, item_unit_prices,
    total_amount, currency, product, notification_url, test_mode } = bundle.inputData;

  // Client-side validation
  if (!EMAIL_RE.test(email)) {
    throw new z.errors.Error('Shopper email is not a valid email address.');
  }
  if (channel === 'sms' && !phone) {
    throw new z.errors.Error('Shopper phone is required when channel is "sms".');
  }
  // Zip parallel item lists into an items array
  const items = [];
  if (item_names && item_names.length > 0) {
    for (let i = 0; i < item_names.length; i++) {
      items.push({
        name: item_names[i],
        quantity: parseInt(item_quantities?.[i], 10) || 1,
        unit_price: parseInt(item_unit_prices?.[i], 10) || 0
      });
    }
  }

  const body = {
    channel,
    test_mode: test_mode === true || test_mode === 'true',
    ...(reference && { reference }),
    email,
    ...(phone && { phone }),
    ...(given_names && { given_names }),
    ...(surnames && { surnames }),
    total_amount: parseInt(total_amount, 10),
    currency: currency || 'EUR',
    product: product || 'tbs',
    ...(items.length > 0 && { items }),
    ...(notification_url && { notification_url })
  };

  const url = 'https://partner-integration-middleware.sequra.com/api/workflow_payments/v1/payments';

  const res = await z.request({
    method: 'POST',
    url,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const loc = res.headers.get('location');
  if (!loc) {
    throw new z.errors.Error('Missing Location header in API response. Check your credentials and request payload.');
  }
  const uuid = loc.split('/').pop();
  const baseUrl = bundle.authData.base_url.replace(/\/+$/, '');
  const payment_link = `${baseUrl}/orders/${uuid}/embedded_form?product=${product || 'tbs'}`;

  return { uuid, payment_url: loc, payment_link };
};

module.exports = {
  key: 'create_payment',
  noun: 'Payment',
  display: {
    label: 'Create Payment',
    description: 'Creates a seQura payment and send link to the shopper.'
  },
  operation: {
    cleanInputData: false,
    inputFields: [
      {
        key: 'channel',
        label: 'Channel',
        required: true,
        choices: { sms: 'SMS', email: 'Email', no_op: 'None' },
        altersDynamicFields: true,
        helpText: 'Delivery channel for the checkout form.'
      },
      {
        key: 'reference',
        label: 'Reference',
        required: false,
        helpText: 'Unique payment reference string.'
      },
      {
        key: 'email',
        label: 'Shopper Email',
        required: true,
        type: 'string'
      },
      (z, bundle) => {
        const isSms = bundle.inputData.channel === 'sms';
        return [{
          key: 'phone',
          label: 'Shopper Phone',
          required: isSms,
          helpText: isSms ? 'Phone number is required for SMS delivery.' : 'Optional for email delivery.'
        }];
      },
      {
        key: 'given_names',
        label: 'Shopper Given Names',
        required: false
      },
      {
        key: 'surnames',
        label: 'Shopper Surnames',
        required: false
      },
      {
        key: 'total_amount',
        label: 'Total Amount (cents)',
        required: true,
        type: 'integer',
        helpText: 'Total amount in cents, e.g. 12345 = €123.45.'
      },
      {
        key: 'currency',
        label: 'Currency',
        required: false,
        default: 'EUR',
        helpText: 'ISO 4217 currency code. Defaults to EUR.'
      },
      async (z, bundle) => {
        const choices = await fetchProductChoices(z, bundle);
        return [{
          key: 'product',
          label: 'Payment Method / Product',
          required: false,
          choices,
          helpText: 'Available payment products for your merchant account.'
        }];
      },
      {
        key: 'item_names',
        label: 'Item Names',
        list: true,
        required: false,
        helpText: 'Name for each line item. Add one entry per item.'
      },
      {
        key: 'item_quantities',
        label: 'Item Quantities',
        list: true,
        required: false,
        type: 'integer',
        helpText: 'Quantity for each line item (same order as names).'
      },
      {
        key: 'item_unit_prices',
        label: 'Item Unit Prices (cents)',
        list: true,
        required: false,
        type: 'integer',
        helpText: 'Unit price in cents for each line item (same order as names).'
      },
      {
        key: 'notification_url',
        label: 'Notification URL',
        required: false,
        helpText: 'Webhook URL to receive IPN callbacks from seQura.'
      },
      {
        key: 'test_mode',
        label: 'Test Mode',
        required: false,
        type: 'boolean',
        default: 'false'
      }
    ],
    perform,
    sample: {
      uuid: '00000000-0000-0000-0000-000000000000',
      payment_url: 'https://middleware.sequra.com/api/workflow_payments/v1/payments/00000000-0000-0000-0000-000000000000',
      payment_link: 'https://sandbox.sequrapi.com/orders/00000000-0000-0000-0000-000000000000/embedded_form?product=tbs'
    }
  }
};
