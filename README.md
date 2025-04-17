![second city zoning](http://i.imgur.com/J6oFuK7.gif)

# 2nd City Zoning

2nd City Zoning is an interactive map that lets you:

-   find out **how your building is zoned**
-   learn **where to locate your business**
-   explore **zoning patterns** throughout the city

To make Chicago’s zoning code digestible by humans, we took inspiration
from one of our favorite games: [Sim City 2000](http://en.wikipedia.org/wiki/SimCity_2000). It started with the color scheme and from there we got a little carried away. Graphics, sounds, music, oh my.

2nd City Zoning is entirely [open
source](http://secondcityzoning.org/about#code) and built with [open data](http://secondcityzoning.org/about#data).

## Running locally

```bash
git clone git@github.com:datamade/second-city-zoning.git
cd site_template
gem install jekyll
jekyll serve -w
  
```

Then navigate to http://localhost:5000/

### Run in a Docker container

If you have Docker installed, can avoid some of the hassle of installing Jekyll and/or Ruby by pulling from the offical Jekyll image, installing dependancies, and serving locally. 

This is especially handy if you're on Windows machine:

```bash
docker compose up
```

## Dependencies

* [Jekyll](http://jekyllrb.com)
* [MapLibre-GL JS](https://maplibre.org/maplibre-gl-js/docs/)
* [jQuery](http://jquery.org)
* [jQuery Address](http://www.asual.com/jquery/address)
* [Bootstrap](http://getbootstrap.com)

## Updating Zoning data

The City of Chicago publishes its latest Zoning information on an ArcGIS server. Here's the steps to update this site, which we do annualy:

1. Setup and install [`pyesridump`](https://github.com/openaddresses/pyesridump)
2. Run `esri2geojson https://gisapps.cityofchicago.org/arcgis/rest/services/ExternalApps/Zoning/MapServer/1 chicago-zoning.geojson
3. Use `ogr2ogr` to simplify the geometries and reduce the size. This can be done via the command line or with QGIS. We use a tolerance of `0.00003`
4. Use https://open-innovations.github.io/geojson-minify/ to remove properties we don't use. We only make use of `zone_type`, `zone_class`, and `ordinance_num`
5. `gzip` the GeoJSON file and place in the `/data` folder.

## Team

* Derek Eder
* Juan-Pablo Velez
* Monkruman St. Jules

## Errors / Bugs

If something is not behaving intuitively, it is a bug, and should be reported.
Report it here: https://github.com/datamade/second-city-zoning/issues


## Note on Patches/Pull Requests
 
* Fork the project.
* Make your feature addition or bug fix.
* Commit, do not mess with rakefile, version, or history.
* Send a pull request. Bonus points for topic branches.

## Copyright

Copyright (c) 2013-2025 Derek Eder and Juan-Pablo Velez of Open City. Released under the MIT License.

[See LICENSE for details](https://github.com/datamade/second-city-zoning/blob/master/LICENSE)
