var CartoDbLib = CartoDbLib || {};
var CartoDbLib = {
  map_centroid: [41.87811, -87.66677],
  defaultZoom: 11,
  lastClickedLayer: null,
  locationScope: "chicago",
  currentPinpoint: null,
  layerUrl:
    "https://datamade.carto.com/api/v2/viz/eb3d95da-4490-42e8-9f80-ed43b3f82cd6/viz.json",
  tableName: "second_city_zoning_2023_10_25",

  initialize: function () {
    //reset filters
    $("#search_address").val(
      CartoDbLib.convertToPlainString($.address.parameter("address"))
    );
    $(":checkbox").attr("checked", "checked");

    geocoder = new google.maps.Geocoder();

    // initiate leaflet map
    if (!CartoDbLib.map) {
      CartoDbLib.map = new L.Map("mapCanvas", {
        center: CartoDbLib.map_centroid,
        zoom: CartoDbLib.defaultZoom,
        sa_id: "2nd City Zoning",
      });

      CartoDbLib.streets = L.tileLayer(
        "https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZGF0YW1hZGUiLCJhIjoiaXhhVGNrayJ9.0yaccougI3vSAnrKaB00vA",
        {
          attribution:
            '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>',
          detectRetina: true,
          sa_id: "streets",
        }
      );

      CartoDbLib.satellite = L.tileLayer(
        "https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZGF0YW1hZGUiLCJhIjoiaXhhVGNrayJ9.0yaccougI3vSAnrKaB00vA",
        {
          attribution:
            '<a href="http://www.mapbox.com/about/maps/" target="_blank">Terms &amp; Feedback</a>',
          detectRetina: true,
          sa_id: "satellite",
        }
      );

      CartoDbLib.buildings = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution:
            '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
          detectRetina: true,
          sa_id: "buildings",
        }
      );

      CartoDbLib.baseMaps = {
        Streets: CartoDbLib.streets,
        "Building addresses": CartoDbLib.buildings,
        Satellite: CartoDbLib.satellite,
      };
      CartoDbLib.map.addLayer(CartoDbLib.streets);

      CartoDbLib.info = L.control({ position: "bottomleft" });

      CartoDbLib.info.onAdd = function (map) {
        this._div = L.DomUtil.create("div", "info"); // create a div with a class "info"
        this.update();
        return this._div;
      };

      // method that we will use to update the control based on feature properties passed
      CartoDbLib.info.update = function (props) {
        if (props) {
          var zone_info = CartoDbLib.getZoneInfo(props.zone_class);
          this._div.innerHTML =
            "<img src='/images/icons/" +
            zone_info.zone_icon +
            ".png' /> " +
            props.zone_class +
            " - " +
            zone_info.title;
        } else {
          this._div.innerHTML = "Hover over an area";
        }
      };

      CartoDbLib.info.clear = function () {
        this._div.innerHTML = "";
      };

      CartoDbLib.info.addTo(CartoDbLib.map);

      var fields = "cartodb_id, zone_type, zone_class, ordinance_num";
      var layerOpts = {
        user_name: "datamade",
        type: "cartodb",
        cartodb_logo: false,
        sublayers: [
          {
            sql: "select * from " + CartoDbLib.tableName,
            cartocss: $("#second-city-zoning-styles").html().trim(),
            interactivity: fields,
          },
        ],
      };

      CartoDbLib.dataLayer = cartodb
        .createLayer(CartoDbLib.map, layerOpts, { https: true })
        .addTo(CartoDbLib.map)
        .done(function (layer) {
          var sublayer = layer.getSubLayer(0);
          sublayer.setInteraction(true);
          sublayer.on(
            "featureOver",
            function (e, latlng, pos, data, subLayerIndex) {
              $("#mapCanvas div").css("cursor", "pointer");
              CartoDbLib.info.update(data);
            }
          );
          sublayer.on(
            "featureOut",
            function (e, latlng, pos, data, subLayerIndex) {
              $("#mapCanvas div").css("cursor", "inherit");
              CartoDbLib.info.clear();
            }
          );
          sublayer.on("featureClick", function (e, latlng, pos, data) {
            CartoDbLib.getOneZone(data["cartodb_id"], latlng);
          });

          // after layer is loaded, add the layer toggle control
          L.control
            .layers(
              CartoDbLib.baseMaps,
              { Zoning: layer },
              { collapsed: false, autoZIndex: true }
            )
            .addTo(CartoDbLib.map);

          window.setTimeout(function () {
            if ($.address.parameter("id")) {
              CartoDbLib.getOneZone($.address.parameter("id"));
            }
          }, 500);
        })
        .error(function (e) {
          //console.log('ERROR')
          //console.log(e)
        });
    }

    CartoDbLib.doSearch();
  },

  getZoneInfo: function (zone_class) {
    // console.log("looking up zone_class: " + zone_class);
    // PD and PMD have different numbers for each district. Fix for displaying generic title and link.
    if (zone_class.substring(0, "PMD".length) === "PMD") {
      title = "Planned Manufacturing District";
      description =
        "All kinds of manufacturing, warehouses, and waste disposal. Special service district - not technically a manufacturing district - intended to protect the city's industrial base.";
      zone_class_link = "PMD";
      project_link =
        "https://gisapps.cityofchicago.org/gisimages/zoning_pds/" +
        zone_class.replace(" ", "") +
        ".pdf";
    } else if (zone_class.substring(0, "PD".length) === "PD") {
      title = "Planned Development";
      description =
        "Tall buildings, campuses, and other large developments that must be negotiated with city planners. Developers gain freedom in building design, but must work with city to ensure project serves and integrates with surrounding neighborhood.";
      zone_class_link = "PD";
      project_link =
        "https://gisapps.cityofchicago.org/gisimages/zoning_pds/" +
        zone_class.replace(" ", "") +
        ".pdf";

      //https://gisapps.cityofchicago.org/gisimages/zoning_pds/PD43.pdf
    } else {
      title = ZoningTable[zone_class].district_title;
      description = ZoningTable[zone_class].juan_description;
      zone_class_link = zone_class;
      project_link = "";
    }

    return {
      title: title,
      description: description,
      zone_class_link: zone_class_link,
      zone_icon: CartoDbLib.getZoneIcon(zone_class),
      project_link: project_link,
    };
  },

  getZoneIcon: function (zone_class) {
    var zone_prefix = zone_class.replace(new RegExp("[^A-Z]", "gm"), "");

    var zone_icon = "";
    switch (zone_prefix) {
      case "B":
        zone_icon = "commercial";
        break;
      case "C":
        zone_icon = "commercial";
        break;
      case "M":
        zone_icon = "industrial";
        break;
      case "R":
        zone_icon = "residential";
        break;
      case "RS":
        zone_icon = "residential";
        break;
      case "RT":
        zone_icon = "residential";
        break;
      case "RTA":
        zone_icon = "residential";
        break;
      case "RM":
        zone_icon = "residential";
        break;
      case "PD":
        zone_icon = "government";
        break;
      case "PMD":
        zone_icon = "industrial";
        break;
      case "DX":
        zone_icon = "commercial";
        break;
      case "DC":
        zone_icon = "commercial";
        break;
      case "DR":
        zone_icon = "residential";
        break;
      case "DS":
        zone_icon = "commercial";
        break;
      case "T":
        zone_icon = "trains";
        break;
      case "POS":
        zone_icon = "parks-entertainment";
        break;
    }

    return zone_icon;
  },

  getOneZone: function (cartodb_id, click_latlng) {
    if (CartoDbLib.lastClickedLayer) {
      CartoDbLib.map.removeLayer(CartoDbLib.lastClickedLayer);
    }
    $.address.parameter("id", cartodb_id);
    var sql = new cartodb.SQL({ user: "datamade", format: "geojson" });
    sql
      .execute(
        "select * from " +
          CartoDbLib.tableName +
          " where cartodb_id = {{cartodb_id}}",
        { cartodb_id: cartodb_id }
      )
      .done(function (data) {
        var shape = data.features[0];
        CartoDbLib.lastClickedLayer = L.geoJson(shape);
        CartoDbLib.lastClickedLayer.addTo(CartoDbLib.map);
        CartoDbLib.lastClickedLayer.setStyle({
          weight: 2,
          fillOpacity: 0,
          color: "#000",
        });
        CartoDbLib.map.fitBounds(CartoDbLib.lastClickedLayer.getBounds(), {
          maxZoom: 16,
        });

        // show custom popup
        var props = shape.properties;
        var zone_info = CartoDbLib.getZoneInfo(props.zone_class);
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
          "\
            <small>" +
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
        ";

        if (zone_info.project_link != "")
          popup_content +=
            "<p><a target='_blank' href='" +
            zone_info.project_link +
            "'>Read the full development plan for " +
            props.zone_class +
            "&nbsp;»</a></p>";

        // console.log(click_latlng);
        if (click_latlng) {
          CartoDbLib.popup = L.popup()
            .setContent(popup_content)
            .setLatLng(click_latlng)
            .openOn(CartoDbLib.map);
        } else {
          CartoDbLib.lastClickedLayer.bindPopup(popup_content);
          CartoDbLib.lastClickedLayer.openPopup();
        }
      })
      .error(function (e) {
        console.log(e);
      });
  },

  doSearch: function () {
    CartoDbLib.clearSearch();
    var address = $("#search_address").val();

    if (address != "") {
      if (address.toLowerCase().indexOf(CartoDbLib.locationScope) == -1)
        address = address + " " + CartoDbLib.locationScope;

      geocoder.geocode({ address: address }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
          CartoDbLib.currentPinpoint = [
            results[0].geometry.location.lat(),
            results[0].geometry.location.lng(),
          ];
          $.address.parameter("address", encodeURIComponent(address));
          CartoDbLib.map.setView(
            new L.LatLng(
              CartoDbLib.currentPinpoint[0],
              CartoDbLib.currentPinpoint[1]
            ),
            16
          );
          CartoDbLib.centerMark = new L.Marker(CartoDbLib.currentPinpoint, {
            icon: new L.Icon({
              iconUrl: "/images/blue-pushpin.png",
              iconSize: [32, 32],
              iconAnchor: [10, 32],
            }),
          }).addTo(CartoDbLib.map);

          var sql = new cartodb.SQL({ user: "datamade", format: "geojson" });
          sql
            .execute(
              "select cartodb_id, the_geom from " +
                CartoDbLib.tableName +
                " where ST_Intersects( the_geom, ST_SetSRID(ST_POINT({{lng}}, {{lat}}) , 4326))",
              {
                lng: CartoDbLib.currentPinpoint[1],
                lat: CartoDbLib.currentPinpoint[0],
              }
            )
            .done(function (data) {
              // console.log(data);
              CartoDbLib.getOneZone(
                data.features[0].properties.cartodb_id,
                CartoDbLib.currentPinpoint
              );
            })
            .error(function (e) {
              console.log(e);
            });

          // CartoDbLib.drawCircle(CartoDbLib.currentPinpoint);
        } else {
          alert("We could not find your address: " + status);
        }
      });
    } else {
      //search without geocoding callback
      CartoDbLib.map.setView(
        new L.LatLng(CartoDbLib.map_centroid[0], CartoDbLib.map_centroid[1]),
        CartoDbLib.defaultZoom
      );
    }
  },

  clearSearch: function () {
    if (CartoDbLib.lastClickedLayer) {
      CartoDbLib.map.removeLayer(CartoDbLib.lastClickedLayer);
    }
    if (CartoDbLib.centerMark)
      CartoDbLib.map.removeLayer(CartoDbLib.centerMark);
    if (CartoDbLib.circle) CartoDbLib.map.removeLayer(CartoDbLib.circle);

    CartoDbLib.map.setView(
      new L.LatLng(CartoDbLib.map_centroid[0], CartoDbLib.map_centroid[1]),
      CartoDbLib.defaultZoom
    );
  },

  findMe: function () {
    // Try W3C Geolocation (Preferred)
    var foundLocation;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function (position) {
        foundLocation = new google.maps.LatLng(
          position.coords.latitude,
          position.coords.longitude
        );
        CartoDbLib.addrFromLatLng(foundLocation);
      }, null);
    } else {
      alert("Sorry, we could not find your location.");
    }
  },

  addrFromLatLng: function (latLngPoint) {
    geocoder.geocode({ latLng: latLngPoint }, function (results, status) {
      if (status == google.maps.GeocoderStatus.OK) {
        if (results[1]) {
          $("#search_address").val(results[1].formatted_address);
          $(".hint").focus();
          CartoDbLib.doSearch();
        }
      } else {
        alert("Geocoder failed due to: " + status);
      }
    });
  },

  //converts a slug or query string in to readable text
  convertToPlainString: function (text) {
    if (text == undefined) return "";
    return decodeURIComponent(text);
  },
};
