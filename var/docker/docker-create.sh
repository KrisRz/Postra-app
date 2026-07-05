#!/usr/bin/env bash

docker kill postra || true 
docker rm postra || true 
docker create --name postra -p 3000:3000 -p 4200:4200 localhost/postra
