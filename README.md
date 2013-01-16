# Second City Zoning

Second City Zoning is an interactive map that lets you:

-   find out **how your building is zoned**
-   learn **where to locate your business**
-   explore **zoning patterns** throughout the city

To make Chicago’s zoning code digestible by humans, we took inspiration
from one of our favorite games: [Sim City 2000](http://en.wikipedia.org/wiki/SimCity_2000). It started with the color scheme and from there we got a little carried away. Graphics, sounds, music, oh my.

Like all [Open City](http://opencityapps.org) apps, Second City Zoning is entirely [open
source](http://secondcityzoning.org/about#code) and built with [open data](http://secondcityzoning.org/about#data).

## Installation

<pre>
  $ git clone git@github.com:open-city/second-city-zoning.git
  $ cd site_template
  $ gem install bundler
  $ bundle
  $ unicorn
  navigate to http://localhost:8080/
</pre>

## Dependencies

* [Ruby](http://www.ruby-lang.org/)
* [Sinatra](http://sinatrarb.com)
* [Heroku](http://heroku.com)
* [Google Fusion Tables](http://www.google.com/fusiontables/Home)
* [Google Maps API V3](https://developers.google.com/maps/documentation/javascript)
* [jQuery](http://jquery.org)
* [jQuery Address](http://www.asual.com/jquery/address)
* [Twitter Bootstrap](http://twitter.github.com/bootstrap)

## Team

* [Derek Eder](mailto:derek.eder+git@gmail.com)
* [Juan-Pablo Velez](mailto:jpvelez@gmail.com)

## Errors / Bugs

If something is not behaving intuitively, it is a bug, and should be reported.
Report it here: https://github.com/open-city/second-city-zoning/issues


## Note on Patches/Pull Requests
 
* Fork the project.
* Make your feature addition or bug fix.
* Commit, do not mess with rakefile, version, or history.
* Send a pull request. Bonus points for topic branches.
