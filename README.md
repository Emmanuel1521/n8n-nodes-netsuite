# n8n NetSuite Node

[![npm](https://img.shields.io/npm/v/@emmanuel1521/n8n-nodes-netsuite)](https://www.npmjs.com/package/@emmanuel1521/n8n-nodes-netsuite)
[![CI](https://github.com/Emmanuel1521/n8n-nodes-netsuite/actions/workflows/ci.yml/badge.svg)](https://github.com/Emmanuel1521/n8n-nodes-netsuite/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An [n8n](https://n8n.io/) community node for the [NetSuite REST API](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_1540391670.html) (SuiteTalk REST Web Services).

**Zero runtime dependencies** — the OAuth 1.0a client is implemented inline, so this package is immune to upstream package takedowns and has a minimal supply-chain surface.

---

## Installation

### Option 1 — n8n Community Nodes UI (recommended)
1. In your n8n instance, go to **Settings → Community Nodes**.
2. Click **Install** and enter: `@emmanuel1521/n8n-nodes-netsuite`
3. Restart n8n if prompted.

### Option 2 — npm (self-hosted)
```bash
npm install @emmanuel1521/n8n-nodes-netsuite
```
Then restart your n8n instance.

### Option 3 — from source
```bash
git clone https://github.com/Emmanuel1521/n8n-nodes-netsuite.git
cd n8n-nodes-netsuite
npm ci && npm run build
npm install /path/to/this/repo   # inside your n8n project
```

---

## Credentials setup

This node uses **NetSuite Token-Based Authentication (TBA)** with OAuth 1.0a HMAC-SHA256. You need six values from NetSuite.

### One-time NetSuite setup
1. **Enable SuiteTalk REST**: *Setup → Company → Enable Features → SuiteCloud* — check **REST WEB SERVICES** and **TOKEN-BASED AUTHENTICATION**.
2. **Create an Integration record**: *Setup → Integration → Manage Integrations → New*. Check **Token-Based Authentication**. Save and copy the **Consumer Key** and **Consumer Secret** shown once.
3. **Create a Role** with at least **REST Web Services** and **User Access Tokens** permissions, plus permissions for any record types you want to access.
4. **Assign the Role** to a user.
5. **Create an Access Token**: *Setup → Users/Roles → Access Tokens → New*. Pick the Integration, User, and Role. Copy the **Token ID** and **Token Secret** shown once.

> NetSuite shows secrets only **once** at creation time. Store them immediately.

### Values to enter in n8n

| # | Field | Where to find it |
|---|---|---|
| 1 | **Hostname** | `<accountId>.suitetalk.api.netsuite.com` (sandboxes use `<accountId>-sb1`). Find your account ID at *Setup → Company → Company Information*. |
| 2 | **Account ID** | Same screen as above. Sandbox accounts include the `_SB1` suffix. |
| 3 | **Consumer Key** | From the Integration record (step 2 above). |
| 4 | **Consumer Secret** | From the Integration record (step 2 above). |
| 5 | **Token Key** | From the Access Token (step 5 above). |
| 6 | **Token Secret** | From the Access Token (step 5 above). |

Full NetSuite TBA reference: [Token-Based Authentication (TBA) docs](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_4247337262.html).

---

## Supported operations

| Operation | Use case |
|---|---|
| `getRecord` | Fetch a single record by ID |
| `listRecords` | Paginated list with optional filters |
| `insertRecord` | Create a new record |
| `updateRecord` | Patch an existing record |
| `removeRecord` | Delete a record by ID |
| `runSuiteQL` | Execute a SuiteQL SELECT query |
| `rawRequest` | Arbitrary REST call against any NetSuite endpoint (escape hatch) |

### Supported record types
40+ record types are available out of the box, including Customer, Sales Order, Invoice, Purchase Order, Vendor, Vendor Bill, Item Fulfillment, Journal Entry, Inventory Item, Subscription, Employee, Contact, Task, and Custom Records. See [`NetSuite.node.options.ts`](src/nodes/NetSuite/NetSuite.node.options.ts) for the complete list, or use `rawRequest` for any record type not in the dropdown.

### Request types
`record` · `suiteql` · `workbook` · `dataset`

---

## Example: SuiteQL query

In a SuiteQL node, the `query` field accepts standard SuiteQL syntax:

```sql
SELECT id, companyname, email
FROM customer
WHERE isinactive = 'F'
  AND datecreated >= TO_DATE('2024-01-01', 'YYYY-MM-DD')
ORDER BY datecreated DESC
```

Results come back as `INodeExecutionData[]`, one item per row.

---

## Options

- **Concurrency** — how many parallel NetSuite requests to issue when processing multiple input items. Default `1`. Increase cautiously; NetSuite enforces per-account governance limits.
- **Return Full Response** — return the full HTTP response (headers + status + body) instead of just the body. Useful for debugging.

---

## Compatibility

- **n8n**: tested against `v1.x`
- **Node.js**: `≥22` (required by n8n's peer-dependency chain)
- **NetSuite REST API**: validated against `2024.x`
- **Auth**: OAuth 1.0a TBA only (OAuth 2.0 is not yet supported)

---

## Development

```bash
npm ci           # install dependencies
npm run build    # compile TypeScript
npm run dev      # rebuild on change
npm run lint     # eslint
```

### Local testing in n8n
After `npm run build`, either copy `dist/` into your n8n custom-nodes directory, or run `npm link` in this repo and `npm link @emmanuel1521/n8n-nodes-netsuite` inside your n8n install. Restart n8n.

---

## Support

> ⚠️ This is a community-maintained package. It is **not officially supported** by NetSuite, Oracle, or n8n GmbH. Validate against a NetSuite sandbox before using in production workflows.

For bug reports and feature requests: [open an issue](https://github.com/Emmanuel1521/n8n-nodes-netsuite/issues).

## Security

Please **do not** report security vulnerabilities through public GitHub issues.

Use GitHub's [private vulnerability reporting](https://github.com/Emmanuel1521/n8n-nodes-netsuite/security/advisories/new) instead — it keeps the report confidential until a fix is published.

## Credits

Originally inspired by [drudge/n8n-nodes-netsuite](https://github.com/drudge/n8n-nodes-netsuite). This package inlines the REST client implementation to eliminate external runtime dependencies and supply-chain exposure.

## License

[MIT](LICENSE)
