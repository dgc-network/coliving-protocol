import json
from collections import defaultdict

import matplotlib.pyplot as plt
import numpy as np


def add_labels(rects):
    for label in ax.bar_label(rects, padding=2):
        label.set_text((format(int(label.get_text()), ",")))


with open("output.json", "r") as f:
    users = json.load(f)

content_nodes_set = set()
for user in users:
    content_nodes_set |= set(
        content_node["endpoint"] for content_node in user["creatorNodes"]
    )
content_nodes = sorted(content_nodes_set)

# Plot synced and reamining
synced: defaultdict[str, set] = defaultdict(set)
remaining: defaultdict[str, set] = defaultdict(set)
for user in users:
    user_cids = set(user["cids"])
    for content_node in user["creatorNodes"]:
        content_node_cids = set(content_node["cids"])
        synced[content_node["endpoint"]] |= content_node_cids
        remaining[content_node["endpoint"]] |= user_cids - content_node_cids

fig, ax = plt.subplots(figsize=(len(content_nodes), len(content_nodes) * 0.8))

y, width = np.arange(len(content_nodes)), 0.3
synced_rects = ax.barh(
    y + width / 2, [len(synced[i]) for i in content_nodes], width, label="Synced"
)
remaining_rects = ax.barh(
    y - width / 2, [len(remaining[i]) for i in content_nodes], width, label="Remaining"
)

ax.set_xlabel("# of cids")
ax.set_ylabel("content node")
ax.set_yticks(y)
ax.set_yticklabels(content_nodes)
ax.legend()

add_labels(synced_rects)
add_labels(remaining_rects)

fig.tight_layout()

plt.savefig("synced_remaining.png")
# ---

# Plot number of users managed by each content node
total: defaultdict[str, int] = defaultdict(int)
as_primary: defaultdict[str, int] = defaultdict(int)
for user in users:
    for content_node in user["creatorNodes"]:
        if content_node["primary"]:
            as_primary[content_node["endpoint"]] += 1
        total[content_node["endpoint"]] += 1

fig, ax = plt.subplots(figsize=(len(content_nodes), len(content_nodes) * 0.8))

y, width = np.arange(len(content_nodes)), 0.3
total_rects = ax.barh(
    y + width / 2, [total[i] for i in content_nodes], width, label="Total"
)
as_primary_rects = ax.barh(
    y - width / 2, [as_primary[i] for i in content_nodes], width, label="As primary"
)

ax.set_xlabel("# of users")
ax.set_ylabel("content node")
ax.set_yticks(y)
ax.set_yticklabels(content_nodes)
ax.legend()

add_labels(total_rects)
add_labels(as_primary_rects)

fig.tight_layout()

plt.savefig("num_users_managed.png")
# ---

# Plot frequnecy of number of time a cids was replicated
cid_to_content_nodes = defaultdict(set)
for user in users:
    for content_node in user["creatorNodes"]:
        for cid in content_node["cids"]:
            cid_to_content_nodes[cid].add(content_node["endpoint"])

frequency = [0] * (max(len(i) for i in cid_to_content_nodes.values()) + 1)
for i in cid_to_content_nodes.values():
    frequency[len(i)] += 1

fig, ax = plt.subplots()

rects = ax.bar(np.arange(len(frequency)), frequency)

ax.set_xticks(np.arange(len(frequency)))
ax.set_xlabel("# of time cid was replicated")
ax.set_ylabel("frequency")

add_labels(rects)

fig.tight_layout()

plt.savefig("cid_replication_frequency.png")
# ---

# Plot frequnecy of number of time a cids was replicated
full_sync_count_frequency = defaultdict(list)
for user in users:
    num_cids = len(user["cids"])
    full_synced = 0
    for content_node in user["creatorNodes"]:
        if len(content_node["cids"]) == num_cids:
            full_synced += 1

    full_sync_count_frequency[full_synced].append(
        {
            "id": user["user_id"],
            "handle": user["handle"],
        }
    )

max_frequency = max(full_sync_count_frequency.keys())
frequency = [0] * (max_frequency + 1)
for key, value in full_sync_count_frequency.items():
    frequency[key] = len(value)

with open("full_synced.json", "w") as f:
    json.dump(dict(full_sync_count_frequency), f, indent=4)

fig, ax = plt.subplots()

rects = ax.bar(np.arange(len(frequency)), frequency)

ax.set_xticks(np.arange(len(frequency)))
ax.set_xlabel("# of fully sync nodes for user")
ax.set_ylabel("# number of users")

add_labels(rects)

fig.tight_layout()

plt.savefig("full_sync_frequency.png")
# ---
