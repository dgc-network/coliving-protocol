#!/usr/bin/env bash

if [ -n "${FIX_LINT}" ]; then
  ISORT_FLAG=
  BLACK_FLAG=
else
  ISORT_FLAG='--check-only'
  BLACK_FLAG='--check'
fi

set -ex

cd $PROTOCOL_DIR
flake8 discovery-node/src/
flake8 discovery-node/integration_tests/
isort ${ISORT_FLAG} discovery-node/src/
isort ${ISORT_FLAG} discovery-node/integration_tests/
black ${BLACK_FLAG} discovery-node/src/
black ${BLACK_FLAG} discovery-node/integration_tests/
mypy --ignore-missing-imports --follow-imports=silent --show-column-numbers discovery-node/src/
