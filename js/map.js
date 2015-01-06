var ZoningDict = ["Business", "Commercial / Mixed-Use", "Manufacturing", "Residential", 
                      "Planned Development", "Planned Manufacturing District", "Downtown Mixed-Use",
                      "Downtown Core", "Downtown Residential", "Downtown Service", 
                      "Transportation","Parks and Open Space"];

var ZoningTable = {};

$(window).resize(function () {
  var h = $(window).height(),
    offsetTop = 120; // Calculate the top offset

  $('#mapCanvas').css('height', (h - offsetTop));
}).resize();

$(function() {
  $('label.checkbox.inline').popover({
    delay: { show: 300, hide: 100 }
  });

  // populate zoning table from CSV
  $.when($.get("/resources/import/zoning-code-summary-district-types.csv")).then(
    function(data){
      $.each($.csv.toObjects(data), function(i, row){
        ZoningTable[row['district_type_code']] = row;
      });
    });

  CartoDbLib.initialize();
  var autocomplete = new google.maps.places.Autocomplete(document.getElementById('search_address'));

  $(':checkbox').click(function(){
    play_multi_sound("mouse-click");
    CartoDbLib.doSearch();
  });

  $('#btnSearch').click(function(){
    play_multi_sound("reticulating-splines");
    CartoDbLib.doSearch();
  });

  $('#findMe').click(function(){
    play_multi_sound("reticulating-splines");
    CartoDbLib.findMe();
    return false;
  });

  $('#reset').click(function(){
    play_multi_sound("explosion");
    $.address.parameter('address','');
    $.address.parameter('radius','');
    $.address.parameter('id','');
    CartoDbLib.initialize();
    return false;
  });

  $("#search_address").keydown(function(e){
      var key =  e.keyCode ? e.keyCode : e.which;
      if(key == 13) {
          $('#btnSearch').click();
          return false;
      }
  });

  $('.simcopter').click(function(e){
    console.log('simcopter!');
    play_multi_sound("simcopter-one");
    return false;
  });

  $('.yay-link').click(function(e){
    var location = $(this).attr('href');
    play_multi_sound("yay");
    setTimeout(
      function(){
        window.location = location;
      },3000)
    e.preventDefault();
  });

  if ($.cookie("show-welcome") != "read") {
    $('#a_info_accordion').click();
    $.cookie("show-welcome", "read", { expires: 7 });
  }

  $('#close_info').click(function(){
    $('#a_info_accordion').click();
  });

  $('.zones label').popover({trigger: "hover", placement: "top"})

  if ($.cookie("sound-effects") == 'on')
    $('#sound_effects_toggle').html('<i class="fa fa-volume-up"></i> On');

  $('#sound_effects_toggle').click(function(e){
    e.preventDefault();
    if ($.cookie("sound-effects") == 'on') {
      $.cookie("sound-effects", "off", { expires: 7 });
      $(this).html('<i class="fa fa-volume-off"></i> Off');
    }
    else {
      $.cookie("sound-effects", "on", { expires: 7 });
      $(this).html('<i class="fa fa-volume-up"></i> On');
    }
  });

  //---------music player---------------
  // Local copy of jQuery selectors, for performance.
  var my_jPlayer = $("#jquery_jplayer"),
    my_trackName = $("#jp_container .track-name"),
    my_playState = $("#jp_container .play-state")

  // Some options
  var opt_play_first = false, // If true, will attempt to auto-play the default track on page loads. No effect on mobile devices, like iOS.
    opt_auto_play = true // If true, when a track is selected, it will auto-play.

  // A flag to capture the first track
  var first_track = true;

  // Instance jPlayer
  my_jPlayer.jPlayer({
    ready: function () {
      $("#jp_container .track-default").click();
    },
    swfPath: "javascripts",
    cssSelectorAncestor: "#jp_container",
    supplied: "mp3",
    wmode: "window",
    loop: true
  });

  // Create click handlers for the different tracks
  $("#jp_container .track").click(function(e) {
    $('#jplayer-tracks').children('li').attr('class', '');
    $(this).parent().attr('class', 'active');
    my_jPlayer.jPlayer("setMedia", {
      mp3: $(this).attr("href")
    });
    if((opt_play_first && first_track) || (opt_auto_play && !first_track)) {
      my_jPlayer.jPlayer("play");
    }
    first_track = false;
    $(this).blur();
    return false;
  });

  //-----------handle multi-channel audio-----------------
  var channel_max = 10;                   // number of channels
  var audiochannels = new Array();
  for (a=0;a<channel_max;a++) {                 // prepare the channels
    audiochannels[a] = new Array();
    audiochannels[a]['channel'] = new Audio();            // create a new audio object
    audiochannels[a]['finished'] = -1;              // expected end time for this channel
  }
  function play_multi_sound(s) {
    if ($.cookie("sound-effects") == "on") {
      for (a=0;a<audiochannels.length;a++) {
        thistime = new Date();
        if (audiochannels[a]['finished'] < thistime.getTime()) {      // is this channel finished?
          audiochannels[a]['finished'] = thistime.getTime() + document.getElementById(s).duration*1000;
          audiochannels[a]['channel'].src = document.getElementById(s).src;
          audiochannels[a]['channel'].load();
          audiochannels[a]['channel'].play();
          break;
        }
      }
    }
  }

});