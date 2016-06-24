#!/bin/bash

zip -r lambda.zip \
node_modules \
.env \
aws.js \
jwt.js \
lambda.js

exit 0