#!/usr/bin/env sh

# start with `logspout` Loggly tag, and add ${coliving_loggly_tags} or ${logglyTags} if present
tag_csv=logspout
if [[ "${coliving_loggly_tags}" ]]; then
   tag_csv=${tag_csv},${coliving_loggly_tags}
elif [[ "${logglyTags}" ]]; then
   tag_csv=${tag_csv},${logglyTags}
fi

# set hostname to ${coliving_discprov_url}, else ${contentNodeEndpoint}
if [[ "${coliving_discprov_url}" ]]; then
   hostname=${coliving_discprov_url}
elif [[ "${contentNodeEndpoint}" ]]; then
   hostname=${contentNodeEndpoint}
fi

# use regex to extract domain in url (source: https://stackoverflow.com/a/2506635/8674706)
# add extracted domain as a Loggly tag
if [[ "${hostname}" ]]; then
   hostname=$(echo ${hostname} | sed -e 's/[^/]*\/\/\([^@]*@\)\?\([^:/]*\).*/\2/')
   tag_csv=${tag_csv},${hostname}
fi

# reformat our comma-delimited list
IFS=","
for tag in ${tag_csv}
do
   tags="${tags} tag=\"${tag}\""
done

# set and echo our Loggly token and tags for Logspout
export SYSLOG_STRUCTURED_DATA="$(echo ${coliving_loggly_token} | base64 -d)@41058 ${tags}"
echo SYSLOG_STRUCTURED_DATA=${SYSLOG_STRUCTURED_DATA}

# start logspout and point it to Loggly
/bin/logspout multiline+syslog+tcp://logs-01.loggly.com:514
