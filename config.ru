require "bundler"
Bundler.require :default

base = File.dirname(__FILE__)
$:.unshift File.join(base, "lib")

require "chicago_zoning"

Sinatra::Base.set(:root) { base }
run ChicagoZoning::Application