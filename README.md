# n8n NetSuite Integration (community node)

This repository provides an n8n community node that integrates with the NetSuite REST API.

Features
- Get, list, create, update and delete NetSuite records
- Execute SuiteQL queries
- Raw HTTP requests to NetSuite REST endpoints

Getting started
1. Install into your n8n instance (local or server):

```bash
# inside your n8n project or user nodes folder
npm install /path/to/this/repo
```

2. Add credentials in n8n (NetSuite):
- Hostname
- Account ID
- Consumer Key / Consumer Secret
- Token Key / Token Secret

Development

```bash
# install dependencies
npm ci

# build
npm run build

# watch
npm run dev
```

Testing locally in n8n
- Build the package and copy the `dist/` output into your n8n community nodes directory or install as a local package. Restart n8n.

Contributing
- Open an issue or submit a PR. Include steps to reproduce and any relevant logs.

License

MIT
