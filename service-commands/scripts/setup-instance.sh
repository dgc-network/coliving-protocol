#!/usr/bin/env bash

# Usage: setup-instance.sh [options] <service> <name>
#
# Options:
#   -p <provider>
#   -u <user>
#   -c <coliving-k8s-manifests-config>
#   -r <coliving-protocol-git-ref>
#   -l <coliving-client-git-ref>
#   -f (fast setup with prebaked dev image)

set -e

PROTOCOL_DIR=${PROTOCOL_DIR:-$(dirname $(realpath $0))/../../}

source $PROTOCOL_DIR/service-commands/scripts/utils.sh

# parse arguments
while getopts "p:u:c:r:l:fs:" flag; do
	case "$flag" in
		p) provider=$OPTARG;;
		u) user=$OPTARG;;
		c) coliving_k8_manifests_config=$OPTARG;;
		r) coliving_protocol_git_ref=$OPTARG;;
		l) coliving_client_git_ref=$OPTARG;;
		f) image=${GCP_DEV_IMAGE}; fast=1;;
		s) spot_instance=$OPTARG;;
	esac
done

service=${@:$OPTIND:1}
name=${@:$OPTIND+1:1}

# Set defaults and validate arguments
provider=${provider:-$DEFAULT_PROVIDER}
user=${user:-$DEFAULT_USER}
coliving_protocol_git_ref=${coliving_protocol_git_ref:-$DEFAULT_COLIVING_PROTOCOL_GIT_REF}
coliving_client_git_ref=${coliving_client_git_ref:-$DEFAULT_COLIVING_CLIENT_GIT_REF}
spot_instance=${spot_instance:-false}

if [[ "$provider" != "gcp" ]] && [[ "$provider" != "azure" ]]; then
	echo "Unknown provider:" $provider
	exit 1
fi

if [[ "$service" != "creator-node" ]] && [[ "$service" != "discovery-provider" ]] && [[ "$service" != "remote-dev" ]]; then
	echo "Unknown service:" $service
	exit 1
fi

if [[ -z "$name" ]]; then
	echo "Name of instance was not provided"
	exit 1
fi

# Check dependencies
case "$provider" in
	azure)
		if [[ ! $(type az 2> /dev/null) ]]; then
			echo "az: not found"
			echo "aborting"
			exit 1
		fi
		azure_set_defaults
		;;
	gcp)
		if [[ ! $(type gcloud 2> /dev/null) ]]; then
			echo "gcloud: not found"
			echo "aborting"
			exit 1
		fi
		gcp_set_defaults
		;;
esac

# Create instance if it does not exist
if ! instance_exists $provider $name; then
	echo "Instance does not exist. Creating it"
	if [ "${fast:-0}" -eq "1" ]; then
		echo "Defrosting prebaked image for provisioning... $image"
	fi
	if ! bash $PROTOCOL_DIR/service-commands/scripts/create-instance.sh -p $provider -i "$image" -s "$spot_instance" $name; then
		echo "Creation of new instance did not succeed. Aborting"
		exit 1
	fi
fi

# Setup service
case "$service" in
	creator-node)
		trap 'echo "Failed to setup coliving-k8s-manifests. Aborting" && exit 1' ERR
		bash $PROTOCOL_DIR/service-commands/scripts/setup-k8s-manifests.sh -p $provider -u $user -c "$coliving_k8_manifests_config" $name
		execute_with_ssh $provider $user $name "coliving-cli launch creator-node --configure-ipfs"
		;;
	discovery-provider)
		trap 'echo "Failed to setup coliving-k8s-manifests. Aborting" && exit 1' ERR
		bash $PROTOCOL_DIR/service-commands/scripts/setup-k8s-manifests.sh -p $provider -u $user -c "$coliving_k8_manifests_config" $name
		execute_with_ssh $provider $user $name "coliving-cli launch discovery-provider --seed-job --configure-ipfs"
		;;
	remote-dev)
		wait_for_instance $provider $user $name
		echo "Waiting for instance $name on $provider to be ready for ssh connections... You may see some SSH connection errors during this time but instance should eventually come up."
		if [ "${fast:-0}" -eq "0" ]; then
			execute_with_ssh $provider $user $name \
				"[[ ! -d ~/coliving-protocol ]]" \
				"&& git clone --branch $coliving_protocol_git_ref https://github.com/AudiusProject/coliving-protocol.git" \
				"&& yes | bash coliving-protocol/service-commands/scripts/provision-dev-env.sh $coliving_protocol_git_ref $coliving_client_git_ref"

			wait_for_instance $provider $user $name
			reboot_instance $provider $name
			wait_for_instance $provider $user $name
			# TODO fix install and provisioning for fast
		fi

		IP=$(get_ip_addr $provider $name)
		echo 'Setup /etc/hosts using these commands:'
		echo '    echo "export COLIVING_REMOTE_DEV_HOST='"${IP}"'" >> ~/.zshenv'
		echo '    echo "export COLIVING_REMOTE_DEV_HOST='"${IP}"'" >> ~/.bashrc'
		echo '    sudo node $PROTOCOL_DIR/service-commands/scripts/hosts.js remove'
		echo '    sudo -E COLIVING_REMOTE_DEV_HOST='"${IP}"' node $PROTOCOL_DIR/service-commands/scripts/hosts.js add-remote-host'
		
		echo -e "\nLog into ${IP} using:\n"
		echo -e "    ssh -i ~/.ssh/google_compute_engine ${user}@${IP}\n"
		;;
		
esac
