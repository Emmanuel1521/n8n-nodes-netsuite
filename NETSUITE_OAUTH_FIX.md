# NetSuite OAuth Fix — List Records & SuiteQL 401 Bug

## Problem

**Symptom:** `List Records` and `Run SuiteQL` operations always returned `401 Unauthorized` from NetSuite. `Get Record` worked fine with the same credentials.

**Root Cause:** NetSuite uses OAuth 1.0 Token-Based Authentication (TBA) with HMAC-SHA256 signing. The OAuth signature must include **all URL query parameters**. If a parameter appears in the final URL but was not included when the signature was calculated, NetSuite rejects the request with 401.

In the original code, `limit` and `offset` were baked directly into the path string (e.g. `services/rest/record/v1/customer?limit=100&offset=0`). The `NetSuiteClient.getSignature()` method only signs parameters passed via the `query` argument — anything embedded in the path string was never signed, causing the mismatch.

`Get Record` worked because it has no query parameters, so there was nothing to sign and nothing to mismatch.

---

## Files Changed

**Only one file was modified:**
- `src/nodes/NetSuite/NetSuite.node.ts`

No changes were needed to:
- `src/NetSuiteClient.ts` — `getSignature()` already handles the `query` field correctly
- `src/nodes/NetSuite/NetSuite.node.types.ts` — `INetSuiteRequestOptions.query` field already existed
- `src/credentials/NetSuite.credentials.ts` — credential fields unchanged

---

## Fix 1 — `listRecords` (lines 143–159)

### Before (broken)
```ts
let prefix = query ? `?${query}` : '';
if (returnAll !== true) {
    prefix = query ? `${prefix}&` : '?';
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    prefix += params.toString();
}
const requestData: INetSuiteRequestOptions = {
    method,
    requestType,
    path: `services/rest/record/${apiVersion}/${recordType}${prefix}`,
};
```

`limit` and `offset` were embedded in the path string, so they were never included in the OAuth signature.

### After (fixed)
```ts
const returnData: INodeExecutionData[] = [];
const queryParams: Record<string, string> = {};
if (query) {
    new URLSearchParams(query).forEach((v, k) => { queryParams[k] = v; });
}
if (returnAll !== true) {
    limit = fns.getNodeParameter('limit', itemIndex) as number || limit;
    offset = fns.getNodeParameter('offset', itemIndex) as number || offset;
    queryParams['limit'] = String(limit);
    queryParams['offset'] = String(offset);
}
const requestData: INetSuiteRequestOptions = {
    method,
    requestType,
    path: `services/rest/record/${apiVersion}/${recordType}`,
    query: queryParams,
};
```

Query params are now in the `query` field, so `NetSuiteClient.getSignature()` includes them in the OAuth signature.

---

## Fix 2 — `runSuiteQL` (lines 201–222)

### Before (broken)
```ts
let prefix = returnAll !== true ? `?limit=${limit}&offset=${offset}` : `?limit=${limit}`;
const requestData: INetSuiteRequestOptions = {
    method,
    requestType,
    path: `services/rest/query/${apiVersion}/suiteql${prefix}`,
    query: query,   // ← SuiteQL SQL was being passed as a URL param, not POST body
    headers: { 'Content-Type': 'application/json', 'Prefer': 'transient' },
};
```

Two bugs here:
1. `limit`/`offset` baked into path — not included in OAuth signature → 401
2. The SuiteQL SQL string was passed as `query` (URL param) instead of the POST body — NetSuite requires the SQL in the request body as `{ "q": "SELECT ..." }`

### After (fixed)
```ts
const returnData: INodeExecutionData[] = [];
const config = { ...credentials, netsuiteQueryLimit: limit };
const urlQueryParams: Record<string, string> = {};
if (returnAll !== true) {
    limit = fns.getNodeParameter('limit', itemIndex) as number || limit;
    offset = fns.getNodeParameter('offset', itemIndex) as number || offset;
    urlQueryParams['offset'] = String(offset);
}
urlQueryParams['limit'] = String(limit);
config.netsuiteQueryLimit = limit;
const requestData: INetSuiteRequestOptions = {
    method,
    requestType,
    body: { q: query },          // ← SQL goes in POST body
    query: urlQueryParams,       // ← limit/offset go in query field (signed by OAuth)
    path: `services/rest/query/${apiVersion}/suiteql`,
    headers: {
        'Content-Type': 'application/json',
        'Prefer': 'transient',
    },
};
```

---

## How OAuth Signing Works (Why This Matters)

`NetSuiteClient.getSignature()` builds the OAuth base string as:
```
HTTP_METHOD & url_encoded(base_url) & url_encoded(sorted_all_params)
```

"All params" means: OAuth header params + URL query params passed via the `query` argument. Params embedded in the path string are part of the URL but are **never seen** by the signature builder. NetSuite recomputes the signature on its end using the actual URL it received (including those params), so the signatures never match → 401.

---

## NetSuite Credential Configuration

| Field | Value |
|---|---|
| Hostname | `XXXXXXX-sb1.suitetalk.api.netsuite.com` (no `https://`, lowercase `-sb1`) |
| Account ID | `XXXXXXX-SB1` (uppercase `-SB1`) |
| Consumer Key | From NetSuite → Setup → Integration → your integration record |
| Consumer Secret | Same integration record |
| Token Key | From NetSuite → Setup → Users/Roles → Access Tokens |
| Token Secret | Same access token record |

> **Note:** Token Key = Token ID in NetSuite's UI. They are the same value.

---

## Deployment Steps

The fix has been applied to `src/nodes/NetSuite/NetSuite.node.ts` on the local machine (`C:\Users\egullipalli\n8n`). It has **not yet been built or deployed** to the production VM.

### To Deploy

1. **Build** (on a machine with Node.js ≥22 installed):
   ```bash
   cd C:\Users\egullipalli\n8n
   npm install
   npm run build
   ```

2. **Copy `dist/` to the VM:**
   ```bash
   scp -r -i C:\Users\egullipalli\.ssh\tci-n8n dist/ emmanuel@<vm-ip>:/tmp/netsuite-dist/
   ```

3. **On the VM (as `emmanuel`):**
   ```bash
   # Backup existing dist
   cp -r /home/node/.n8n/nodes/node_modules/@emmanuel1521/n8n-nodes-netsuite/dist \
         /home/node/.n8n/nodes/node_modules/@emmanuel1521/n8n-nodes-netsuite/dist.bak

   # Deploy new dist
   cp -r /tmp/netsuite-dist/dist \
         /home/node/.n8n/nodes/node_modules/@emmanuel1521/n8n-nodes-netsuite/

   # Restart n8n
   docker restart n8n_n8n_1
   ```

4. **Test** in n8n: run the List Records operation against Customer — should return results without 401.

---

## Current Project State (as of 2026-06-25)

### n8n Infrastructure
| Item | Detail |
|---|---|
| Platform | Azure VM — tci-n8n-vm (tci-n8n-rg) |
| OS | Ubuntu 22.04 LTS |
| n8n URL | https://n8n.tciholdings.us |
| n8n Version | 2.20.9 (Business license) |
| Container | `n8n_n8n_1` (docker run, not compose) |
| Database | SQLite at `/opt/n8n-data/database.sqlite` |
| SSH Key | `C:\Users\egullipalli\.ssh\tci-n8n` |
| IP Restriction | Port 22 and 5678 restricted to `72.215.147.61` |

### Custom Node
| Item | Detail |
|---|---|
| Package | `@emmanuel1521/n8n-nodes-netsuite` v0.7.27 |
| Source | https://github.com/Emmanuel1521/n8n-nodes-netsuite (private) |
| Installed at | `/home/node/.n8n/nodes/node_modules/@emmanuel1521/n8n-nodes-netsuite` |
| Registered | Manually in SQLite (`installed_packages`, `installed_nodes` tables) |
| Get Record | ✅ Working (Customer ID 4027 confirmed) |
| List Records | ❌ 401 — fix applied locally, **not yet deployed** |
| SuiteQL | ❌ 401 — fix applied locally, **not yet deployed** |

### PostgreSQL Migration (Paused)
| Step | Status |
|---|---|
| PostgreSQL 14 installed on VM | ✅ Done |
| pgloader installed | ✅ Done |
| n8n database and user created | ✅ Done |
| SQLite backup taken | ✅ `/opt/n8n-backups/database-pre-postgres-20260624.sqlite` |
| Run pgloader (SQLite → PostgreSQL) | ⏸ Pending |
| Recreate container with `DB_TYPE=postgresdb` env vars | ⏸ Pending |
| Verify n8n connects to PostgreSQL | ⏸ Pending |

PostgreSQL credentials: user `n8n`, password `N8nTCI@2026!`, database `n8n`.
