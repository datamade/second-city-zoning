require "sinatra/base"
require "sinatra/reloader"
require "sinatra-initializers"
require "sinatra/r18n"

module ChicagoZoning
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

    helpers SiteTemplate::HtmlHelpers
    
    get "/" do
      @current_menu = "home"
      haml :index
    end
    
    get "/ordinances" do 
      @current_menu = "zones"
      @ordinances = FT.execute("SELECT ORDINANCE1, ORDINANCE_ FROM #{Zoning_map_id} WHERE ORDINANCE1 NOT EQUAL TO '' AND ORDINANCE_ NOT EQUAL TO '' ORDER BY ORDINANCE1 DESC LIMIT 100;")
      haml :ordinances
    end
    
    get "/zones" do 
      @current_menu = "zones"
      @zones = FT.execute("SELECT * FROM #{Zoning_code_summary_id};")
      haml :zones
    end

    get "/zone/:zone_id" do
      @current_menu = "zones"
      @zone = FT.execute("SELECT * FROM #{Zoning_code_summary_id} WHERE 'District type code' = '#{params[:zone_id]}';").first
      haml :zone_detail
    end
    
    get "/:page" do
      @current_menu = params[:page]
      haml params[:page].to_sym
    end
  end
end
