---
sidebar_label: Setup Instructions
sidebar_position: 3
---

# Setup Instructions

This guide describes how to run Coliving services on a single node Kubernetes cluster. Notes about multi node clusters are given as relevant.

Join the node operator discord channel on the [Coliving discord server](https://discord.com/invite/)

## 0. Clone the -k8s-manifests repository
[**https://github.com/dgc.network/-k8s-manifests**](https://github.com/dgc.network/-k8s-manifests)\*\*\*\*

```text
git clone git@github.com:dgc.network/-k8s-manifests.git
```

## 1. Cluster Setup

Initialize a machine running Ubuntu 16.04 LTS or higher, with at least 8 vCPUs and 16 GB of RAM.

A convenience script is also included to do a "one click" kubeadm node setup. You can run

```text
yes | sh setup.sh
```

However, if the node setup is not successful and kubectl is not available, it's advised to follow the installation steps by hand [here](https://github.com/dgc.network/-k8s-manifests/blob/master/cluster-setup.md).

## 2. Coliving CLI Setup

You can skip this section if installing for the first time.

You can install `-cli` with

```text
sh install_coliving_cli.sh
```

You can then view all commands available via `-cli` by simply running:

```text
-cli -h
```

## 3. Storage

Provision a shared host directory for persistent storage,

```text
mkdir -p /var/k8s
```

If sudo was required, change ownership with,

```text
sudo chown <user>:<group> /var/k8s
```

typically this will be,

```text
sudo chown -R ubuntu:ubuntu /var/k8s
```

**Note:** Storage will persist on the host even after deleting `pv, pvc` objects.

To nuke all data and start clean,

```text
rm -rf /var/k8s/*
```

## 4. Service Setup

See below for a guide to deploying [Creator Node](https://github.com/dgc.network/-k8s-manifests#content-node-1) and [Discovery Node](https://github.com/dgc.network/-k8s-manifests#discovery-node-1) via `-cli`. After you finish setting up the service, please continue with the Logger section.

**Note:** "Creator Node" and "Discovery Node" have recently been renamed to "Content Node" and "Discovery Node" respectively. However for consistency within the code and this README, we will continue to use the terms "Creator Node" and "Discovery Node".

### Creator Node

An Coliving Creator Node maintains the availability of creators' content on IPFS.

The information stored includes Coliving user metadata, images, and live content. The content is backed by a local directory.

**Note:** In the future, the service will be extended to handle proxy re-encryption requests from end-user clients and support other storage backends.

#### Run

Use `-cli` to update required variables. The full list of variables and explanations can be found on the wiki [here](https://github.com/dgc.network/-protocol/wiki/Content-Node:-Configuration-Details#required-environment-variables).

Some variables must be set, you can do this with the following commands:

```text
-cli set-config content-node backend
key   : spOwnerWallet
value : <address of wallet that contains  tokens>

-cli set-config content-node backend
key   : delegateOwnerWallet
value : <address of wallet that contains no tokens but that is registered on chain>

-cli set-config content-node backend
key   : delegatePrivateKey
value : <private key>

-cli set-config content-node backend
key   : contentNodeEndpoint
value : <your service url>
```

**Note:** if you haven't registered the service yet, please enter the url you plan to register for `contentNodeEndpoint`.

Then run the launch command via `-cli`

```text
-cli launch content-node --configure-ipfs
```

Verify that the service is healthy by running,

```text
-cli health-check content-node
```

#### Upgrade

If you do not have `-cli`, instructions on how to install are available in [the section above](https://github.com/dgc.network/-k8s-manifests#2--cli-setup).

To upgrade your service using `-cli`, you will need to pull the latest manifest code. You can do this with `-cli`

```text
-cli upgrade
```

Verify that the service is healthy by running,

```text
-cli health-check content-node
```

**Old Upgrade flow with kubectl:** To upgrade your service using `kubectl`, you will need to pull the latest `k8s-manifests` code. To do this, run the following,

```text
git stash
git pull
git stash apply
```

Ensure that your configs are present in `/content-node/content-node-cm.yaml`, then do the following,

```text
k apply -f /content-node/content-node-cm.yaml
k apply -f /content-node/content-node-deploy-ipfs.yaml
k apply -f /content-node/content-node-deploy-backend.yaml
```

You can verify your upgrade with the `\health_check` endpoint.

### Discovery Node

An Coliving Discovery Node indexes the contents of the Coliving contracts on the Ethereum blockchain for clients to query.

The indexed content includes user, track, and album/playlist information along with social features. The data is stored for quick access, updated on a regular interval, and made available for clients via a RESTful API.

#### Run

Some variables must be set, you can do this with the following commands:

```text
-cli set-config discovery-node backend
key   : coliving_delegate_owner_wallet
value : <delegate_owner_wallet>

-cli set-config discovery-node backend
key   : coliving_delegate_private_key
value : <delegate_private_key>
```

If you are using an external managed Postgres database \(version 11.1+\), replace the db url with,

```text
coliving-cli set-config discovery-node backend
key   : coliving_db_url
value : <coliving_db_url>

coliving-cli set-config discovery-node backend
key   : coliving_db_url_read_replica
value : <coliving_db_url_read_replica>
```

**Note:** If there's no read replica, enter the primary db url for both env vars.

The below is only if using a managed posgres database:

You will have to replace the db seed job in `coliving/discovery-node/discovery-node-db-seed-job.yaml` as well. Examples are provided. In the managed postgres database and set the `temp_file_limit` flag to `2147483647` and run the following SQL command on the destination db.

```text
CREATE EXTENSION pg_trgm;
```

Make sure that your service exposes all the required environment variables. See wiki [here](https://github.com/dgc.network/coliving-protocol/wiki/Discovery-Node:-Configuration-Details#required-environment-variables) for full list of env vars and descriptions.

#### Launch

```text
coliving-cli launch discovery-node --seed-job --configure-ipfs
```

Verify that the service is healthy by running,

```text
coliving-cli health-check discovery-node
```

#### Upgrade

If you do not have `coliving-cli`, instructions on how to install are available in [the section above](https://github.com/dgc.network/coliving-k8s-manifests#2-coliving-cli-setup).

To upgrade your service using `coliving-cli`, you will need to pull the latest manifest code. You can do this with `coliving-cli`

```text
coliving-cli upgrade
```

Verify that the service is healthy by running,

```text
coliving-cli health-check discovery-node
```

**Old Upgrade flow with kubectl:** To upgrade your service using kubectl, you will need to pull the latest `k8s-manifests` code. To do this, run the following,

```text
git stash
git pull
git stash apply
```

Ensure that your configs are present in `coliving/discovery-node/discovery-node-cm.yaml`, then do the following,

```text
k apply -f coliving/discovery-node/discovery-node-cm.yaml
k apply -f coliving/discovery-node/discovery-node-deploy.yaml
```

You can verify your upgrade with the `\health_check` endpoint.

#### Next

Once you've finished setting up the Discovery Node, continue to the [Logger](https://github.com/dgc.network/coliving-k8s-manifests#logger) section.


## 5. Logger

In order to assist with any debugging. We provide a logging service that you may publish to.

**Run**

First, obtain the service provider secrets from your contact at Coliving. This contains the required token\(s\) for logging to function. And apply the secret with

```text
kubectl apply -f <secret_from_coliving>.yaml
```

Next, update the logger tags in the fluentd daemonset with your name, so we can identify you and your service uniquely here: [https://github.com/dgc.network/coliving-k8s-manifests/blob/master/coliving/logger/logger.yaml\#L207](https://github.com/dgc.network/coliving-k8s-manifests/blob/master/coliving/logger/logger.yaml#L207). This allows our logging service to filter logs by service provider and by service provider and service. `SP_NAME` refers to your organization's name and `SP_NAME_TYPE_ID` refers to your organization's name plus the type of service you're running, plus an id to distinguish multiple services of the same type.

For example, if your name is `Awesome Operator` and you're running a content node, set the tags as:

```text
...
env:
- name: LOGGLY_TAGS
  value: external,Awesome-Operator,Awesome-Operator-Content-1
```

The number at the end of the last tag \(`Awesome-Operator-Content-1`\) is used if you have more than one content node or discovery node, so you can identify each service uniquely. For example, if you run two content nodes, on your second content node, you can set the tags as:

```text
...
env:
- name: LOGGLY_TAGS
  value: external,Awesome-Operator,Awesome-Operator-Content-2
```

Once you've updated the tags, apply the fluentd logger stack with the command:

```text
kubectl apply -f coliving/logger/logger.yaml
```

**Upgrade**

There are two commands to upgrade the logging stack.

```text
kubectl apply -f coliving/logger/logger.yaml

kubectl -n kube-system delete pod $(kubectl -n kube-system get pods | grep "fluentd" | awk '{print $1}')
```


## 6. Security & Infrastructure configuration

1.\) In order for clients to talk to your service, you'll need to expose two ports: the web server port and the IPFS swarm port. In order to find these ports, run `kubectl get svc`. The web server port is mapped to 4000 for creator node and 5000 for discovery node. The IPFS swarm port is mapped to 4001

```text
kubectl get svc

NAME                             TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                                        AGE
discovery-node-backend-svc   NodePort    10.98.78.108    <none>        5000:31744/TCP                                 18h
discovery-node-cache-svc     ClusterIP   10.101.94.71    <none>        6379/TCP                                       18h
discovery-node-db-svc        ClusterIP   10.110.50.147   <none>        5432/TCP                                       18h
discovery-node-ipfs-svc      NodePort    10.106.89.157   <none>        4001:30480/TCP,5001:30499/TCP,8080:30508/TCP   18h
kubernetes                       ClusterIP   10.96.0.1       <none>        443/TCP                                        7d5h

In this case, the web server port is 31744 and the IPFS port is 30480.
```

2.\) Once you expose these ports, you should be able to publicly hit the health check via the public IP of your instance or load balancer. The next step is to register a DNS record. It's recommended that you map the web server port the DNS and have a domain or subdomain for each service you're running. Also make sure traffic is not allowed without HTTPS. All non HTTPS traffic should redirect to the HTTPS port.

3.\) Now we will configure IPFS.

IPFS has some trouble identifying the public host and port inside kubernetes, this can be fixed with `coliving-cli`

```text
coliving-cli configure-ipfs <hostname>
```

Example: `coliving-cli configure-ipfs 108.174.10.10`

4.\) Set load balancer timeouts. Minimum timeouts are 1 hour \(3600 seconds\) for Creator Node requests and 1 minutes \(60 seconds\) for Discovery Node requests. Track uploads especially for larger files can take several minutes to complete.

5.\) In addition to configuring your security groups to restrict access to just the web server and IPFS swarm port \(4001\), it's recommended that your server or load balancer is protected from DoS attacks. Services like Cloudfront and Cloudflare offer free or low cost services to do this. It would also be possible to use iptables to configure protection as laid out here [https://javapipe.com/blog/iptables-ddos-protection/](https://javapipe.com/blog/iptables-ddos-protection/). Please make sure proxies don't override the timeouts from Step 4.

## 7. Pre-registration checks

Before registering a service to the dashboard we need to make sure the service is properly configured. Follow the checks below for the type of service you're configuring. Failure to verify that all of these work properly could cause user actions to fail and may lead to slashing actions.

The `sp-actions/` folder contains scripts that test the health of services. Run the corresponding checks for your service type below to verify your service is correctly sete up. Be sure to run `npm install` in `sp-actions/` to install all depdencies.

For more information about `sp-actions/` see the README in the [sp-actions/ folder](https://github.com/dgc.network/coliving-k8s-manifests/tree/master/sp-utilities)

**Creator Node**

```text
➜ pwd
/Coliving/coliving-k8s-manifests/sp-utilities/content-node

# entering contentNodeEndpoint and delegatePrivateKey sends those values as env vars to the script without having to export to your terminal
➜ contentNodeEndpoint=https://creatornode.domain.co delegatePrivateKey=5e468bc1b395e2eb8f3c90ef897406087b0599d139f6ca0060ba85dcc0dce8dc node healthChecks.js
Starting tests now. This may take a few minutes.
✓ Health check passed
✓ DB health check passed
✓ Heartbeat duration health check passed
! Non-heartbeat duration health check timed out at 180 seconds with error message: "Request failed with status code 504". This is not an issue.
All checks passed!
```

If you see the message "Error running script" this script did not finish successfully. If you see "All checks passed!" this script finished successfully.

**Discovery Node**

```text
➜ discoveryNodeEndpoint=https://discoveryprovider.domain.co node healthChecks.js
✓ Health check passed
All checks passed!
```

If you see the message "Error running script" this script did not finish successfully. If you see "All checks passed!" this script finished successfully.

## 8. Register the service on the dashboard

Since you've completed all the steps thus far, you're about ready to register!

You can register via the dashboard on [https://dashboard.coliving.org](https://dashboard.coliving.org/)

## 9. Script to Initiate Rounds and Process Claims \(Optional\)

If you would like to automatically run claim operations whenever a new round is initiated, a script is included for your convenience in the sp-utilities/claim folder. Further instructions are provided in the sp-utilities README.
