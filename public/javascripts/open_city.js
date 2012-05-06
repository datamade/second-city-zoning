var OpenCity = OpenCity || {};
OpenCity.Template = OpenCity.Template || {};

OpenCity.Template.Filter = function(tableId, column, options) {
  this.tableId = tableId;
  this.column  = column;

  if (options["map"] == null) {
    throw "Map must be provided!";
  };

  OpenCity.Template.Filter.selector = $.extend({
    selector: "#filter"
  }, options);
};
OpenCity.Template.Filter.options = {selector: "#filters"};
OpenCity.Template.Filter.parseFilter = function(json) {
  var data = {};

  data["column_title"] = json["table"]["cols"][0];
  data["column_rows"] = [];

  $.each(json["table"]["rows"], function(index, element) {
    data["column_rows"].push({"value": element[0]});
  });

  var mustache = Mustache.render(OpenCity.Template.Mustache["filter"], data);
  $(OpenCity.Template.Filter.options["selector"]).prepend(mustache);

  OpenCity.Template.Filter.applyEvents(data);
};
OpenCity.Template.Filter.prototype.present = function() {
  var uri = "https://fusiontables.googleusercontent.com/fusiontables/api/query"

  var querystring = {};
  var keys = [];
  var pairs = [];

  querystring["sql"] = "SELECT+"+this.column+",COUNT()+FROM+"+this.tableId+"+GROUP+BY+"+this.column;
  querystring["jsonCallback"] = "OpenCity.Template.Filter.parseFilter";

  for (var i in querystring) if (querystring.hasOwnProperty(i)) {
    keys.push(i);
  };

  $.each(keys, function(index, key) {
    pairs.push(key+"="+querystring[key]);
  });

  $.ajax({url: uri+"?"+pairs.join("&"), dataType: 'jsonp'});
};
OpenCity.Template.Filter.applyEvents = function(data) {
  var data_inputs = $("." + data["column_title"] + " .controls input");
  data_inputs.click(function() {
    var where_predicate = data_inputs.map(function(index, element) {
      if (element.checked) {
        return data["column_title"]+" = '" + element.value + "'";
      }
    }).get();

    if (where_predicate.length == 0) {
      where_predicate.push(data["column_title"]+" = 'not-earth'");
    }

    map.layers[0].setOptions({
      query: {select: "latitude", from: "3793626", where: where_predicate.join(" or ")}
    });
  });
}

OpenCity.Template.Mustache = OpenCity.Template.Mustache || {};
OpenCity.Template.Mustache["filter"] = "\
<h2>{{column_title}}</h2>\
<div class=\"control-group {{column_title}}\">\
  <div class=\"controls\">\
    {{#column_rows}}\
    <label class=\"checkbox inline\">\
      <input type=\"checkbox\" checked=\"checked\" value=\"{{value}}\"/>\
      {{value}}\
    </label>\
    {{/column_rows}}\
  </div>\
</div>\
";
