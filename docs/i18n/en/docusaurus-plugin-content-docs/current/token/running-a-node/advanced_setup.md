---
sidebar_label: Advanced Setup
sidebar_position: 4
---

# Advanced Setup

## Launching a new node from scratch

### Setting environment variables

```sh
# to set individual environment variables
# valid service-names are "content-node" or "discovery-node"
-cli set-config content-node
-cli set-config discovery-node

# to set all the required environment variables for a service, use the --required flag
-cli set-config --required content-node
-cli set-config --required discovery-node
```

#### Creator Node
There are four required creator node environment variables, available in the creator node section [here](setup.md#content-node).

The full list of variables and explanations can be found [here](https://github.com/dgc.network/-protocol/blob/master/content-node/src/config.js). Generally node operators will not need to modify any other environment variables.

##### External Creator Node Postgres
If you set an external Postgres url during setup you can skip this section.

If you did not set an external Postgres url during setup and you want to add one now, replace the db url by running:

```sh
-cli set-config content-node
key   : dbUrl
value : <db url>
```

#### Discovery Node
There are two required discovery node environment variables, available in the discovery node section [here](setup.md#discovery-node).

The full list of variables and explanations can be found [here](https://github.com/dgc.network/-protocol/blob/master/discovery-node/default_config.ini). Generally node operators will not need to modify any other environment variables.


##### External Discovery Node Postgres Instance
If you set an external Postgres url during setup you can skip this section.

The below is only if using a externally managed Postgres (version 11.1+) database:

```sh
-cli set-config discovery-node
key   : coliving_db_url
value : <coliving_db_url>

# If there's no read replica, enter the primary db url for both env vars.
-cli set-config discovery-node
key   : coliving_db_url_read_replica
value : <coliving_db_url_read_replica>
```


In the managed postgres database and set the `temp_file_limit` flag to `2147483647` and run the following SQL command on the destination db.
```
CREATE EXTENSION pg_trgm;
```

### Launch
```sh
-cli launch content-node

# or

-cli launch discovery-node (--seed)

# Options:
# --seed
#     Seeds the database from a snapshot. Required for first-time discovery setup.
```

## Migration from Kubernetes

```sh
# Clone and install related dependencies
git clone https://github.com/dgc.network/-docker-compose.git ~/-docker-compose
bash ~/-docker-compose/setup.sh

# Get configs from k8s-manifests and set them again via set-config
cat ~/-k8s-manifests/config.yaml
-cli set-config <service>

# Remember to configure firewalls and load balancers to allow the service port through

# Turn off Postgres on the host. If this command returns an error it's not a problem.
sudo systemctl stop postgresql.service

# Remove kube
-cli auto-upgrade --remove
kubectl delete --all-namespaces --all deployments
kubectl delete --all-namespaces --all pods
sudo kubeadm reset

# Launch the service
-cli launch <service>
```
