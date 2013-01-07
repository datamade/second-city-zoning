/**
 * @name Fusion Tips
 * @author: Nianwei Liu [nianwei at gmail dot com]
 * @fileoverview This library allows MapTip and fires mouseover/mouseout event for FusionTableLayers.
 * It uses mouse cursor tracking and pause delay to trigger FusionTableQuery.
 * It is not true mouseover event, but should suit most use cases.
 *
 */
(function() {
  /*jslint browser:true */
  /*global google */
  function FusionTipOverlay(opts) {
    opts = opts || {};
    this.latlng_ = null;
    this.text_ = null;
    this.div_ = null;
    this.cursorNode = null;
    this.style_ = opts.style || {};
  }
  FusionTipOverlay.prototype = new google.maps.OverlayView();
  FusionTipOverlay.prototype.onAdd = function() {
    var div = document.createElement('DIV');
    div.style.border = "1px solid #999999";
	div.style.opacity = ".85";
    div.style.position = "absolute";
    div.style.whiteSpace = "nowrap";
    div.style.backgroundColor = "#ffffff";
    div.style.fontSize = '13px';
    div.style.padding = '10px';
    div.style.fontWeight = 'bold';
    div.style.margin = '10px';
    div.style.lineHeight = '1.3em';
    div.style.visibility = "hidden";
    if (this.style_) {
      for (var x in this.style_) {
        if (this.style_.hasOwnProperty(x)) {
          div.style[x] = this.style_[x]
        }
      }
    }
    this.div_ = div;
    var panes = this.getPanes();
    this.cursorNode = panes.overlayLayer.parentNode;
    panes.floatPane.appendChild(div);
    google.maps.event.trigger(this, 'ready');
  };
  FusionTipOverlay.prototype.draw = function() {
    var overlayProjection = this.getProjection();
    if (this.latlng_) {
      var sw = overlayProjection.fromLatLngToDivPixel(this.latlng_);
      var div = this.div_;
      div.style.left = sw.x + 'px';
      div.style.top = (sw.y - 20) + 'px';
      div.innerHTML = this.text_;
    }
    
  };
  FusionTipOverlay.prototype.onRemove = function() {
    this.div_.parentNode.removeChild(this.div_);
    this.div_ = null;
  };
  FusionTipOverlay.prototype.hide = function() {
    if (this.div_) {
      this.div_.style.visibility = "hidden";
    }
  };
  FusionTipOverlay.prototype.show = function(latlng, text) {
    if (this.div_) {
      this.div_.style.visibility = "visible";
    }
    if (latlng || text) {
      this.latlng_ = latlng || this.latlng_;
      this.text_ = text;
      this.draw();
    }
  };
  
  //http://www.quirksmode.org/js/findpos.html
  function findElPos(obj) {
    var curleft = 0;
    var curtop = 0;
    if (obj.offsetParent) {
      do {
        curleft += obj.offsetLeft;
        curtop += obj.offsetTop;
        obj = obj.offsetParent;
      } while (obj != null);
    }
    return {
      x: curleft,
      y: curtop
    };
  }
  function findMousePos(e) {
    var posx = 0;
    var posy = 0;
    if (!e) 
      var e = window.event;
    if (e.pageX || e.pageY) {
      posx = e.pageX;
      posy = e.pageY;
    } else if (e.clientX || e.clientY) {
      posx = e.clientX + document.body.scrollLeft +
      document.documentElement.scrollLeft;
      posy = e.clientY + document.body.scrollTop +
      document.documentElement.scrollTop;
    }
    // posx and posy contain the mouse position relative to the document
    // Do something with this information
    return {
      x: posx,
      y: posy
    };
  }
  //http://www.quirksmode.org/dom/getstyles.html
  function getStyle(el, styleProp) {
    if (el.style[styleProp]) {
      return el.style[styleProp];
    } else if (el.getComputedStyle) {
      return el.getComputedStyle()[styleProp];
    } else if (el.currentStyle) {
      return el.currentStyle[styleProp];
    } else if (window.getComputedStyle) {
      return document.defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
    }
    return null;
  }
  
  function isSameRow(row1, row2) {
    if (row2 == null) 
      return false;
    for (var x in row1) {
      if (row1.hasOwnProperty(x)) {
        if (!row2[x] || row2[x].value != row1[x].value) 
          return false;
      }
    }
    return true;
  }
  var scriptid = 0;
  /**
   * @name MapTipOptions
   * @class This class represents the optional parameter passed into <code>google.maps.FusionTablesLayer.enableMapTips</code>.
   * @property {String} [select] required. list of columns (by comma) to query, typically need only one column. e.g "'Store Name','Address'"
   * @property {String} [from] required. fusion table id.
   * @property {String} [geometryColumn] required. fusion table's geometry column name.
   * @property {bool} [suppressMapTips] optional, whether to show map tips. default false
   * @property {number} [delay] optional. milliseconds mouse pause before send a server query. default 500.
   * @property {number} [tolerance] required. tolerance in pixel around mouse. default is 6.
   * @property {Object} [style] optional. the css style of map tip.
   */
  /**
   * @name google.maps.FusionTablesLayer
   * @class These are new methods added to the Google Maps API's
   * <a href  = 'http://code.google.com/apis/maps/documentation/javascript/reference.html#FusionTablesLayer'>FusionTablesLayer</a>
   * class.
   */
  /**
   * Enable map tips for the fusion layer. The user can hover over a fusion feature, pause for a small time, then get a map tip.
   * @param {MapTipOptions} opts
   */
  google.maps.FusionTablesLayer.prototype.enableMapTips = function(opts) {
    opts = opts || {};
    
    var maptip = new FusionTipOverlay(null, null);
    var me = this;
    var currentLatLng = null;
    var currentCursor = null;
    var currentRow = null;
    var delayTimeout = null;
    var queryPending = false;
    var containerPos = findElPos(me.getMap().getDiv());
    var tol = opts.tolerance || 6;
    google.maps.event.addListenerOnce(maptip, 'ready', function() {
      // map.mousemove may not fire consistently, so we calc latlng from DOM events
      me.mousemoveListener_ = google.maps.event.addDomListener(me.getMap().getDiv(), 'mousemove', function(evt) {
        if (delayTimeout) {
          window.clearTimeout(delayTimeout);
          delayTimeout = null;
        }
        var c = getStyle(maptip.cursorNode, 'cursor');
        if (c != currentCursor && currentCursor == 'pointer') {
          google.maps.event.trigger(me, 'mouseout', {
            row: currentRow
          });
          //console.debug('set currentrow null, currentCusor:' + currentCursor + 'new ' + c);
          currentRow = null;
          maptip.hide();
        } else if (c == 'pointer' && !queryPending && !delayTimeout) {
          // for polygons, features may change while cursor not.
          var mousePos = findMousePos(evt);
          var containerPx = new google.maps.Point(mousePos.x - containerPos.x, mousePos.y - containerPos.y);
          currentLatLng = maptip.getProjection().fromContainerPixelToLatLng(containerPx);
          delayTimeout = window.setTimeout(queryFusion, opts.delay || 400);
        }
        currentCursor = c;
      });
    });
    maptip.setMap(this.getMap());
    this.maptipOverlay_ = maptip;
    
    
    
    function queryFusion() {
      if (queryPending) 
        return;
      var latlng = currentLatLng;
      var prj = maptip.getProjection();
      var px = prj.fromLatLngToDivPixel(latlng);
      px.x -= tol;
      px.y += tol;
      var sw = prj.fromDivPixelToLatLng(px);
      px.x += tol * 2;
      px.y -= tol * 2;
      var ne = prj.fromDivPixelToLatLng(px);
      var bounds = new google.maps.LatLngBounds(sw, ne);
      var swhere = "ST_INTERSECTS(" + opts.geometryColumn + ",RECTANGLE(LATLNG(" + bounds.getSouthWest().lat() + "," + bounds.getSouthWest().lng() + "),LATLNG(" + bounds.getNorthEast().lat() + "," + bounds.getNorthEast().lng() + ")))";
      var queryText = encodeURIComponent("SELECT " + opts.select + " FROM " + opts.from + " WHERE " + swhere);
      queryPending = true;
      queryFusionJson(latlng, queryText);
    }
    
    // IE does not like delete window[sid], so create a name space here.
    window.fusiontips = window.fusiontips||{};
    
    //copied from http://gmaps-samples.googlecode.com/svn/trunk/fusiontables/mouseover.html
    // undocumented unsupported method;
    function queryFusionJson(latlng, queryText) {
      var script = document.createElement('script');
      // Note that a simplified geometry and the NAME column are being requested
      //http://www.google.com/fusiontables/api/query?sql=
      var sid = 'query_' + scriptid++;
      script.setAttribute('src', 'https://www.googleapis.com/fusiontables/v1/query?sql=' + queryText + '&callback=fusiontips.' + sid + '&key=' + opts.googleApiKey + "&typed=false");
      //script.setAttribute('src', 'http://fusiontables.googleusercontent.com/fusiontables/api/query?sql=' + queryText + '&jsonCallback=fusiontips.' + sid);
      window.fusiontips[sid] = function(json) {
        delete window.fusiontips[sid];
        queryPending = false;
        processFusionJson(json, latlng);
      };
      document.getElementsByTagName('head')[0].appendChild(script);
    }
    
    function processFusionJson(json, latlng) {
      //{table:{cols:[col1,col2], rows:[[val11,val12],[val21,val22]]}};
      var data = json;
      html = "";
      var row = null;
      if (data) {
        var numRows = data.rows.length;
        var numCols = data.columns.length;
        if (numRows > 0) {
          row = {};
          
          html += data.rows[0][0] + "<br/>";
          html += data.rows[0][1] + "<br/>";
          html += ZoningDict[data.rows[0][2] - 1] + "<br/>";

          for (i = 0; i < numCols; i++) {
            var cell = {
              columnName: data.columns[i],
              value: data.rows[0][i]
            };
            row[data.columns[i]] = cell;
          }
        }
        
      } else {
        if (console) 
          console.log('no data');
      }
      fireEvents(html, latlng, row);
      
    }
    function fireEvents(html, latlng, row) {
      if (!opts.suppressMapTips && maptip && latlng && html) {
        maptip.show(latlng, html);
      }
      if (row && !isSameRow(row, currentRow)) {
        // this would apply to polys where there is no mouse cursor change between adj polys
        if (currentRow) {
          /**
           * This event is fired when the mouse out of a fusion feature.
           * @name google.maps.FusionTablesLayer#mouseout
           * @event
           */
          google.maps.event.trigger(me, 'mouseout', {
            row: currentRow
          });
        }
        /**
         * This event is fired when the mouse over a fusion feature. Contains: infoWindowHtml, latLng, row.
         * @name google.maps.FusionTablesLayer#mouseover
         * @param {FusionTablesMouseEvent} mouseevent
         * @event
         */
        google.maps.event.trigger(me, 'mouseover', {
          infoWindowHtml: html,
          latLng: latlng,
          row: row
        }); 
      }
      currentRow = row;
    }
    
  };
  /**
   * Disable map tips for the fusion layer.
   */
  google.maps.FusionTablesLayer.prototype.disableMapTips = function() {
    this.maptipOverlay_.setMap(null);
    this.maptipOverlay_ = null;
    google.maps.event.removeListener(this.mousemoveListener_);
    this.mousemoveListener_ = null;
  };
  // cleanup
  var _setMap_ = google.maps.FusionTablesLayer.prototype.setMap;
  /**
   * @private
   * @param {Object} map
   */
  google.maps.FusionTablesLayer.prototype.setMap = function(map) {
    if (map == null) {
      this.disableMapTips();
    }
    _setMap_.call(this,map);
  };
  
})();



