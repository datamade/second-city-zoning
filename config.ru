require "bundler"
Bundler.require :default

base = File.dirname(__FILE__)
$:.unshift File.join(base, "lib")

require "open_city"

Sinatra::Base.set(:root) { base }
run OpenCity::Application

