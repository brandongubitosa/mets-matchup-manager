#!/usr/bin/env node
// The .ts scripts run with Node's built-in TypeScript type stripping (Node 22.18+). Older Node
// versions fail with a confusing syntax error, so check first and explain.
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 18)) {
  console.error(
    `This script needs Node 22.18 or newer (found ${process.versions.node}). ` +
      'Install a newer Node (e.g. `nvm install 22`) and try again.',
  );
  process.exit(1);
}
