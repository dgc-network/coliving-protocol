# Build Custom Coliving Logspout Sidecar Container

In the event we want to build the Logspout container by hand
(for testing purposes, CircleCI is down, etc) run the following:

```bash
# .env contains: coliving_loggly_token=xxx
. .env

LOGSPOUT_VERSION=$(head -n1 Dockerfile | cut -f 2 -d ':')
[ ${coliving_loggly_token} ] \
    && coliving_loggly_token_64=$(echo ${coliving_loggly_token} | base64) \
    && docker build \
        -t coliving/logspout:${LOGSPOUT_VERSION} \
        --build-arg git_sha=$(git rev-parse HEAD) \
        --build-arg coliving_loggly_token=${coliving_loggly_token_64} \
        . \
    && docker push coliving/logspout:${LOGSPOUT_VERSION}
```
