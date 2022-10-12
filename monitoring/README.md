# Prometheus & Grafana

## Getting Started

```bash
A run monitoring up

# A run monitoring down

# optionally remove all grafana and prometheus data
# sudo rm -rf ./data/
```

Access Grafana by visiting:

* http://localhost:80

Access Prometheus by visiting:

* http://localhost:9090/targets

### Notes

* `https` is not supported.
* The default credentials are `admin`/`admin`.
* The password must be changed on first login to something other than `admin` or click on the `Skip` link when prompted to change your password.

If the password is changed, for ease of future development, add the password to your `~/.profile`:

```bash
GRAFANA_PASS=xxxxx

echo "export GRAFANA_PASS=${GRAFANA_PASS}" >> ~/.profile
```

## Table of Contents

- [Prometheus & Grafana](#prometheus-grafana)
  - [Getting Started](#getting-started)
    - [Notes](#notes)
  - [Prometheus](#prometheus)
    - [Adding New Targets](#adding-new-targets)
    - [Adding New Third-Party Exporters](#adding-new-third-party-exporters)
      - [Locally](#locally)
    - [Release Auto-Generated Targets to Production](#release-auto-generated-targets-to-production)
  - [Grafana](#grafana)
    - [Adding New Dashboards](#adding-new-dashboards)
    - [Adding New Panels](#adding-new-panels)
      - [Common Patterns for Gauges](#common-patterns-for-gauges)
      - [Common Patterns for Histograms](#common-patterns-for-histograms)
        - [Latency from Histograms](#latency-from-histograms)
        - [Quantiles from Histograms](#quantiles-from-histograms)
    - [Configuring Panels](#configuring-panels)
      - [Query -> Code](#query-code)
        - [Metric Browser](#metric-browser)
        - [Legend](#legend)
      - [Visualizations](#visualizations)
      - [Panel Options](#panel-options)
        - [Title](#title)
        - [Description](#description)
        - [Repeat Options](#repeat-options)
      - [Tooltip](#tooltip)
        - [Tooltip Mode](#tooltip-mode)
        - [Values sort order](#values-sort-order)
      - [Legend](#legend)
        - [Legend Mode](#legend-mode)
        - [Legend Placement](#legend-placement)
        - [Legend Values](#legend-values)
      - [Graph Styles](#graph-styles)
      - [Axis](#axis)
      - [Standard Options](#standard-options)
      - [Thresholds](#thresholds)
    - [Saving Dashboards](#saving-dashboards)
      - [Saving Screenshots](#saving-screenshots)
      - [Saving Locally Developed Dashboards](#saving-locally-developed-dashboards)
      - [Saving Production Dashboards](#saving-production-dashboards)
        - [Saving Production Dashboards Within `prometheus-grafana-metrics`](#saving-production-dashboards-within-prometheus-grafana-metrics)
        - [Saving Production Dashboards Locally](#saving-production-dashboards-locally)
    - [Releasing Dashboards to Production](#releasing-dashboards-to-production)
  - [Notes](#notes)
    - [SSH Access to `prometheus-grafana-metrics`](#ssh-access-to-prometheus-grafana-metrics)

## Prometheus

Prometheus acts as our timeseries database that Grafana primarily displays metrics from. Prometheus Targets are a list of client-side Exporters that are scraped on a routine basis.

In order to ingest new Exporters into Prometheus, we must set Prometheus Targets.

### Adding New Targets

`./prometheus/generateProm.js` generates `prometheus.yml` within the container at build time.

For local development, start by modifying `./prometheus/ymls/local.yml`.

To add new static targets for production, use the stubs within `./prometheus/ymls/`.

To add new dynamically generated targets, modification of `./prometheus/generateProm.js::generateEnv()` may be required.

### Adding New Third-Party Exporters

Exporters allow Prometheus to scrape data from [various sources](https://prometheus.io/docs/instrumenting/exporters/). Many official and community exporters exist for common technologies like Postgres and Redis as well as common APIs like AWS and GCP. Each exporter is a self-contained microservice, typically run within a Docker container, that simply translates metrics into Prometheus-style `/metrics` endpoints.

#### Locally

To add new exporters locally, update `monitoring/docker-compose.yml` and add new exporter sidecars. These additional sidecars will launch when running `A run monitoring up`.

For Prometheus to scrape these new exporters, modify `monitoring/prometheus/ymls/local.yml` using `local-exporters-postgres-*` jobs as good examples. Note that the included `metric_relabel_configs` definition is designed to add a prefix onto all metrics in an effort to keep our exporters' metrics grouped together. Grouping metrics together by common prefixes helps navigating for related metrics within Grafana.

### Release Auto-Generated Targets to Production

Deploy production changes by ssh'ing into our monitoring box, checking out the new code, and using `deploy.sh` to generate and consume the production version of `prometheus.yml` which targets all staging and production exporters.

```bash
ssh-add ~/.ssh/id_ed25519.github
ssh prometheus-grafana-metrics
cd ~/coliving-protocol/monitoring

git checkout master
git pull

scripts/deploy.sh prod
```

This job is also set to run nightly via a `cronjob` to auto-generate our list of node operators:

```
0 0 * * * cd ~/coliving-protocol/monitoring && scripts/deploy.sh prod
```

## Grafana

Grafana is the main UI for our metrics. Grafana primarily relies on Prometheus as its metrics backend.

### Adding New Dashboards

Official dashboard names should be prefixed with `Coliving - ` while personal dashboards should be prefixed with your name, for example: `Joaquin - `.

Try to keep the number of personal dashboards low to maintain navigability.

Our dashboards use common set of Variables (Dashboard `Settings` -> `Variables`):

* `env`: `label_values(coliving_dn_flask_route_duration_seconds_count, environment)`
* `host`: `label_values(coliving_dn_flask_route_duration_seconds_count{environment=~"$env"}, host)`

To simplify the process of setting up dashboards each time, we can navigate to the `Coliving - Boilerplate` dashboard's `Settings` -> `Save As...` dialog to copy the boilerplate.

Additionally, follow the official documentation for [best practices for creating dashboards](https://grafana.com/docs/grafana/latest/best-practices/best-practices-for-creating-dashboards/).

### Adding New Panels

Plenty of complexity can be added when writing `PromQL`, but most times the following example queries will work for a majority of panels.

However, before writing out PromQL from scratch, it may be easier to find a panel similar to the new panel that will be created, then:

* Click on the panel title to open the panel menu
* Hover over `More...`
* Click `Duplicate`

This will create a duplicate panel within your same dashboard.

If the goal is to use a panel from a different dashboard:

* Click on `Copy` instead of `Duplicate` on the source panel
* Navigate to the target dashboard
* Click `Add Panel` (plus symbol on the top-right)
* Click `Paste panel from clipboard`

When additional complexity is required, visit the [official Prometheus documentation on PromQL](https://prometheus.io/docs/prometheus/latest/querying/basics/).

#### Common Patterns for Gauges

Gauges are the easiest pattern since they simply display the value of a metric that was displayed at scrape time:

> `coliving_dn_health_check_block_difference_latest{environment=~"$env", host=~"$host"}`

Notice how we restrict the `environment` and `host` labels associated with the metric to match the Dashboard Variables discussed in the previous section.

**Note:** When using [PromQL filters](https://prometheus.io/docs/prometheus/latest/querying/basics/#time-series-selectors) knowing the intricacies of the label matching operators can save plenty of time:

* `=`: Select labels that are exactly equal to the provided string.
* `!=`: Select labels that are not equal to the provided string.
* `=~`: Select labels that regex-match the provided string.
* `!~`: Select labels that do not regex-match the provided string.

#### Common Patterns for Histograms

##### Latency from Histograms

A common pattern for histograms is to display the average latency of a recorded metric like the example below:

> `max by (route) (rate(coliving_dn_flask_route_duration_seconds_sum{environment=~"$env", host=~"$host"}[5m]) / rate(coliving_dn_flask_route_duration_seconds_count{environment=~"$env", host=~"$host"}[5m]))`

The bulk of the query comes from official docs on [calculating averages from histograms](https://prometheus.io/docs/practices/histograms/#count-and-sum-of-observations) while including PromQL filters for `environment` and `host`.

The remaining part of the query, `max by (route) (...)`, uses an [Aggregation Operator](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators) which will return the `max` value of the metric after consolidating on the `route` label.

In this specific query, `max by (route)` will display the longest latency across a single `$host`, or all `$host` values if the Dashboard Variable is set to `All`. We use `max` here since it's more important to know that a `route` is being non-performant, regardless of `$host`, since it may be indicative of early warning stress/latency that may soon be appearing on all hosts.

##### Quantiles from Histograms

Additionally, histogram metrics keep digital_content of metric values within different statistical buckets. In order to [expose quantile information](https://prometheus.io/docs/practices/histograms/#quantiles), combine histogram `_bucket` metrics with `histogram_quantile()`.

### Configuring Panels

Once a new panel is created, panel settings can help ensure the purpose of the panel is effectively communicated.

Always consider what actionable information is required instead of focusing on graphing the collected information directly. For example, while we might be collecting "Primary User Counts by Content Node" it may make more sense to display "Primary Users Count Unbalance by Content Node" to easily spot which nodes have a less than ideal number of Primary Users.

#### Query -> Code

##### Metric Browser

Ensure you filter your metrics by `{environment=~"$env", host=~"$host"}` so they can make use of Dashboard Variables.

##### Legend

By default, your legends may look something like this:

> `{__name__="primary_user_count", component="network-monitoring", endpoint="https://creatornode5.staging.coliving.lol", environment="stage", exported_job="network-monitoring", host="discoverynode2.staging.coliving.lol", instance="35.202.199.159:9091", job="stage-network-monitoring", run_id="9", service="coliving"}`

In this specific case, we want the legend to be the content node's hostname, so set the Legend to:

```
{{endpoint}}
```

While not ideal in this case, we can also combine fields or include our own text:

```
{{endpoint}}, run: {{run_id}}
```

#### Visualizations

Grafana offers plenty of different [visualizations](https://grafana.com/docs/grafana/latest/visualizations/) like:

* Time series
* Bar chart
* Stat
* Pie Chart
* Heatmap
* Text

We will primarily cover `Time series` panels specifically, but the same fundamentals apply to other visualization types.

When unsure which panel to use, the `Visualizations` dropdown (top-right) offers `Suggestions` based on the data being presented.

#### Panel Options

##### Title

Use a succinct title.

##### Description

Descriptions use Markdown text which is displayed as little `i` tooltips on the top-left corner of each panel where a description has been written. The ideal format is:

```
One sentence explaning the chart with a bit more context.

A paragraph or two going into detail about the panel.

#### Alerts

##### > 10

This means something is breaking in this manner.

Corrective actions that can be taken go here.

##### > 5

This means we might see stress here and there. Keep an eye for this or that.

Which other panels should be taken into consideration.

##### < 1

Expected during normal operations.
```

##### Repeat Options

In some cases, you may want to see an individual panel per `$host`. By using repeat options, we can create one panel definition and have N number of panels auto-generate based on the list of Dashboard Variables.

#### Tooltip

##### Tooltip Mode

`Single` and `All` are great options in most cases. However, if there are too many values, `All` can become overwhelming. Try both to see what works best for your panel.

When combined with `Last *` within `Legend` -> `Legend Value`, any benefits from `All` will be available without a potentially hard-to-read tooltip.

##### Values sort order

Always use `Ascending` or `Descending` based on what ordering would be ideal in a high-pressure situation (like an outage).

#### Legend

##### Legend Mode

`Table` is always recommended. `Hidden` can be ideal for Overview dashboards that are not meant for investigations or on panels where there is little need to hide/unhide certain series.

##### Legend Placement

`Bottom` is the standard for most of our panels.

##### Legend Values

`Mean`, `Max`, and `Last *` are ideal, in that order, for most cases.

We want to be able to see the average value for any given metric, but want `Max` values as those serve as early warning indicators of what a metric's highest value was within the time window selected by Grafana.

`Last *` helps alleviate the need for having Tooltip Mode set to `All` while also filtering out recent null values.

#### Graph Styles

Plenty of options exists like `Line Style` (`Solid`, `Dash`, `Dots`) as well as how to `Connect Null Values`. The rest of the stylization-focused options should remain at their defaults to help standardize our visual experience.

#### Axis

Always add a `Label` value to help users decipher what the metric value's unit is.

Setting `Soft min` and `Soft max` is useful when displaying metrics that may occasionally have outliers that should be quick to spot.

`Scale` can also be set to `Linear` or `Logarithmic` depending on the data.

#### Standard Options

`Unit` is perhaps the most important to set. Always ensure this is set.

For large numbers, use the `short` `Unit`.

The `Color Scheme` should remain set to `Classic Palette` to help standardize our visual experience, but sometimes `Green -> Red` or `Red -> Green` palettes are ideal.

#### Thresholds

Thresholds are best used when Alerts are defined within Panel `Description`. These thresholds should set `Show Thresholds` as `As Lines` so that it's easily visible when limits are being researched. Each line should follow the `Yellow -> Orange -> Red` palette to indicate Early Warning, Low-Urgency Alert, and High-Urgency Alert thresholds have been reached.

### Saving Dashboards

Modifications to production dashboards are internally agreemented by Grafana in case a quick restoration is required:

* Navigate to a dashboard
* Open the Dashboard `Settings` (the cog on the top-right)
* Click on `Versions` (from the left-sidebar)

However, we digital_content our dashboards via `git` as well since this allows us seemless local development of the same dashboards.

#### Saving Screenshots

Getting screenshots out of Grafana has [a long history of being tedious](https://github.com/grafana/grafana/issues/12607).

However, we found good success when using the [GoFullPage Chrome extension](https://chrome.google.com/webstore/detail/gofullpage-full-page-scre/fdpohaocaechififmbbbbbknoalclacl).

#### Saving Locally Developed Dashboards

We can make and save changes to dashboards that were developed on our remote dev boxes by using the following script:

```bash
# pull all dashboards and store them within `grafana/dashboards/`
./grafana/bin/save-dashboards.sh
```

Once locally stored, they can be committed to our repo for a future production release.

#### Saving Production Dashboards

##### Saving Production Dashboards Within `prometheus-grafana-metrics`

When saving production dashboards, everything works out of the box if you ssh into the `prometheus-grafana-metrics` box directly:

```bash
ssh-add ~/.ssh/id_ed25519.github
ssh prometheus-grafana-metrics
cd ~/coliving-protocol/monitoring

# pull and sanatize all production dashboards
./grafana/bin/save-dashboards.sh

# open a PR to digital_content changes to our production dashboards
# git checkout -b grafana-$(date "+%F-%H-%M-%S")
# git add grafana/dashboards/

# return to the master branch prior to logging out
# git checkout master
```

##### Saving Production Dashboards Locally

Saving production dashboards locally can also be done by:

* Copying `grafana/bearer.env` from `prometheus-grafana-metrics`
* Copying the `$GRAFANA_PASS` from LastPass

```bash
BEARER_PATH=grafana/bearer.prod.env \
GRAFANA_API_URL=grafana.coliving.lol \
GRAFANA_PASS=xxx \
./grafana/bin/save-dashboards.sh
```

### Releasing Dashboards to Production

When releasing locally-developed dashboards to Production, ensure we save any manual changes that occurred on our Production dashboards **prior to overwriting them**:

```bash
ssh-add ~/.ssh/id_ed25519.github
ssh prometheus-grafana-metrics
cd ~/coliving-protocol/monitoring

# ensure we're on the latest tip of master
git pull

# pull all production dashboards to ensure no manual changes have been made
./grafana/bin/save-dashboards.sh

# open a PR if you see manual changes
# git checkout -b grafana-$(date "+%F-%H-%M-%S")
# git add grafana/dashboards/

# deploy the manual changes seen, as well as the new intended changes
./grafana/bin/upload-dashboards.sh

# deploy library panel updates
# ONLY WHEN CHANGED to avoid version bumps
./grafana/bin/upload-library-panels.sh

# "manual mode" supports uploading one file at a time
# ./grafana/bin/upload-dashboards.sh filename.json

# return to the master branch prior to logging out
# git checkout master
```

## Notes

Additional notes that may be required when interacting with Prometheus/Grafana.

### SSH Access to `prometheus-grafana-metrics`

A similar setup must exist within your `~/.ssh/config*` settings:

```
Host github.com
  IdentityFile ~/.ssh/id_ed25519.github
```

Once set up, the following line will add your IdentityFile to your current `ssh-agent` session:

```bash
ssh-add ~/.ssh/id_ed25519.github
```

Since `prometheus-grafana-metrics` uses `ForwardAgent yes` we will be able to use our ssh key for interacting with `git`.
