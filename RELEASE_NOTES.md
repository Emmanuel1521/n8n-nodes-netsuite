# Release v0.7.29

Release date: 2026-08-18

Highlights

- Added NetSuite icon so the node displays with its own logo in the n8n editor instead of a generic placeholder.
- Build script copies the SVG into `dist/` at publish time.

# Release v0.7.28

Release date: 2026-06-25

Highlights

- Fixed 401 error on `listRecords` and `runSuiteQL` — `limit` and `offset` were baked into the path string, excluding them from OAuth signing. They now travel in the signed query object.
- Fixed `rawRequest` OAuth signing and body handling.
- Adopted n8n v2 `continueOnFail` pattern.

# Release v0.7.27

Release date: 2026-05-25

Highlights

- Initial community node implementation matching upstream functionality.
- Added `NetSuite` node supporting record operations: get, list, create, update, delete.
- SuiteQL execution and raw request support.
- Added `README.md`, CI workflow, and npm publish workflow.
