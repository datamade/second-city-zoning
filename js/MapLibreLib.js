var geocoder

async function loadFromGzip(url) {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const decompressedData = pako.inflate(new Uint8Array(arrayBuffer), {
    to: 'string',
  })
  const data = JSON.parse(decompressedData)

  return data
}

class InfoControl {
  constructor() {
    this.container = document.createElement('div')
    this.container.className = 'info'
    this.container.innerHTML = 'Hover over a feature to see details.'
  }

  onAdd(map) {
    this.map = map
    return this.container
  }

  onRemove() {
    this.container.parentNode.removeChild(this.container)
    this.map = undefined
  }

  updateInfo(content) {
    this.container.style.display = content ? 'block' : 'none'
    this.container.innerHTML = content || 'Hover over a feature to see details.'
  }
}

var MapLibreLib = {
  map_centroid: [-87.667, 41.840],
  defaultZoom: 10,
  locationScope: 'chicago',
  lastClickedFeatureId: null,
  selectedId: $.address.parameter('id'),
  selectedFeatureLoaded: false,

  baseMaplayers: {
    "Streets": "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    "Buildings": "https://raw.githubusercontent.com/go2garret/maps/main/src/assets/json/openStreetMap.json",
    "Satellite": "https://raw.githubusercontent.com/go2garret/maps/main/src/assets/json/arcgis_hybrid.json"
  },

  initialize: function(baseLayer) {
    geocoder = new google.maps.Geocoder()
    $("#search_address").val(MapLibreLib.convertToPlainString($.address.parameter('address')))
    
    let baseStyle = MapLibreLib.baseMaplayers["Streets"]
    if (baseLayer != null) {
      baseStyle = MapLibreLib.baseMaplayers[baseLayer]
    }

    MapLibreLib.map = new maplibregl.Map({
      container: 'map',
      style: baseStyle,
      projection: 'globe',
      zoom: MapLibreLib.defaultZoom,
      center: MapLibreLib.map_centroid,
    })

    MapLibreLib.infoControl = new InfoControl()
    MapLibreLib.map.addControl(MapLibreLib.infoControl, 'bottom-left')

    // initialize is called in multiple places - only load data if we dont have it yet
    if (MapLibreLib.map.getSource('zoning-data') == null) {
      MapLibreLib.map.on('load', () => {
        loadFromGzip('/data/chicago-zoning-2025-04-17-simple.geojson.gz').then(
          (d) => {
            MapLibreLib.map.addSource('zoning-data', {
              type: 'geojson',
              data: d,
              generateId: true,
            })
  
            MapLibreLib.map.addControl(
              new maplibregl.NavigationControl({
                visualizePitch: true,
                visualizeRoll: true,
                showZoom: true,
                showCompass: true,
              })
            )
  
            zoningStyles.forEach((s) => MapLibreLib.map.addLayer({ ...s }))

            MapLibreLib.map.on('click', `zoning`, (e) => {
              const feat = e.features[0]
              $.address.parameter('id', feat.id)
              MapLibreLib.onClick(feat)
            })
          }
        )

        // load initial map state. address first, fall back to clicked feature
        if ($.address.parameter('address')){
          // search if there is an address saved in the URL
          MapLibreLib.doSearch()
        } else {
          // if an ID is in the URL, load it
          MapLibreLib.map.on('sourcedata', function (e) {
            if (
              !MapLibreLib.selectedFeatureLoaded &&
              MapLibreLib.selectedId &&
              e.isSourceLoaded
            ) {
              MapLibreLib.selectedId = Number(MapLibreLib.selectedId)
              const features = MapLibreLib.map.querySourceFeatures('zoning-data')
              const feat = features.find(f => f.id === MapLibreLib.selectedId)

              // highlight the feature
              MapLibreLib.map.setFeatureState(
                { source: 'zoning-data', id: feat.id },
                { clicked: true }
              )
              MapLibreLib.onClick(feat)

              // ensure this is only done once. sourcedata events are fired often
              MapLibreLib.selectedFeatureLoaded = true
            }
          })
        }
      })
    }

    MapLibreLib.map.on('mousemove', 'zoning', MapLibreLib.onMouseMove)
  },

  onMouseMove: function(e) {
    const features = MapLibreLib.map.queryRenderedFeatures(e.point, {
      layers: ['zoning'],
    })

    if (features.length > 0) {
      const feature = features[0]
      const zone_info = MapLibreLib.getZoneInfo(feature.properties.zone_class)
      const content =
        "<img src='/images/icons/" +
        zone_info.zone_icon +
        ".png' /> " +
        feature.properties.zone_class +
        ' - ' +
        zone_info.title
      MapLibreLib.infoControl.updateInfo(content)
    } else {
      MapLibreLib.infoControl.updateInfo(null)
    }
  },
  
  onClick: function(feat) {

    // Clear old selected feature state
    if (MapLibreLib.lastClickedFeatureId !== null) {
      MapLibreLib.map.setFeatureState(
        {
          source: 'zoning-data',
          id: MapLibreLib.lastClickedFeatureId,
        },
        { clicked: false }
      )
    }

    // Set feature state of clicked feature
    MapLibreLib.map.setFeatureState(
      { source: 'zoning-data', id: feat.id },
      { clicked: true }
    )
    MapLibreLib.lastClickedFeatureId = feat.id

    const centroid = turf.centroid(feat.geometry)
    const zoneClass = feat.properties.zone_class
    const coordinates = centroid.geometry.coordinates
    const popupContent = MapLibreLib.getPopupContent(zoneClass)

    // Center the map on the clicked feature
    MapLibreLib.map.flyTo({
      center: centroid.geometry.coordinates,
      zoom: 15,
    })

    // Display info popup
    new maplibregl.Popup()
      .setLngLat(coordinates)
      .setHTML(popupContent)
      .addTo(MapLibreLib.map)
  },

  getPopupContent: function(zoneClass) {
    const zoneClassInfo = MapLibreLib.getZoneInfo(zoneClass)
    
    let project_link = ''
    if (zoneClassInfo.project_link != '') {
      project_link = `
      <p>
        <a href='${zoneClassInfo.project_link}'>
          Read the full development plan for ${zoneClass} &raquo;
        </a>
      </p>`
    }

    return (
      `
      <h4>
        <img src='/images/icons/${zoneClassInfo.zone_icon}.png' />
        <a href='/zone/${zoneClassInfo.zone_class_link}/'>
          ${zoneClass}<br />
          <small>${zoneClassInfo.title}</small>
        </a>
      </h4>
      <p>
        <strong>What's here?</strong><br />
        ${zoneClassInfo.description}
        <a href='/zone/${zoneClassInfo.zone_class_link}/'>Learn&nbsp;more&nbsp;»</a>
      </p>
      ${project_link}
      `
    )
  },

  getZoneInfo: function(zone_class) {
    if (zone_class.substring(0, 'PD'.length) === 'PD') {
      title = 'Planned Development'
      description =
        'Tall buildings, campuses, and other large developments that must be negotiated with city planners. Developers gain freedom in building design, but must work with city to ensure project serves and integrates with surrounding neighborhood.'
      zone_class_link = 'PD'
      project_link =
        'https://gisapps.cityofchicago.org/gisimages/zoning_pds/' +
        zone_class.replace(' ', '') +
        '.pdf'
    } else if (zone_class.substring(0, 'PMD'.length) === 'PMD') {
      title = 'Planned Manufacturing District';
      description = "All kinds of manufacturing, warehouses, and waste disposal. Special service district - not technically a manufacturing district - intended to protect the city's industrial base.";
      zone_class_link = "PMD";
      project_link = ''
    } else {
      title = ZoningTable[zone_class].district_title
      description = ZoningTable[zone_class].juan_description
      zone_class_link = zone_class
      project_link = ''
    }

    return {
      title: title,
      description: description,
      zone_class_link: zone_class_link,
      zone_icon: MapLibreLib.getZoneIcon(zone_class),
      project_link: project_link,
    }
  },

  getZoneIcon: function(zone_class) {
    var zone_prefix = zone_class.replace(new RegExp('[^A-Z]', 'gm'), '')

    var zone_icon = ''
    switch (zone_prefix) {
      case 'B':
        zone_icon = 'commercial'
        break
      case 'C':
        zone_icon = 'commercial'
        break
      case 'M':
        zone_icon = 'industrial'
        break
      case 'R':
        zone_icon = 'residential'
        break
      case 'RS':
        zone_icon = 'residential'
        break
      case 'RT':
        zone_icon = 'residential'
        break
      case 'RTA':
        zone_icon = 'residential'
        break
      case 'RM':
        zone_icon = 'residential'
        break
      case 'PD':
        zone_icon = 'government'
        break
      case 'PMD':
        zone_icon = 'industrial'
        break
      case 'DX':
        zone_icon = 'commercial'
        break
      case 'DC':
        zone_icon = 'commercial'
        break
      case 'DR':
        zone_icon = 'residential'
        break
      case 'DS':
        zone_icon = 'commercial'
        break
      case 'T':
        zone_icon = 'trains'
        break
      case 'POS':
        zone_icon = 'parks-entertainment'
        break
    }

    return zone_icon
  },

  toggleZoningLayer: function(toggle) {

    if (toggle == 'on') {
      MapLibreLib.map.setLayoutProperty('zoning', 'visibility', 'visible')
      MapLibreLib.map.setLayoutProperty('zoning-outline', 'visibility', 'visible')
    } else {
      MapLibreLib.map.setLayoutProperty('zoning', 'visibility', 'none')
      MapLibreLib.map.setLayoutProperty('zoning-outline', 'visibility', 'none')
    }
  },

  changeBaseLayer: function(baseLayer) {
    // from https://github.com/maplibre/maplibre-gl-js/issues/2587#issuecomment-1997263712  
    MapLibreLib.map.setStyle(MapLibreLib.baseMaplayers[baseLayer], {
      transformStyle: (previousStyle, nextStyle) => {
        var custom_layers = previousStyle.layers.filter(layer => {
          return layer.id.startsWith('zoning')
        })
        var layers = nextStyle.layers.concat(custom_layers)
    
        var sources = nextStyle.sources
        for (const [key, value] of Object.entries(previousStyle.sources)) {
          if (key.startsWith('zoning')) {
            sources[key] = value
          }
        }
        return {
          ...nextStyle,
          sources: sources,
          layers: layers
        }
      }
    })
  },

  doSearch: function() {
    var address = $('#search_address').val()

    if (address != '') {
      if (address.toLowerCase().indexOf(MapLibreLib.locationScope) == -1)
        address = address + ' ' + MapLibreLib.locationScope

      geocoder.geocode({ address: address }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          let lng_lat_point = [
            results[0].geometry.location.lng(),
            results[0].geometry.location.lat(),
          ]

          $.address.parameter('address', encodeURIComponent(address))

          MapLibreLib.map
            .flyTo({
              center: lng_lat_point,
              zoom: 15,
              speed: 2,
            })
            .once('moveend', () => {
              const matches = MapLibreLib.map.queryRenderedFeatures(
                { target: { layerId: 'zoning' } }
              )

              const turf_point = turf.point([lng_lat_point[0], lng_lat_point[1]])

              try {
                let found_match
                for (const feature of matches) {
                  if (turf.booleanPointInPolygon(turf_point, feature)) {
                    found_match = feature
                    break
                  }
                }

                // highlight the feature
                MapLibreLib.map.setFeatureState(
                  { source: 'zoning-data', id: found_match.id },
                  { clicked: true }
                )

                const zoneClass = found_match.properties.zone_class
                const popupContent = MapLibreLib.getPopupContent(zoneClass)

                // create a HTML element for each feature
                const el = document.createElement('div')
                el.className = 'marker'

                new maplibregl.Marker(el)
                  .setLngLat(lng_lat_point)
                  .addTo(MapLibreLib.map)

                new maplibregl.Popup()
                  .setLngLat(lng_lat_point)
                  .setHTML(popupContent)
                  .addTo(MapLibreLib.map)
              
                } catch(error) {
                console.log(error)
                alert('Could not find zoning data for this address: ' + address)
              }
            })
        } else {
          alert('We could not find your address: ' + status)
        }
      })
    } else {
      //search without geocoding callback
      MapLibreLib.clearSearch()
    }
  },

  clearSearch: function() {
    MapLibreLib.map.flyTo({
      center: MapLibreLib.map_centroid,
      zoom: MapLibreLib.defaultZoom,
      speed: 2,
    })
  },

  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(
          position.coords.latitude,
          position.coords.longitude
        )
        MapLibreLib.addrFromLatLng(foundLocation)
      }, null)
    } else {
      alert('Sorry, we could not find your location.')
    }
  },

  addrFromLatLng: function(latLngPoint) {
    geocoder.geocode({ latLng: latLngPoint }, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#search_address').val(results[1].formatted_address)
          $('.hint').focus()
          MapLibreLib.doSearch()
        }
      } else {
        alert('Geocoder failed due to: ' + status)
      }
    })
  },

  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return ''
    return decodeURIComponent(text)
  },
}