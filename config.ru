require "bundler"
Bundler.require :default

base = File.dirname(__FILE__)
$:.unshift File.join(base, "lib")

require "open_city_app"

Sinatra::Base.set(:root) { base }
run OpenCityApp::Application

