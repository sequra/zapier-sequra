// test/create_payment.test.js
const createPayment = require('../creates/create_payment');

const perform = createPayment.operation.perform;

const makeZ = ({ locationHeader } = {}) => ({
  request: jest.fn().mockResolvedValue({
    status: 201,
    headers: new Map(locationHeader !== undefined
      ? [['location', locationHeader]]
      : [])
  }),
  errors: {
    Error: class ZapierError extends Error {
      constructor(msg) { super(msg); this.name = 'ZapierError'; }
    }
  }
});

const makeBundle = (inputData = {}) => ({
  authData: { base_url: 'https://sandbox.sequrapi.com' },
  inputData: {
    channel: 'email',
    reference: 'REF-001',
    email: 'customer@example.com',
    total_amount: 5000,
    ...inputData
  }
});

describe('create_payment', () => {
  test('successful creation returns uuid from Location header', async () => {
    const z = makeZ({ locationHeader: 'https://middleware.example.com/api/workflow_payments/v1/payments/abc-123' });
    const result = await perform(z, makeBundle());

    expect(result.uuid).toBe('abc-123');
    expect(result.payment_url).toBe('https://middleware.example.com/api/workflow_payments/v1/payments/abc-123');
    expect(z.request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST',
      url: 'https://partner-integration-middleware.sequra.com/api/workflow_payments/v1/payments'
    }));
  });

  test('applies default values for currency, product, and test_mode', async () => {
    const z = makeZ({ locationHeader: 'https://middleware.example.com/api/.../payments/uuid-1' });
    await perform(z, makeBundle());

    const body = JSON.parse(z.request.mock.calls[0][0].body);
    expect(body.currency).toBe('EUR');
    expect(body.product).toBe('tbs');
    expect(body.test_mode).toBe(false);
  });

  test('throws when channel is sms and phone is missing', async () => {
    const z = makeZ();
    await expect(perform(z, makeBundle({ channel: 'sms', phone: undefined })))
      .rejects.toThrow('Shopper phone is required when channel is "sms".');
  });

  test('throws when email format is invalid', async () => {
    const z = makeZ();
    await expect(perform(z, makeBundle({ email: 'not-an-email' })))
      .rejects.toThrow('Shopper email is not a valid email address.');
  });

  test('throws when Location header is missing', async () => {
    const z = makeZ({ locationHeader: undefined });
    await expect(perform(z, makeBundle()))
      .rejects.toThrow('Missing Location header in API response.');
  });

  test('optional fields can be omitted without errors', async () => {
    const z = makeZ({ locationHeader: 'https://middleware.example.com/payments/uuid-2' });
    const bundle = makeBundle({ reference: undefined }); // no reference, given_names, surnames, items, notification_url
    const result = await perform(z, bundle);

    expect(result.uuid).toBe('uuid-2');
    const body = JSON.parse(z.request.mock.calls[0][0].body);
    expect(body.reference).toBeUndefined();
    expect(body.given_names).toBeUndefined();
    expect(body.surnames).toBeUndefined();
    expect(body.items).toBeUndefined(); // no item_names provided
    expect(body.notification_url).toBeUndefined();
  });

  test('items are included in cart when provided', async () => {
    const z = makeZ({ locationHeader: 'https://middleware.example.com/payments/uuid-3' });
    await perform(z, makeBundle({
      item_names: ['Widget', 'Gadget'],
      item_quantities: [2, 3],
      item_unit_prices: [1000, 500]
    }));

    const body = JSON.parse(z.request.mock.calls[0][0].body);
    expect(body.items).toEqual([
      { name: 'Widget', quantity: 2, unit_price: 1000 },
      { name: 'Gadget', quantity: 3, unit_price: 500 }
    ]);
  });

  test('phone is passed through when channel is sms', async () => {
    const z = makeZ({ locationHeader: 'https://middleware.example.com/payments/uuid-4' });
    await perform(z, makeBundle({ channel: 'sms', phone: '+34600000000' }));

    const body = JSON.parse(z.request.mock.calls[0][0].body);
    expect(body.phone).toBe('+34600000000');
    expect(body.channel).toBe('sms');
  });
});
