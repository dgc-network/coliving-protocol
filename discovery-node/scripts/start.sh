#!/bin/bash
set -e

# enable rsyslog if not explicitly disabled by coliving-docker-compose
: "${coliving_enable_rsyslog:=true}"

# $coliving_enable_rsyslog should be true
if $coliving_enable_rsyslog; then
    mkdir -p /var/log
    mkdir -p /var/spool/rsyslog
    mkdir -p /etc/rsyslog.d

    # $logglyDisable should be empty/null
    # $logglyToken should be a nonzero length string
    if [[ -z "$coliving_loggly_disable" && -n "$coliving_loggly_token" ]]; then
        # use regex to extract domain in url (source: https://stackoverflow.com/a/2506635/8674706)
        coliving_discprov_hostname=$(echo $coliving_discprov_url | sed -e 's/[^/]*\/\/\([^@]*@\)\?\([^:/]*\).*/\2/')

        # add hostname to loggly tags
        if [[ "$coliving_discprov_hostname" != "" ]]; then
            if [[ "$coliving_loggly_tags" != "" ]]; then
                coliving_loggly_tags="$coliving_loggly_tags,$coliving_discprov_hostname"
            else
                coliving_loggly_tags="$coliving_discprov_hostname"
            fi
        fi

        if [[ "$coliving_loggly_tags" != "" ]]; then
            coliving_loggly_tags="tag=\\\"${coliving_loggly_tags//,/\\\" tag=\\\"}\\\""
            # ${coliving_loggly_tags//,/\\\" tag=\\\"} replaces , with \" tag=\"
            # then we add tag=\" to the start and \" to the end
        fi

        cat >/etc/rsyslog.d/10-loggly.conf <<EOF
\$WorkDirectory /var/spool/rsyslog  # where to place spool files
\$ActionQueueFileName loggly        # unique name prefix for spool files
\$ActionQueueMaxDiskSpace 1g        # 1gb space limit (use as much as possible)
\$ActionQueueSaveOnShutdown on      # save messages to disk on shutdown
\$ActionQueueType LinkedList        # run asynchronously
\$ActionResumeRetryCount -1         # infinite retries if host is down

template(name="LogglyFormat" type="string"
string="<%pri%>%protocol-version% %timestamp:::date-rfc3339% %HOSTNAME% %app-name% %procid% %msgid% [$coliving_loggly_token@41058 $coliving_loggly_tags] %msg%\n")

# Send messages to Loggly over TCP using the template.
action(type="omfwd" protocol="tcp" target="logs-01.loggly.com" port="514" template="LogglyFormat")
EOF
    fi

    cat >/etc/rsyslog.d/20-file.conf <<EOF
\$WorkDirectory /var/spool/rsyslog  # where to place spool files
\$ActionQueueFileName file          # unique name prefix for spool files
\$ActionQueueMaxDiskSpace 1g        # 1gb space limit (use as much as possible)
\$ActionQueueSaveOnShutdown on      # save messages to disk on shutdown
\$ActionQueueType LinkedList        # run asynchronously
\$ActionResumeRetryCount -1         # infinite retries if host is down

\$outchannel server_log,/var/log/discprov-server.log, 52428800,/coliving-discovery-node/scripts/rotate-log.sh
\$outchannel worker_log,/var/log/discprov-worker.log, 52428800,/coliving-discovery-node/scripts/rotate-log.sh
\$outchannel beat_log,/var/log/discprov-beat.log, 52428800,/coliving-discovery-node/scripts/rotate-log.sh

if \$programname == 'server' then :omfile:\$server_log
if \$programname == 'worker' then :omfile:\$worker_log
if \$programname == 'beat' then   :omfile:\$beat_log
EOF

    rsyslogd
fi

if [ -z "$coliving_redis_url" ]; then
    redis-server --daemonize yes
    export coliving_redis_url="redis://localhost:6379/00"
    export WAIT_HOSTS="localhost:6379"
    /wait
fi

if [ -z "$coliving_db_url" ]; then
    if [ -z "$(ls -A /db)" ]; then
        chown -R postgres:postgres /db
        chmod 700 /db
        sudo -u postgres pg_ctl init -D /db
        echo "host all all 0.0.0.0/0 md5" >>/db/pg_hba.conf
        echo "listen_addresses = '*'" >>/db/postgresql.conf
        sudo -u postgres pg_ctl start -D /db -o "-c shared_preload_libraries=pg_stat_statements"
        sudo -u postgres createdb coliving_discovery
    else
        sudo -u postgres pg_ctl start -D /db -o "-c shared_preload_libraries=pg_stat_statements"
    fi

    sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${postgres_password:-postgres}';"

    export coliving_db_url="postgresql+psycopg2://postgres:${postgres_password:-postgres}@localhost:5432/coliving_discovery"
    export coliving_db_url_read_replica="postgresql+psycopg2://postgres:${postgres_password:-postgres}@localhost:5432/coliving_discovery"
    export WAIT_HOSTS="localhost:5432"
    /wait
fi

export PYTHONUNBUFFERED=1

coliving_discprov_loglevel=${coliving_discprov_loglevel:-info}

# used to remove data that may have been persisted via a k8s emptyDir
export coliving_prometheus_container=server

# run alembic migrations
if [ "$coliving_db_run_migrations" != false ]; then
    echo "Running alembic migrations"
    export PYTHONPATH='.'
    alembic upgrade head
    echo "Finished running migrations"
fi

# start es-indexer
if [[ "$coliving_elasticsearch_url" ]] && [[ "$coliving_elasticsearch_run_indexer" ]]; then
    # npm run catchup creates triggers + populate indexes - this blocks server / celery start
    # npm start gets backgrounded and goes into listen mode
    (
        cd es-indexer && npm run catchup && npm start &
    )
fi

# start api server + celery workers
if [[ "$coliving_discprov_dev_mode" == "true" ]]; then
    coliving_service=server ./scripts/dev-server.sh 2>&1 | tee >(logger -t server) &
    if [[ "$coliving_no_workers" != "true" ]] && [[ "$coliving_no_workers" != "1" ]]; then
        coliving_service=beat celery -A src.worker.celery beat --loglevel $coliving_discprov_loglevel --schedule=/var/celerybeat-schedule --pidfile=/var/celerybeat.pid 2>&1 | tee >(logger -t beat) &
        coliving_service=worker watchmedo auto-restart --directory ./ --pattern=*.py --recursive -- celery -A src.worker.celery worker --loglevel $coliving_discprov_loglevel 2>&1 | tee >(logger -t worker) &
    fi
else
    coliving_service=server ./scripts/prod-server.sh 2>&1 | tee >(logger -t server) &
    if [[ "$coliving_no_workers" != "true" ]] && [[ "$coliving_no_workers" != "1" ]]; then
        coliving_service=beat celery -A src.worker.celery beat --loglevel $coliving_discprov_loglevel --schedule=/var/celerybeat-schedule --pidfile=/var/celerybeat.pid 2>&1 | tee >(logger -t beat) &
        coliving_service=worker celery -A src.worker.celery worker --loglevel $coliving_discprov_loglevel 2>&1 | tee >(logger -t worker) &
    fi
fi

wait
