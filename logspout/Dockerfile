FROM gliderlabs/logspout:v3.2.14

# ignores previously log on startup
# could be lossy if the container restarts
# could send double logs upon container restarts if we remove this
ENV BACKLOG false

ARG git_sha
ENV GIT_SHA=${git_sha}

ARG coliving_loggly_token
ENV coliving_loggly_token ${coliving_loggly_token}

ENTRYPOINT []
COPY start.sh /start.sh
CMD /start.sh
