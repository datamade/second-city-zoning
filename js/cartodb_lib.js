var CartoDbLib = CartoDbLib || {};
var CartoDbLib = {

  map_centroid:    [41.87811, -87.66677],
  defaultZoom:     11,
  lastClickedLayer: null,
  locationScope:   "chicago",
  currentPinpoint: null,
  layerUrl: 'http://datamade.cartodb.com/api/v2/viz/1422db28-7eed-11e4-a731-0e4fddd5de28/viz.json',
  tableName: 'city_of_chicago_zoning',

  initialize: function(){
    geocoder = new google.maps.Geocoder();

    // initiate leaflet map
    if (!CartoDbLib.map) {
      CartoDbLib.map = new L.Map('mapCanvas', { 
        center: CartoDbLib.map_centroid,
        zoom: CartoDbLib.defaultZoom
      });
    }

    L.tileLayer('https://{s}.tiles.mapbox.com/v3/datamade.hn83a654/{z}/{x}/{y}.png', {
      attribution: '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>'
    }).addTo(CartoDbLib.map);

    //reset filters
    $("#search_address").val(CartoDbLib.convertToPlainString($.address.parameter('address')));
    $(":checkbox").attr("checked", "checked");

    var sql = "SELECT * FROM " + CartoDbLib.tableName + "";

    // change the query for the first layer
    var subLayerOptions = {
      sql: sql,
      interactivity: 'cartodb_id, zone_type, zone_class, ordinance_'
    }

    CartoDbLib.info = L.control({position: 'bottomleft'});

    CartoDbLib.info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
        this.update();
        return this._div;
    };

    // method that we will use to update the control based on feature properties passed
    CartoDbLib.info.update = function (props) {
      if (props) {
        this._div.innerHTML = "<h4>Zoning type</h4>" + props.zone_class + " - " + CartoDbLib.getZoneInfo(props.zone_class).title;
      }
      else {
        this._div.innerHTML = 'Hover over an area';
      }
    };

    CartoDbLib.info.clear = function(){
      this._div.innerHTML = '';
    };

    CartoDbLib.info.addTo(CartoDbLib.map);

    CartoDbLib.dataLayer = cartodb.createLayer(CartoDbLib.map, CartoDbLib.layerUrl, {cartodb_logo: false})
      .addTo(CartoDbLib.map)
      .on('done', function(layer) {
        var sublayer = layer.getSubLayer(0);
        sublayer.set(subLayerOptions)
        sublayer.on('featureOver', function(e, latlng, pos, data, subLayerIndex) {
          $('#mapCanvas div').css('cursor','pointer');
          CartoDbLib.info.update(data);
        })
        sublayer.on('featureOut', function(e, latlng, pos, data, subLayerIndex) {
          $('#mapCanvas div').css('cursor','inherit');
          CartoDbLib.info.clear();
        })
        sublayer.on('featureClick', function(e, pos, latlng, data){
          CartoDbLib.getOneZone(data['cartodb_id']);
        })
        sublayer.infowindow.set('template', $('#infowindow_template').html())
        
        window.setTimeout(function(){
          if($.address.parameter('id')){
            CartoDbLib.getOneZone($.address.parameter('id'))
          }
        }, 1000)
      }).on('error', function() {
        //log the error
    }); 

    CartoDbLib.doSearch();
  },

  getZoneInfo: function(zone_class) {
    // PD and PMD have different numbers for each district. Fix for displaying generic title and link.
    if (zone_class.substring(0, 'PMD'.length) === 'PMD') {
      title = 'Planned Manufacturing District';
      description = "All kinds of manufacturing, warehouses, and waste disposal. Special service district - not technically a manufacturing district - intended to protect the city's industrial base.";
      link = "PMD";
    }
    else if (zone_class.substring(0, 'PD'.length) === 'PD') {
      title = 'Planned Development';
      description = "Tall buildings, campuses, and other large developments that must be negotiated with city planners. Developers gain freedom in building design, but must work with city to ensure project serves and integrates with surrounding neighborhood.";
      link = "PD";
    }
    else {
      title = ZoningTable[zone_class].district_title;
      description = ZoningTable[zone_class].juan_description;
      link = zone_class;
    }
    return {'title': title, 'description': description, 'link': link};
  },

  getOneZone: function(cartodb_id){
    if (CartoDbLib.lastClickedLayer){
      CartoDbLib.map.removeLayer(CartoDbLib.lastClickedLayer);
    }
    $.address.parameter('id', cartodb_id);
    var sql = new cartodb.SQL({user: 'datamade', format: 'geojson'});
    sql.execute('select * from ' + CartoDbLib.tableName + ' where cartodb_id = {{cartodb_id}}', {cartodb_id:cartodb_id})
    .done(function(data){
      var shape = data.features[0];
      CartoDbLib.lastClickedLayer = L.geoJson(shape);
      CartoDbLib.lastClickedLayer.addTo(CartoDbLib.map);
      CartoDbLib.lastClickedLayer.setStyle({weight: 2, fillOpacity: 0, color: '#000'});
      CartoDbLib.map.setView(CartoDbLib.lastClickedLayer.getBounds().getCenter(), 15);
      // CartoDbLib.selectParcel(shape.properties);
    }).error(function(e){console.log(e)});
    //    window.location.hash = 'browse';
  },

  doSearch: function() {
    CartoDbLib.clearSearch();
    var address = $("#search_address").val();

    //-----custom filters-------
    // var searchType = "zone_type IN (-1,";
    // if ( $("#cbZone1").is(':checked')) searchType += "1,2,7,8,10,";
    // if ( $("#cbZone3").is(':checked')) searchType += "3,6,";
    // if ( $("#cbZone4").is(':checked')) searchType += "4,9,";
    // if ( $("#cbZone5").is(':checked')) searchType += "5,";
    // if ( $("#cbZone11").is(':checked')) searchType += "11,";
    // if ( $("#cbZone12").is(':checked')) searchType += "12,";
    // whereClause += " AND " + searchType.slice(0, searchType.length - 1) + ")";
    //-------end of custom filters--------
    
    if (address != "") {
      if (address.toLowerCase().indexOf(CartoDbLib.locationScope) == -1)
        address = address + " " + CartoDbLib.locationScope;
  
      geocoder.geocode( { 'address': address}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          CartoDbLib.currentPinpoint = [results[0].geometry.location.lat(), results[0].geometry.location.lng()];
          $.address.parameter('address', encodeURIComponent(address));
          CartoDbLib.map.setView(new L.LatLng( CartoDbLib.currentPinpoint[0], CartoDbLib.currentPinpoint[1] ), 16)
          
          CartoDbLib.centerMark = new L.Marker(CartoDbLib.currentPinpoint, { icon: (new L.Icon({
            iconUrl: '/images/blue-pushpin.png',
            iconSize: [32, 32],
            iconAnchor: [10, 32]
          }))}).addTo(CartoDbLib.map);

          // CartoDbLib.drawCircle(CartoDbLib.currentPinpoint);
        } 
        else {
          alert("We could not find your address: " + status);
        }
      });
    }
    else { //search without geocoding callback
      CartoDbLib.map.setView(new L.LatLng( CartoDbLib.map_centroid[0], CartoDbLib.map_centroid[1] ), CartoDbLib.defaultZoom)
    }
  },

  clearSearch: function(){
    if (CartoDbLib.dataLayer)
      CartoDbLib.map.removeLayer( CartoDbLib.dataLayer );
    if (CartoDbLib.centerMark)
      CartoDbLib.map.removeLayer( CartoDbLib.centerMark );
    if (CartoDbLib.circle)
      CartoDbLib.map.removeLayer( CartoDbLib.circle );

    CartoDbLib.map.setView(new L.LatLng( CartoDbLib.map_centroid[0], CartoDbLib.map_centroid[1] ), CartoDbLib.defaultZoom)
  },

  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation;
    
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        CartoDbLib.addrFromLatLng(foundLocation);
      }, null);
    }
    else {
      alert("Sorry, we could not find your location.");
    }
  },
  
  addrFromLatLng: function(latLngPoint) {
    geocoder.geocode({'latLng': latLngPoint}, function(results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $('#search_address').val(results[1].formatted_address);
          $('.hint').focus();
          CartoDbLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },

  getRadDeg: function(dist) {
    var 
    deg  = 180,
    brng = deg * Math.PI / 180,
    dist = dist/6371000,
    lat1 = CartoDbLib.map_centroid[0] * Math.PI / 180,
    lon1 = CartoDbLib.map_centroid[1] * Math.PI / 180;

    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist) + 
               Math.cos(lat1) * Math.sin(dist) * Math.cos(brng));

    var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dist) * Math.cos(lat1), Math.cos(dist) - 
               Math.sin(lat1) * Math.sin(lat2));

    if (isNaN(lat2) || isNaN(lon2)) return null;

    return CartoDbLib.map_centroid[0] - (lat2 * 180 / Math.PI);
  },

  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
    return decodeURIComponent(text);
  }
}