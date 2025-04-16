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

class LayerToggleControl {
  constructor() {
    this.layerIds = layerIds
    this.container = this.createContainer()
  }

  createContainer() {
    const container = document.createElement('div')
    container.className = 'radio-group'

    this.layerIds.forEach((layerId) => {
      const label = document.createElement('label')
      const radio = document.createElement('input')
      radio.type = 'radio'
      radio.name = 'layerToggle'
      radio.value = layerId
      radio.onclick = () => this.toggleLayer(layerId)
      label.appendChild(radio)
      label.appendChild(document.createTextNode(layerId))
      container.appendChild(label)
    })

    return container
  }

  toggleLayer(selectedLayer) {
    this.layerIds.forEach((layerId) => {
      const visibility = layerId === selectedLayer ? 'visible' : 'none'
      map.setLayoutProperty(layerId, 'visibility', visibility)
    })
  }

  onAdd(map) {
    this.map = map
    return this.container
  }

  onRemove() {
    this.container.parentNode.removeChild(this.container)
    this.map = undefined
  }
}

var MapLibreDbLib = {
  map_centroid: [41.87811, -87.66677],
  defaultZoom: 11,
  lastClickedLayer: null,
  locationScope: 'chicago',
  currentPinpoint: null,
  tableName: 'second_city_zoning_2024_10_21',
  lastClickedFeatureId: null,

  initialize: function() {
    MapLibreDbLib.map = new maplibregl.Map({
      container: 'map',
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      projection: 'globe',
      zoom: 11,
      center: [-87.66677, 41.87811],
    })

    MapLibreDbLib.infoControl = new InfoControl()
    MapLibreDbLib.map.addControl(MapLibreDbLib.infoControl, 'bottom-left')

    MapLibreDbLib.map.on('load', () => {
      loadFromGzip('/data/chicago-zoning-2024-10-21-simple.geojson.gz').then(
        (d) => {
          MapLibreDbLib.map.addSource('zoning-data', {
            type: 'geojson',
            data: d,
            generateId: true,
          })

          MapLibreDbLib.map.addControl(
            new maplibregl.NavigationControl({
              visualizePitch: true,
              visualizeRoll: true,
              showZoom: true,
              showCompass: true,
            })
          )

          zoningStyles.forEach((s) => MapLibreDbLib.map.addLayer({ ...s }))

          MapLibreDbLib.map.on('click', 'zoning', MapLibreDbLib.onClick)
        }
      )
    })

    MapLibreDbLib.map.on('mousemove', 'zoning', MapLibreDbLib.onMouseMove)
    MapLibreDbLib.map.on('idle', () => {
      // If these two layers were not added to the map, abort
      // if (!map.getLayer('zoning')) {
      //   return
      // }

      // Enumerate ids of the layers.
      const toggleableLayerIds = ['zoning']

      // Set up the corresponding toggle button for each layer.
      for (const id of toggleableLayerIds) {
        // Skip layers that already have a button set up.
        if (document.getElementById(id)) {
          continue
        }

        // Create a link.
        const link = document.createElement('a')
        link.id = id
        link.href = '#'
        link.textContent = id
        link.className = 'active'

        // Show or hide layer when the toggle is clicked.
        link.onclick = function(e) {
          const clickedLayer = this.textContent
          e.preventDefault()
          e.stopPropagation()

          const visibility = map.getLayoutProperty(clickedLayer, 'visibility')

          // Toggle layer visibility by changing the layout object's visibility property.
          if (visibility === 'visible') {
            map.setLayoutProperty(clickedLayer, 'visibility', 'none')
            this.className = ''
          } else {
            this.className = 'active'
            map.setLayoutProperty(clickedLayer, 'visibility', 'visible')
          }
        }

        // const layers = document.getElementById('menu')
        // layers.appendChild(link)
      }
    })
  },

  onMouseMove: function(e) {
    const features = MapLibreDbLib.map.queryRenderedFeatures(e.point, {
      layers: ['zoning'],
    })

    if (features.length) {
      const feature = features[0]
      const zone_info = MapLibreDbLib.getZoneInfo(feature.properties.zone_class)
      const content =
        "<img src='/images/icons/" +
        zone_info.zone_icon +
        ".png' /> " +
        feature.properties.zone_class +
        ' - ' +
        zone_info.title
      MapLibreDbLib.infoControl.updateInfo(content)
    } else {
      MapLibreDbLib.infoControl.updateInfo(null)
    }
  },

  onClick: function(e) {
    if (e.features.length > 0) {
      // Clear old selected feature state
      if (MapLibreDbLib.lastClickedFeatureId !== null) {
        MapLibreDbLib.map.setFeatureState(
          {
            source: 'zoning-data',
            id: MapLibreDbLib.lastClickedFeatureId,
          },
          { clicked: false }
        )
      }

      // Set feature state of clicked feature
      MapLibreDbLib.map.setFeatureState(
        { source: 'zoning-data', id: e.features[0].id },
        { clicked: true }
      )
      MapLibreDbLib.lastClickedFeatureId = e.features[0].id
    }

    const centroid = turf.centroid(e.features[0].geometry)
    const zoneClass = e.features[0].properties.zone_class
    const coordinates = centroid.geometry.coordinates
    const popupContent = MapLibreDbLib.getPopupContent(zoneClass)

    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
      coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360
    }

    // Center the map on the clicked feature
    MapLibreDbLib.map.flyTo({
      center: centroid.geometry.coordinates,
      zoom: 13.5,
    })

    // Display info popup
    new maplibregl.Popup()
      .setLngLat(coordinates)
      .setHTML(popupContent)
      .addTo(MapLibreDbLib.map)
  },

  getPopupContent: function(zoneClass) {
    const zoneClassInfo = MapLibreDbLib.getZoneInfo(zoneClass)
    return (
      "\
        <h4>\
          <img src='/images/icons/" +
      zoneClassInfo.zone_icon +
      ".png' />\
          <a href='/zone/" +
      zoneClassInfo.zone_class_link +
      "/'>" +
      zoneClass +
      '\
            <small>' +
      zoneClassInfo.title +
      "</small>\
          </a>\
        </h4>\
        <p><strong>What's here?</strong><br />\
        " +
      zoneClassInfo.description +
      "\
        <a href='/zone/" +
      zoneClassInfo.zone_class_link +
      "/'>Learn&nbsp;more&nbsp;»</a></p>\
        "
    )
  },

  getZoneInfo: function(zone_class) {
    // console.log("looking up zone_class: " + zone_class);
    // PD and PMD have different numbers for each district. Fix for displaying generic title and link.
    if (zone_class.substring(0, 'PMD'.length) === 'PMD') {
      title = 'Planned Manufacturing District'
      description =
        "All kinds of manufacturing, warehouses, and waste disposal. Special service district - not technically a manufacturing district - intended to protect the city's industrial base."
      zone_class_link = 'PMD'
      project_link =
        'https://gisapps.cityofchicago.org/gisimages/zoning_pds/' +
        zone_class.replace(' ', '') +
        '.pdf'
    } else if (zone_class.substring(0, 'PD'.length) === 'PD') {
      title = 'Planned Development'
      description =
        'Tall buildings, campuses, and other large developments that must be negotiated with city planners. Developers gain freedom in building design, but must work with city to ensure project serves and integrates with surrounding neighborhood.'
      zone_class_link = 'PD'
      project_link =
        'https://gisapps.cityofchicago.org/gisimages/zoning_pds/' +
        zone_class.replace(' ', '') +
        '.pdf'

      //https://gisapps.cityofchicago.org/gisimages/zoning_pds/PD43.pdf
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
      zone_icon: MapLibreDbLib.getZoneIcon(zone_class),
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

  getOneZone: function(cartodb_id, click_latlng) {
    if (MapLibreDbLib.lastClickedLayer) {
      MapLibreDbLib.map.removeLayer(MapLibreDbLib.lastClickedLayer)
    }
    $.address.parameter('id', cartodb_id)
    var sql = new cartodb.SQL({ user: 'datamade', format: 'geojson' })
    sql
      .execute(
        'select * from ' +
        MapLibreDbLib.tableName +
        ' where cartodb_id = {{cartodb_id}}',
        { cartodb_id: cartodb_id }
      )
      .done(function(data) {
        var shape = data.features[0]
        MapLibreDbLib.lastClickedLayer = L.geoJson(shape)
        MapLibreDbLib.lastClickedLayer.addTo(MapLibreDbLib.map)
        MapLibreDbLib.lastClickedLayer.setStyle({
          weight: 2,
          fillOpacity: 0,
          color: '#000',
        })
        MapLibreDbLib.map.fitBounds(
          MapLibreDbLib.lastClickedLayer.getBounds(),
          {
            maxZoom: 16,
          }
        )

        // show custom popup
        var props = shape.properties
        var zone_info = MapLibreDbLib.getZoneInfo(props.zone_class)
        var popup_content =
          "\
        <h4>\
          <img src='/images/icons/" +
          zone_info.zone_icon +
          ".png' />\
          <a href='/zone/" +
          zone_info.zone_class_link +
          "/'>" +
          props.zone_class +
          '\
            <small>' +
          zone_info.title +
          "</small>\
          </a>\
        </h4>\
        <p><strong>What's here?</strong><br />\
        " +
          zone_info.description +
          "\
        <a href='/zone/" +
          zone_info.zone_class_link +
          "/'>Learn&nbsp;more&nbsp;»</a></p>\
        "

        if (zone_info.project_link != '')
          popup_content +=
            "<p><a target='_blank' href='" +
            zone_info.project_link +
            "'>Read the full development plan for " +
            props.zone_class +
            '&nbsp;»</a></p>'

        // console.log(click_latlng);
        if (click_latlng) {
          MapLibreDbLib.popup = L.popup()
            .setContent(popup_content)
            .setLatLng(click_latlng)
            .openOn(MapLibreDbLib.map)
        } else {
          MapLibreDbLib.lastClickedLayer.bindPopup(popup_content)
          MapLibreDbLib.lastClickedLayer.openPopup()
        }
      })
      .error(function(e) {
        console.log(e)
      })
  },

  doSearch: function() {
    MapLibreDbLib.clearSearch()
    var address = $('#search_address').val()

    if (address != '') {
      if (address.toLowerCase().indexOf(MapLibreDbLib.locationScope) == -1)
        address = address + ' ' + MapLibreDbLib.locationScope

      geocoder.geocode({ address: address }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          MapLibreDbLib.currentPinpoint = [
            results[0].geometry.location.lat(),
            results[0].geometry.location.lng(),
          ]
          $.address.parameter('address', encodeURIComponent(address))
          // MapLibreDbLib.map.setView(
          //   new L.LatLng(
          //     MapLibreDbLib.currentPinpoint[0],
          //     MapLibreDbLib.currentPinpoint[1]
          //   ),
          //   16
          // )

          const point = [
            MapLibreDbLib.currentPinpoint[1],
            MapLibreDbLib.currentPinpoint[0],
          ]

          MapLibreDbLib.map
            .flyTo({
              center: point,
              zoom: 13,
            })
            .once('moveend', () => {
              console.log('finished moving')

              const matches = MapLibreDbLib.map.queryRenderedFeatures(
                [
                  MapLibreDbLib.currentPinpoint[1],
                  MapLibreDbLib.currentPinpoint[0],
                ],
                { target: { layerId: 'zoning' } }
              )

              try {
                console.log(matches[0])
                const centroid = turf.centroid(matches[0].geometry)
                const zoneClass = matches[0].properties.zone_class
                const coordinates = centroid.geometry.coordinates
                const popupContent = MapLibreDbLib.getPopupContent(zoneClass)

                console.log(centroid, zoneClass, coordinates, popupContent)

                while (Math.abs(point[1] - coordinates[0]) > 180) {
                  coordinates[0] += point[1] > coordinates[0] ? 360 : -360
                }

                // create a HTML element for each feature
                const el = document.createElement('div')
                el.className = 'marker'

                new maplibregl.Marker(el)
                  .setLngLat(coordinates)
                  .addTo(MapLibreDbLib.map)

                new maplibregl.Popup()
                  .setLngLat(coordinates)
                  .setHTML(popupContent)
                  .addTo(MapLibreDbLib.map)
              } catch (error) {
                console.log(error)
              }
            })
        } else {
          alert('We could not find your address: ' + status)
        }
      })
    } else {
      //search without geocoding callback
      MapLibreDbLib.map.setView(
        new L.LatLng(
          MapLibreDbLib.map_centroid[0],
          MapLibreDbLib.map_centroid[1]
        ),
        MapLibreDbLib.defaultZoom
      )
    }
  },

  clearSearch: function() {
    MapLibreDbLib.map.flyTo({
      center: [MapLibreDbLib.map_centroid[0], MapLibreDbLib.map_centroid[1]],
      zoom: MapLibreDbLib.defaultZoom,
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
        MapLibreDbLib.addrFromLatLng(foundLocation)
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
          MapLibreDbLib.doSearch()
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