require "bundler"
Bundler.require :default

base = File.dirname(__FILE__)
$:.unshift File.join(base, "lib")

require "site_template"

Sinatra::Base.set(:root) { base }
run SiteTemplate::Application

