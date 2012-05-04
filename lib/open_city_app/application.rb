require "sinatra/base"
require "sinatra/reloader"
require "sinatra-initializers"
require "sinatra/r18n"

module OpenCityApp
  class Application < Sinatra::Base
    enable :logging, :sessions
    enable :dump_errors, :show_exceptions if development?

    configure :development do
      register Sinatra::Reloader
    end

    register Sinatra::Initializers
    register Sinatra::R18n

    before do
      session[:locale] = params[:locale] if params[:locale]
    end

    use Rack::Logger
    use Rack::Session::Cookie

    helpers OpenCityApp::HtmlHelpers

    get "/" do
      haml :index
    end
    
    get "/:page" do |page_name|
      template = File.join(settings.views, page_name + ".haml")
      if File.exists?(template)
        @current_menu = page_name
        haml page_name.to_sym
      else
        pass
      end
    end
  end
end
