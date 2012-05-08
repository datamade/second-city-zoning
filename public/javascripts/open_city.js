var OpenCity = OpenCity || {};
OpenCity.Fusion = OpenCity.Fusion || {};
OpenCity.Template = OpenCity.Template || {};
OpenCity.Template.Table = OpenCity.Template.Table || {};
OpenCity.Template.Utility = OpenCity.Template.Utility || {};

OpenCity.Fusion.url = "https://www.google.com/fusiontables/api/query";

OpenCity.Template.FilterControl = function(column, inputType) {
  var control    = this;
  this.column    = column;
  this.inputType = inputType;

  var in_clause = function(elementArray) {
    return (elementArray.length == 0) ?
            "" : control.column + " IN (" + elementArray.join(",") + ")";
  };
  var like_clause = function(element) {
    return ("state CONTAINS IGNORING CASE '" + element.val() + "'");
  }

  this.sql_functions = {};
  this.sql_functions["checkbox"] = function() {
    return in_clause(this.elements.map(function(index, element) {
      if (element.checked) { return "'" + element.value + "'"; }
    }).get());
  };
  this.sql_functions["select"] = function() {
    return in_clause(this.elements.map(function(index, element) {
      if (element.value.trim().length > 0) { return "'" + element.value + "'"; }
    }).get());
  };
  this.sql_functions["text"] = function() {
    return like_clause(this.elements);
  };

  return this;
};
OpenCity.Template.FilterControl.prototype.elements = [];
OpenCity.Template.FilterControl.prototype.sql = function() {
  return this.sql_functions[this.inputType].call(this);
};

OpenCity.Template.FilterPanel = function(tableId, columns, options) {
  if (options["map"] == null) {throw "Map must be provided!";}
  if (options["callbackObject"] == null) {throw "Callback must be provided!";}

  this.map            = options["map"];
  this.callbackObject = options["callbackObject"];
  this.tableId        = tableId;
  this.controls     = [];

  var filterPanel = this;

  $.each(columns, function(index, column) {
    var key = OpenCity.Template.Utility.keys(column)[0];
    filterPanel.addControl(key, column[key]);
  });

  this.options = $.extend({
    selector: "#filters", callbackObject: "filterPanel"
  }, options);
};
OpenCity.Template.FilterPanel.prototype.addControl = function(column, type) {
  this.controls.push(new OpenCity.Template.FilterControl(column, type));
};
OpenCity.Template.FilterPanel.prototype.parseFilterPanel = function(json) {
  var data = {options: []};
  data["column_title"] = json["table"]["cols"][0];

  var control = this.findControl(data["column_title"])
  var filters = $(Mustache.render(OpenCity.Template.Mustache["filter"], data));

  $.each(json["table"]["rows"], function(index, element) {
    if (element[0].toString().trim().length > 0) {
      data["options"].unshift({ value: element[0] });
    }
  });

  var template = OpenCity.Template.Mustache[control.inputType];
  filters.find(".controls").prepend(Mustache.render(template, data));

  $(this.options["selector"]).prepend(filters);

  this.applyEvents();
};
OpenCity.Template.FilterPanel.prototype.findControl = function(column) {
  var found;
  $(this.controls).each(function(index, control) {
    if (found != null) { return false; }
    if (control.column == column) { found = control; }
  });
  return found;
};
OpenCity.Template.FilterPanel.prototype.drawFilter = function(type) {
};
OpenCity.Template.FilterPanel.prototype.present = function() {
  var tableId     = this.tableId;
  var callback    = this.options["callbackObject"];

  $.each(this.controls, function(index, control) {
    var querystring = {};
    var pairs       = [];

    querystring["sql"] = "SELECT+"+control.column+",COUNT()+FROM+"+tableId+"+GROUP+BY+"+control.column+"+ORDER+BY+"+control.column+"+DESC";
    querystring["jsonCallback"] = callback+".parseFilterPanel";

    $.each(OpenCity.Template.Utility.keys(querystring), function(index, key) {
      pairs.push(key+"="+querystring[key]);
    });

    $.ajax({url: OpenCity.Fusion.url+"?"+pairs.join("&"), dataType: "jsonp"});
  });
};
OpenCity.Template.FilterPanel.prototype.wherePredicate = function() {
  return $.map(this.controls, function(control, index) {
    if (control.inputType != "text") {
      var sql = control.sql();

      if (sql.trim().length > 0) { return sql; }
    }
  }).join(" AND ");
};
OpenCity.Template.FilterPanel.prototype.applyEvents = function() {
  var filter = this;

  $.each(this.controls, function(index, control) {
    var selector;
    if (control.inputType == "checkbox") {
      selector = "input[type=checkbox]";
    } else if (control.inputType == "select") {
      selector = "select";
    } else if (control.inputType == "text") {
      selector = "input[type=text]";
    }
    control.elements = $(".filter ." + control.column + " .controls " + selector);

    if (control.inputType == "checkbox") {
      control.elements.click(function() {
        filter.map.layers[0].setOptions({
          query: {select: "Latitude", from: filter.tableId, where: filter.wherePredicate()}
        });
      });
    } else if (control.inputType == "select") {
      control.elements.change(function() {
        filter.map.layers[0].setOptions({
          query: {select: "Latitude", from: filter.tableId, where: filter.wherePredicate()}
        });
      });
    } else if (control.inputType == "text") {
      control.elements.keyup(function() {
        filter.map.layers[0].setOptions({
          query: {select: "Latitude", from: filter.tableId, where: control.sql()}
        });
      });
    }

  });
}

OpenCity.Template.Utility.keys = function(hash) {
  var keys = [];
  for (var i in hash) if (hash.hasOwnProperty(i)) {
    keys.push(i);
  };
  return keys;
};

OpenCity.Template.Mustache = OpenCity.Template.Mustache || {};
OpenCity.Template.Mustache["filter"] = "\
<div class=\"filter\">\
  <h2>{{column_title}}</h2>\
  <div class=\"control-group {{column_title}}\">\
    <div class=\"controls\">\
    </div>\
  </div>\
</div>\
";
OpenCity.Template.Mustache["checkbox"] = "\
{{#options}}\
<label class=\"checkbox inline\">\
  <input type=\"checkbox\" value=\"{{value}}\"/>\
  {{value}}\
</label>\
{{/options}}\
";
OpenCity.Template.Mustache["select"] = "\
<label class=\"select inline\">\
  <select>\
    <option value=\"\">Select a {{column_title}}</option>\
    {{#options}}\
    <option value=\"{{value}}\">{{value}}</option>\
    {{/options}}\
  </select>\
</label>\
";
OpenCity.Template.Mustache["text"] = "\
<div class=\"input-append\">\
  <input class=\"span8\" style=\"float: left;\" size=\"16\" type=\"text\">\
  <button class=\"btn\" type=\"button\">Search</button>\
</div>\
";
