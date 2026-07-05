#!/bin/bash

set -o xtrace

docker rmi localhost/postra || true
docker build --target dist -t localhost/postra -f Dockerfile.dev .
docker build --target devcontainer -t localhost/postra-devcontainer -f Dockerfile.dev .
