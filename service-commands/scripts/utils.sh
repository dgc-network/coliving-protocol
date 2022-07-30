#!/usr/bin/env bash

DEFAULT_AUDIUS_CLIENT_GIT_REF=main
DEFAULT_AUDIUS_PROTOCOL_GIT_REF=master
DEFAULT_AZURE_IMAGE="UbuntuLTS"
DEFAULT_AZURE_MACHINE_TYPE="Standard_F8s_v2"
DEFAULT_DISK_SIZE="256"
DEFAULT_GCP_COMPUTE_REGION='us-central1'
DEFAULT_GCP_COMPUTE_ZONE='us-central1-a'
DEFAULT_GCP_IMAGE="project=ubuntu-os-cloud,family=ubuntu-2004-lts"
DEFAULT_GCP_MACHINE_TYPE="n2-custom-12-24576"
DEFAULT_GCP_DISK_TYPE="pd-ssd"
DEFAULT_PROVIDER="gcp"
DEFAULT_USER="ubuntu"
GCP_DEV_IMAGE="project=ci-coliving-infra,image=ci-image-bake-latest"


get_ssh_args() {
	provider=$1
	user=$2
	name=$3
	case "$provider" in
		azure) printf "az ssh vm --vm-name $name" ;;
		gcp) printf "gcloud compute ssh $user@$name --" ;;
	esac
}

execute_with_ssh() {
	provider=$1
	user=$2
	name=$3
	eval "$(get_ssh_args $provider $user $name)" <<< "${@:4}"
}

copy_file_to_remote() {
	provider=$1
	user=$2
	name=$3
	local_file=$4
	remote_file=$5

	echo "Copying $4 file to remote host $2@$3 as $5..."
	case "$provider" in
		azure)
			# old logic that was buggy for gcloud
			cat $local_file | eval "$(get_ssh_args $provider $user $name)" "cat > $remote_file"
			;;
		gcp)
			eval "gcloud compute scp $local_file $user@$name:$remote_file"
			;;
	esac
}

get_azure_account() {
	az account list --query '[?isDefault] | [0].user.name' -o tsv
}

get_azure_subscription() {
	az account list --query '[?isDefault] | [0].name' -o tsv
}

get_azure_resource_group() {
	az config get default.group --query 'value' -o tsv
}

get_gcp_account() {
	gcloud config list account --format 'value(core.account)'
}

get_gcp_project() {
	gcloud config get-value project
}

gcp_image_to_flags() {
	echo $1 | sed -E 's/(^|,)project=/ --image-project=/; s/(^|,)family=/ --image-family=/; s/(^|,)image=/ --image=/'
}

gcp_set_defaults() {
	if [[ "$(gcloud config get 'compute/region')" == "" ]]; then
		echo 'setting compute/region in gcloud'
		gcloud config set 'compute/region' $DEFAULT_GCP_COMPUTE_REGION
	fi

	if [[ "$(gcloud config get 'compute/zone')" == "" ]]; then
		echo 'setting compute/zone in gcloud'
		gcloud config set 'compute/zone' $DEFAULT_GCP_COMPUTE_ZONE
	fi
}

azure_set_defaults() {
	if [[ "$(get_azure_resource_group)" == "" ]]; then
		echo 'setting default azure resource group'
		az config set defaults.group=coliving-azure
	fi

	if [[ ! -f "$HOME/.ssh/coliving-azure" ]]; then
		yes n | ssh-keygen -m PEM -t rsa -b 4096 -P "" -f "$HOME/.ssh/coliving-azure" > /dev/null
	fi
}

instance_exists() {
	case "$1" in
		azure)
			az vm show -n $2 2>&1 > /dev/null
			;;
		gcp)
			gcloud compute instances describe $2 2>&1 > /dev/null
			;;
	esac
}

wait_for_instance() {
	provider=$1
	user=$2
	name=$3
	ssh_args=$(get_ssh_args $provider $user $name)
	while ! eval $ssh_args ':'; do
		sleep 1
	done
}

reboot_instance() {
	echo "Rebooting instance $2 on $1 platform..."
	case "$1" in
		azure)
			az vm restart --name $2
			;;
		gcp)
			gcloud compute instances stop $2
			gcloud compute instances start $2
			;;
	esac
}


reboot_instance() {
	echo "Rebooting instance $2 on $1 platform..."
	case "$1" in
		azure)
			az vm restart --name $2
			;;
		gcp)
			gcloud compute instances stop $2
			gcloud compute instances start $2
			;;
	esac
}


get_ip_addr() {
	provider=$1
	name=$2

	case "$provider" in
		azure)
			az vm list-ip-addresses --name $name --query '[0].virtualMachine.network.publicIpAddresses[0].ipAddress' -o tsv
			;;
		gcp)
			gcloud compute instances describe $name --format 'get(networkInterfaces[0].accessConfigs[0].natIP)'
			;;
	esac
}

format_bold() {
	printf "$(tput bold)$@$(tput sgr0)"
}

set_ssh_serveralive() {
	if [[ ! -f "/etc/ssh/ssh_config.d/60-coliving.conf" ]]; then
		read -p "Configure /etc/ssh/ssh_config.d/60-coliving.conf? (sudo required) [y/N] " -n 1 -r && echo
		if [[ "$REPLY" =~ ^[Yy]$ ]]; then
			echo "ServerAliveInterval 60" | sudo tee -a /etc/ssh/ssh_config.d/60-coliving.conf
		fi
	fi
}
