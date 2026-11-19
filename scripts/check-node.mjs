#!/usr/bin/env node
// The .ts scripts run with Node's built-in TypeScript type stripping, on by default from 22.18 on
// the 22 line and from 23.6 on the 23 line. Older versions fail with a confusing syntax error, so
// check first and explain.
const [major, minor] = process.versions.node.split('.').map(Number);
const supported = major >= 24 || (major === 23 && minor >= 6) || (major === 22 && minor >= 18);
if (!supported) {
  console.error(
    `This script needs Node 22.18+, 23.6+ or 24+ (found ${process.versions.node}). ` +
      'Install a newer Node (e.g. `nvm install 22`) and try again.',
  );
  process.exit(1);
}
