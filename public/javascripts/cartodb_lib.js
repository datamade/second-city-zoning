var CartoDbLib = CartoDbLib || {};
var CartoDbLib = {

  map_centroid:    [41.87811, -87.66677],
  defaultZoom:     11,
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

    var sql = "SELECT * FROM " + CartoDbLib.tableName + "";

    // change the query for the first layer
    var subLayerOptions = {
      sql: sql,
      interactivity: 'cartodb_id, zone_type, zone_class, ordinance_'
    }

    // console.log(sql);

    CartoDbLib.info = L.control({position: 'bottomright'});

    CartoDbLib.info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
        this.update();
        return this._div;
    };

    // method that we will use to update the control based on feature properties passed
    CartoDbLib.info.update = function (props) {
      this._div.innerHTML = '<h4>Zoned</h4>' +  (props ?
            props.zone_class : 'Hover over an area');
    };

    CartoDbLib.info.addTo(CartoDbLib.map);

    CartoDbLib.dataLayer = cartodb.createLayer(CartoDbLib.map, CartoDbLib.layerUrl)
      .addTo(CartoDbLib.map)
      .on('done', function(layer) {
        layer.getSubLayer(0)
        .set(subLayerOptions)
        .on('featureOver', function(e, latlng, pos, data, subLayerIndex) {
          CartoDbLib.info.update(data);
        });
      }).on('error', function() {
        //log the error
    }); 

    //CartoDbLib.hackLayer = cartodb.createLayer(CartoDbLib.map, CartoDbLib.vizHackUrl).addTo(CartoDbLib.map);

    CartoDbLib.doSearch();
  },

  doSearch: function() {
    CartoDbLib.clearSearch();
    var address = $("#txtSearchAddress").val();

    //-----custom filters-------
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