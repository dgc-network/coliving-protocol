#!/usr/bin/env bash

# Usage: create-instance.sh [options] <name>
#
# Options:
#   -p <provider>
#   -i <image>
#   -d <disk-size>
#   -m <machine-type>

set -e

PROTOCOL_DIR=${PROTOCOL_DIR:-$(dirname $(realpath $0))/../../}

source $PROTOCOL_DIR/service-commands/scripts/utils.sh

# parse arguments
while getopts "p:i:d:m:s:" flag; do
	case "$flag" in
		p) provider=$OPTARG;;
		i) image=$OPTARG;;
		d) disk_size=$OPTARG;;
		m) machine_type=$OPTARG;;
		s) spot_instance=$OPTARG;;
	esac
done

name=${@:$OPTIND:1}

# Set defaults and validate arguments
provider=${provider:-$DEFAULT_PROVIDER}
disk_size=${disk_size:-$DEFAULT_DISK_SIZE}
spot_instance=${spot_instance:-false}

case "$provider" in
	azure)
		image=${image:-$DEFAULT_AZURE_IMAGE}
		machine_type=${machine_type:-$DEFAULT_AZURE_MACHINE_TYPE}
		;;
	gcp)
		image=${image:-$DEFAULT_GCP_IMAGE}
		machine_type=${machine_type:-$DEFAULT_GCP_MACHINE_TYPE}
		disk_type=${disk_type:-$DEFAULT_GCP_DISK_TYPE}
		;;
	*)
		echo "Unknown Provider:" $provider
		exit 1
		;;
esac

if [[ -z "$name" ]]; then
	echo "Name for instance was not provided"
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

# Confirm choices
echo $(format_bold "Provider:") $provider
echo $(format_bold "OS Image:") $image
echo $(format_bold "Disk Size:") $disk_size
echo $(format_bold "Machine Type:") $machine_type
echo $(format_bold "Name:") $name
echo $(format_bold "Spot Instance:") $spot_instance

case "$provider" in
	azure)
		echo "$(tput bold)Account:$(tput sgr0)" $(get_azure_account)
		echo "$(tput bold)Subscription:$(tput sgr0)" $(get_azure_subscription)
		echo "$(tput bold)Resource Group:$(tput sgr0)" $(get_azure_resource_group)
		;;
	gcp)
		echo "$(tput bold)Account:$(tput sgr0)" $(get_gcp_account)
		echo "$(tput bold)Project:$(tput sgr0)" $(get_gcp_project)
		;;
esac

read -p "Confirm Options? [y/N] " -n 1 -r && echo
if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
	exit 1
fi

# Create the instance
case "$provider" in
	azure)
		az vm create \
			--name $name \
			--image $image \
			--os-disk-size-gb $disk_size \
			--size $machine_type \
			--public-ip-sku Basic \
			--ssh-key-values ~/.ssh/coliving-azure
		;;
	gcp)
		if [[ "$spot_instance" == true ]]; then
			spot_flag=--provisioning-model=SPOT
		fi
		gcloud compute instances create \
			$name $(gcp_image_to_flags $image) \
			--boot-disk-size $disk_size \
			--boot-disk-type $disk_type \
			--machine-type $machine_type \
			$spot_flag
		if [[ "$image" = "$GCP_DEV_IMAGE" ]]; then
			gcloud compute instances add-tags $name --tags=fast
		fi
		;;
esac
