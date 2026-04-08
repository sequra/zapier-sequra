# seQura (Zapier Integration)

Zapier integration that lets merchants create seQura payments and send checkout forms to shoppers directly from Zapier workflows.

## Install

```bash
npm install
npm install -g zapier-platform-cli
zapier-platform login
zapier-platform register "sequra"
zapier-platform push
```

## Authentication

When connecting the app in Zapier, you will be asked for:

| Field | Description |
|-------|-------------|
| Environment | Select one of: Live seQura, Live SVEA, Sandbox seQura, Sandbox SVEA |
| Account Key | Basic Auth username (also used as Merchant ID) |
| Account Secret | Basic Auth password |

Credentials can be found in [your seQura dashboard](https://portal.sequra.com/).

## Actions

### 1. Create Payment

Creates a seQura payment and optionally sends a checkout link to the shopper via SMS or email.

**Inputs:**

| Field | Required | Notes |
|-------|----------|-------|
| Channel | Yes | `SMS`, `Email`, or `None` (creates payment without sending) |
| Reference | No | Unique payment reference |
| Shopper Email | Yes | |
| Shopper Phone | If SMS | Required when channel is `sms` |
| Shopper Given Names | No | |
| Shopper Surnames | No | |
| Total Amount (cents) | Yes | Integer, e.g. 12345 = 123.45 EUR |
| Currency | No | Defaults to `EUR` |
| Payment Method / Product | No | Dynamically fetched from your account. Defaults to `tbs` |
| Item Names | No | List field — add one entry per line item. Use the + button to add more |
| Item Quantities | No | Quantity for each item (same order as names). Defaults to 1 |
| Item Unit Prices (cents) | No | Unit price in cents for each item (same order as names) |
| Notification URL | No | Webhook URL for IPN callbacks |
| Test Mode | No | Defaults to `false` |

**Outputs:**

| Field | Description |
|-------|-------------|
| uuid | Unique identifier for the payment |
| payment_url | Full URL of the created payment |
| payment_link | Embedded form URL (`{base_url}/orders/{uuid}/embedded_form?product=tbs`) |

## Example Zap designs

**A) Send checkout form to shopper**
1. Trigger: CRM deal closed (HubSpot, etc.)
2. Create Payment (with notification URL pointing to a Zapier Catch Hook)
3. Log payment link and UUID back to CRM

**B) Handle payment confirmation (IPN)**
1. Trigger: Webhooks by Zapier (Catch Hook) - receives IPN callback
2. Filter/Paths based on payment status
3. Update CRM record to "Paid"
