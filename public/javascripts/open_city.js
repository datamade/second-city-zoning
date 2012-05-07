var OpenCity = OpenCity || {};
OpenCity.Fusion = OpenCity.Fusion || {};
OpenCity.Template = OpenCity.Template || {};
OpenCity.Template.Table = OpenCity.Template.Table || {};

OpenCity.Fusion.url = "https://www.google.com/fusiontables/api/query";

OpenCity.Template.FilterPredicate = function(column, type) {
  this.column = column;
  this.type   = "checkbox";
};
OpenCity.Template.FilterPredicate.prototype.elements = [];
OpenCity.Template.FilterPredicate.prototype.sql = function() {
  var elementArray = this.elements.map(function(index, element) {
    if (element.checked) {
      return "'" + element.value + "'";
    }
  }).get();
  return (elementArray.length == 0) ? "" : this.column + " IN (" + elementArray.join(",") + ")";
};

OpenCity.Template.FilterPanel = function(tableId, columns, options) {
  if (options["map"] == null) {throw "Map must be provided!";}
  if (options["callbackObject"] == null) {throw "Callback must be provided!";}

  this.map            = options["map"];
  this.callbackObject = options["callbackObject"];
  this.tableId        = tableId;
  this.predicates     = [];
  var predicates      = this.predicates;

  $.each(columns, function(index, column) {
    predicates.push(new OpenCity.Template.FilterPredicate(column));
  });

  this.options = $.extend({
    selector: "#filters", callbackObject: "filterPanel"
  }, options);
};
OpenCity.Template.FilterPanel.prototype.parseFilterPanel = function(json) {
  var data = {};

  data["column_title"] = json["table"]["cols"][0];
  data["column_rows"] = [];

  $.each(json["table"]["rows"], function(index, element) {
    if (element[0].toString().trim().length > 0) {
      data["column_rows"].push({"value": element[0]});
    }
  });

  var mustache = Mustache.render(OpenCity.Template.Mustache["filter"], data);
  $(this.options["selector"]).prepend(mustache);

  this.applyEvents(data);
};
OpenCity.Template.FilterPanel.prototype.present = function() {
  var tableId     = this.tableId;
  var callback    = this.options["callbackObject"];

  $.each(this.predicates, function(index, predicate) {
    var querystring = {};
    var keys        = [];
    var pairs       = [];

    querystring["sql"] = "SELECT+"+predicate.column+",COUNT()+FROM+"+tableId+"+GROUP+BY+"+predicate.column;
    querystring["jsonCallback"] = callback+".parseFilterPanel";

    for (var i in querystring) if (querystring.hasOwnProperty(i)) {
      keys.push(i);
    };

    $.each(keys, function(index, key) {
      pairs.push(key+"="+querystring[key]);
    });

    $.ajax({url: OpenCity.Fusion.url+"?"+pairs.join("&"), dataType: "jsonp"});
  });
};
OpenCity.Template.FilterPanel.prototype.wherePredicate = function() {
  return $.map(this.predicates, function(predicate, index) {
    var sql = predicate.sql();

    if (sql.trim().length > 0) {
      return sql;
    }
  }).join(" AND ");
};
OpenCity.Template.FilterPanel.prototype.applyEvents = function(data) {
  var filter = this;

  $.each(this.predicates, function(index, predicate) {
    predicate.elements = $(".filter ." + predicate.column + " .controls input");

    predicate.elements.click(function() {
      filter.map.layers[0].setOptions({
        query: {select: "Latitude", from: filter.tableId, where: filter.wherePredicate()}
      });
    });
  });
}

OpenCity.Template.Mustache = OpenCity.Template.Mustache || {};
OpenCity.Template.Mustache["filter"] = "\
<div class=\"filter\">\
  <h2>{{column_title}}</h2>\
  <div class=\"control-group {{column_title}}\">\
    <div class=\"controls\">\
      {{#column_rows}}\
      <label class=\"checkbox inline\">\
        <input type=\"checkbox\" value=\"{{value}}\"/>\
        {{value}}\
      </label>\
      {{/column_rows}}\
    </div>\
  </div>\
</div>\
";
