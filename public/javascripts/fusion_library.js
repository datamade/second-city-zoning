var Fusion = Fusion || {};

Fusion.Map = function(selector, options) {
  this.selector = selector;
  this.layers = [];
  this.options = options;

  var layers_prototype = this.layers.constructor.prototype;
  var map = this;

  layers_prototype.create = function(query, options) {
    var options = $.extend({
      suppressInfoWindows: false,
      query: query
    }, options);

    var layer = new google.maps.FusionTablesLayer(options);

    layer.constructor.prototype.toggle = function() {
      this.setMap(this.getMap() == null ? map.page_element : null);
    };

    this.push(layer);
    return layer;
  };

  layers_prototype.default_options = function(options) {
    return $.extend({
      zoom: 10,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: false,
      streetViewControl: false,
      suppressInfoWindows: false
    }, (typeof options !== 'undefined' ? options : {}));
  };

//  this.add_map_bounds = function(query_hash, callback) {
//    var fusion_query = Fusion.Query.create(query_hash);
//    new google.visualization.Query("http://www.google.com/fusiontables/gvizdata?tq="+fusion_query).send(callback);
//  }
//
//  this.set_map_bounds = function(response) {
//    if (response.getDataTable().getNumberOfRows() > 0) {
//      var map_bounds = new google.maps.LatLngBounds();
//      var kml = response.getDataTable().getValue(0, 0);
//      kml = kml.replace("<Polygon><outerBoundaryIs><LinearRing><coordinates>", "");
//      kml = kml.replace("</coordinates></LinearRing></outerBoundaryIs></Polygon>", "");
//      var boundPoints = kml.split(" ");
//
//      $.each(boundPoints, function(index, value) {
//        var boundItem = value.split(",");
//        var point = new google.maps.LatLng(parseFloat(boundItem[1]), parseFloat(boundItem[0]));
//        map_bounds.extend(point);
//      });
//
//      this.page_element.fitBounds(map_bounds);
//    }
//  }

  return this;
};
Fusion.Map.prototype.page_element = null;
Fusion.Map.prototype.present = function() {
  options = this.layers.default_options(this.options);

  var page_element = new google.maps.Map(document.getElementById(this.selector), options);
  this.page_element = page_element;
  this.page_element.setOptions({styles: Fusion.Map.StyleArray()});

  $.each(this.layers, function(index, item) {
    item.setMap(page_element);
  });
  return this;
}

Fusion.Map.constructor.prototype.default_options = function(options) {
  return $.extend({
    zoom: 10,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: false,
    streetViewControl: false,
    suppressInfoWindows: false
  }, (typeof options !== 'undefined' ? options : {}));
}

Fusion.Map.constructor.prototype.Style = function(type, options) {
  var style = {
    featureType: type,
    stylers: []
  }

  var stylers = [];
  $.each(options, function(key, value) {
    var hash = {}; hash[key] = value;
    stylers.push(hash);
  });
  style["stylers"] = stylers;

  return style;
};
Fusion.Map.constructor.prototype.StyleArray = function(options) {
  var styles = [];

  styles.push(new Fusion.Map.Style("road", {visibility: "off", saturation: -100}));
  styles.push(new Fusion.Map.Style("landscape", {lightness: 75, saturation: -100}));
  styles.push(new Fusion.Map.Style("transit", {visibility: "off"}));
  styles.push(new Fusion.Map.Style("poi", {lightness: 60, saturation: -100}));
  styles.push(new Fusion.Map.Style("water", {hue: "#00b2ff"}));

  return styles;
};

Fusion.Query = function(hash) {
  query = [];
  query.push("SELECT " + ((typeof hash["select"] != "undefined") ? hash["select"] : "geometry"));
  query.push("FROM " + hash["from"]);

  if (hash["where"]) {
    query.push("WHERE " + hash["where"]);
  }

  return encodeURIComponent(query.join(" "));
};

