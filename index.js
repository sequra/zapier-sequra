// index.js
const { version } = require('./package.json');
const authentication = require('./authentication');

const createPayment = require('./creates/create_payment');

// Middleware: adds Authorization and merchant header on every request
const addAuthHeaders = (request, z, bundle) => {
  const userpass = `${bundle.authData.account_key}:${bundle.authData.account_secret}`;
  const basic = Buffer.from(userpass).toString('base64');
  request.headers = request.headers || {};
  request.headers['Authorization'] = `Basic ${basic}`;
  request.headers['Sequra-Merchant-Id'] = bundle.authData.account_key;
  request.headers['Accept'] = request.headers['Accept'] || 'application/json';
  return request;
};

const App = {
  version,
  platformVersion: require('zapier-platform-core').version,
  authentication,
  beforeRequest: [addAuthHeaders],
  afterResponse: [],
  resources: {},
  triggers: {},
  searches: {},
  creates: {
    [createPayment.key]: createPayment
  }
};

module.exports = App;
