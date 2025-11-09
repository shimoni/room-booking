#!/bin/bash
# Run auth E2E tests with proper configuration

cd "$(dirname "$0")"
pnpm test auth-simple.controller.e2e-spec.ts --testTimeout=10000 --forceExit --detectOpenHandles
