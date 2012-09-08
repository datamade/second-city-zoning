/*!
 * Searchable Map Template with Google Fusion Tables
 * http://derekeder.com/searchable_map_template/
 *
 * Copyright 2012, Derek Eder
 * Licensed under the MIT license.
 * https://github.com/derekeder/FusionTable-Map-Template/wiki/License
 *
 * Date: 5/2/2012
 * 
 */

var MapsLib = MapsLib || {};
var MapsLib = {
  
  //Setup - put your Fusion Table details here
  fusionTableId:      "1HmI6PT0q7rFbEXDfEt2VTbFyZVLZn__58AUe86E",        //the encrypted Table ID of your Fusion Table (found under File => About)
  zoneDescriptionId:  "1r2vtU4il89uXmlcqAjGs72sjSXN-zuuS2vtnLu0",
  googleApiKey:       "AIzaSyAcsnDc7_YZskPj4ep3jT_fkpB3HI_1a98",        //*NEW* API key. found at https://code.google.com/apis/console/
  locationColumn:     "geometry",     //name of the location column in your Fusion Table
  map_centroid:       new google.maps.LatLng(41.8781136, -87.66677856445312), //center that your map defaults to
  locationScope:      "chicago",      //geographical area appended to all address searches
  recordName:         "zoning area",       //for showing number of results
  recordNamePlural:   "zoning areas", 
  
  searchRadius:       1,            //in meters ~ 1/2 mile
  defaultZoom:        13,             //zoom level when map is loaded (bigger is more zoomed in)
  addrMarkerImage: 'http://derekeder.com/images/icons/blue-pushpin.png',
  infoWindow: null,
  currentPinpoint: null,
  
  initialize: function() {
    $( "#resultCount" ).html("");
  
    geocoder = new google.maps.Geocoder();
    var myOptions = {
      zoom: MapsLib.defaultZoom,
      center: MapsLib.map_centroid,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      styles: [
        {
          stylers: [
            { saturation: -100 },
            { lightness: 40 }
          ]
        }
      ]
    };
    map = new google.maps.Map($("#mapCanvas")[0],myOptions);
    
    MapsLib.searchrecords = null;
    $("#txtSearchAddress").val(MapsLib.convertToPlainString($.address.parameter('address')));
    $(":checkbox").attr("checked", "checked");
    
    //default search shows all points on map, but doesn't list results 
    $("#resultCount").hide();
     
    MapsLib.doSearch();
  },
  
  doSearch: function(location) {
    MapsLib.clearSearch();
    var address = $("#txtSearchAddress").val();

    var whereClause = MapsLib.locationColumn + " not equal to ''";
    
    var searchType = "ZONE_TYPE IN (-1,";
    if ( $("#cbZone1").is(':checked')) searchType += "1,2,7,8,10,";
    if ( $("#cbZone3").is(':checked')) searchType += "3,6,";
    if ( $("#cbZone4").is(':checked')) searchType += "4,9,";
    if ( $("#cbZone5").is(':checked')) searchType += "5,";
    if ( $("#cbZone11").is(':checked')) searchType += "11,";
    if ( $("#cbZone12").is(':checked')) searchType += "12,";
    whereClause += " AND " + searchType.slice(0, searchType.length - 1) + ")";
    
    if (address != "") {
      if (address.toLowerCase().indexOf(MapsLib.locationScope) == -1)
        address = address + " " + MapsLib.locationScope;
  
      geocoder.geocode( { 'address': address}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          MapsLib.currentPinpoint = results[0].geometry.location;
          
          $.address.parameter('address', encodeURIComponent(address));
          map.setCenter(MapsLib.currentPinpoint);
          map.setZoom(16);
          
          MapsLib.addrMarker = new google.maps.Marker({
            position: MapsLib.currentPinpoint, 
            map: map, 
            icon: MapsLib.addrMarkerImage,
            animation: google.maps.Animation.DROP,
            title:address
          });

          addressWhereClause = " AND ST_INTERSECTS(" + MapsLib.locationColumn + ", CIRCLE(LATLNG" + MapsLib.currentPinpoint.toString() + "," + MapsLib.searchRadius + "))";
          
          MapsLib.submitSearch(whereClause, addressWhereClause, map, MapsLib.currentPinpoint);
        } 
        else {
          alert("We could not find your address: " + status);
        }
      });
    }
    else { //search without geocoding callback
      MapsLib.submitSearch(whereClause, "", map);
    }
  },
  
  submitSearch: function(whereClause, addressWhereClause, map, location) {
    //get using all filters
    MapsLib.searchrecords = new google.maps.FusionTablesLayer({
      query: {
        from:   MapsLib.fusionTableId,
        select: MapsLib.locationColumn,
        where:  whereClause
      },
      suppressInfoWindows: true
    });

    if (location) {
      MapsLib.getInfoWindowContent(whereClause + addressWhereClause);
      MapsLib.query(MapsLib.locationColumn, whereClause + addressWhereClause, MapsLib.fusionTableId, "MapsLib.drawResultPolygon");
    }

    MapsLib.searchrecords.setMap(map);
    MapsLib.enableMapTips();
    
    //override default info window
    google.maps.event.addListener(MapsLib.searchrecords, 'click', 
      function(e) { 
        if (MapsLib.infoWindow) MapsLib.infoWindow.close();
        MapsLib.openFtInfoWindow(e.latLng, e.row['ZONE_TYPE'].value, e.row['ZONE_CLASS'].value, e.row['ORDINANCE_'].value, e.row['ORDINANCE1'].value);
      }
    ); 
  },

  drawResultPolygon: function(data) {
    //console.log(data);
    var rows = data["rows"];
    for (var i in rows) {
      var newCoordinates = [];
      var geometries = rows[0][0]['geometries'];
      //console.log(geometries);
      if (geometries) {
        for (var j in geometries) {
          //console.log(geometries[j]);
          newCoordinates.push(MapsLib.constructNewCoordinates(geometries[j]));
        }
      } else {
        //console.log("returning one geometry");
        newCoordinates = MapsLib.constructNewCoordinates(rows[0][0]['geometry']);
      }
      var randomnumber = Math.floor(Math.random() * 4);
      var zone = new google.maps.Polygon({
        paths: newCoordinates,
        strokeColor: "#333333",
        strokeOpacity: 1,
        strokeWeight: 3,
        fillOpacity: 0
      });

      zone.setMap(map);
    }
  },

  constructNewCoordinates: function(polygon) {
    //console.log(polygon);
    var newCoordinates = [];
    var coordinates = polygon['coordinates'][0];
    for (var i in coordinates) {
      newCoordinates.push(
          new google.maps.LatLng(coordinates[i][1], coordinates[i][0]));
    }
    return newCoordinates;
  },

  openFtInfoWindow: function(position, zone_type, zone_class, ordinance, ordinance_date) {
    // Set up and create the infowindow
    if (!MapsLib.infoWindow) MapsLib.infoWindow = new google.maps.InfoWindow({});
     
    var content = "<div class='googft-info-window' style='font-family: sans-serif'>";
    content += "<span class='lead'>" + ZoningDict[zone_type - 1] + "</span>"
    content += "<p>Zoned <a href='zones#" + MapsLib.createZoneSlug(zone_class) + "'>" + zone_class + "</a>"
    //content += '<br /><br /><!-- description -->';
    if (ordinance != "" && ordinance != undefined) 
      content += "<br /><br />Ordinance: " + ordinance
    if (ordinance_date != "" && ordinance_date != undefined) 
      content += "<br />Ordinance date: " + ordinance_date
    content += '</p>';
    content += '</div>';
    
    MapsLib.infoWindow.setOptions({
      content: content,
      pixelOffset: null,
      position: position
    });
    // Infowindow-opening event handler
    MapsLib.infoWindow.open(map);
    //MapsLib.getInfoWindowDescription(zone_class);
  },
  
  getInfoWindowContent: function(whereClause) {
    var selectColumns = "ZONE_TYPE, ZONE_CLASS, ORDINANCE_, ORDINANCE1";
    MapsLib.query(selectColumns, whereClause, MapsLib.fusionTableId, "MapsLib.setInfoWindowContent");
  },
  
  setInfoWindowContent: function(json) { 
    var data = json["rows"];
    MapsLib.openFtInfoWindow(MapsLib.currentPinpoint, data[0][0], data[0][1], data[0][2], data[0][3])
  },
  
  getInfoWindowDescription: function(zone_class) {
    var selectColumns = "'New Code', Description";
    MapsLib.query(selectColumns, "'New Code' = '" + MapsLib.createZoneSlug(zone_class) + "'", MapsLib.zoneDescriptionId, "MapsLib.setInfoWindowDescription");
  },
  
  setInfoWindowDescription: function(json) { 
    var data = json["rows"];
    MapsLib.infoWindow.setContent(MapsLib.infoWindow.getContent().replace("<br /><!-- description -->", data[0][1]));
  },

  enableMapTips: function () {
    MapsLib.searchrecords.enableMapTips({
      select: 'ZONE_TYPE, ZONE_CLASS',
      from: MapsLib.fusionTableId,
      geometryColumn: MapsLib.locationColumn,
      delay: 100
    });
  },
  
  clearSearch: function() {
    if (MapsLib.searchrecords != null)
      MapsLib.searchrecords.setMap(null);
    if (MapsLib.addrMarker != null)
      MapsLib.addrMarker.setMap(null);  
    if (MapsLib.searchRadiusCircle != null)
      MapsLib.searchRadiusCircle.setMap(null);
  },
  
  findMe: function() {
    // Try W3C Geolocation (Preferred)
    var foundLocation;
    
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        foundLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
        MapsLib.addrFromLatLng(foundLocation);
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
          $('#txtSearchAddress').val(results[1].formatted_address);
          $('.hint').focus();
          MapsLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },
  
  query: function(selectColumns, whereClause, tableId, callback) {
    var queryStr = [];
    queryStr.push("SELECT " + selectColumns);
    queryStr.push(" FROM " + tableId);
    queryStr.push(" WHERE " + whereClause);
  
    var sql = encodeURIComponent(queryStr.join(" "));
    $.ajax({url: "https://www.googleapis.com/fusiontables/v1/query?sql="+sql+"&callback="+callback+"&key="+MapsLib.googleApiKey, dataType: "jsonp"});
  },
  
  createZoneSlug: function(text) {
    if (text == undefined) return '';
    
    if (text.indexOf("PMD") != -1)
      return "PMD";
    if (text.indexOf("PD") != -1)
      return "PD";
      
  	return (text+'').replace(/ /g,'-').replace(/[^\w-]+/g,'');
  },
  
  //converts text to a formatted query string
  convertToQueryString: function(text) {
  	if (text == undefined) return '';
  	return encodeURI(text);
  },
  
  //converts a slug or query string in to readable text
  convertToPlainString: function(text) {
    if (text == undefined) return '';
  	return decodeURIComponent(text);
  }
}

// Hack for fusion tables tiles not loading
/*
setTimeout(function() {
  console.log("refetching map tiles");
  $("img[src*='googleapis']").each(function(){
    $(this).attr("src",$(this).attr("src")+"&"+(new Date()).getTime());
  });
},3000);
*/