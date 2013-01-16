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
    helpers SiteTemplate::FtHelpers

    # redirects
    get "/definitions/?" do
      redirect "/zoning_rules"
    end
    
    get "/" do
      cache_control :public, max_age: 604800  # 1 week
      @current_menu = "home"
      haml :index
    end
    
    get "/ordinances" do 
      cache_control :public, max_age: 604800  # 1 week
      @title = "Ordinances"
      @current_menu = "zones"
      @ordinances = FT.execute("SELECT ORDINANCE1, ORDINANCE_ FROM #{Zoning_map_id} WHERE ORDINANCE1 NOT EQUAL TO '' AND ORDINANCE_ NOT EQUAL TO '' ORDER BY ORDINANCE1 DESC LIMIT 100;")
      haml :ordinances
    end
    
    get "/zones" do 
      cache_control :public, max_age: 604800  # 1 week
      @title = "Zoning districts"
      @current_menu = "zones"
      @zones = FT.execute("SELECT * FROM #{Zoning_code_summary_id};")
      haml :zones
    end

    get "/zone/:zone_id" do
      cache_control :public, max_age: 604800  # 1 week
      @current_menu = "zones"
      @zones = FT.execute("SELECT * FROM #{Zoning_code_summary_id} WHERE 'District type code' = '#{params[:zone_id]}';")
      unless @zones.length == 0
        @zone = @zone.first
        @title = "#{@zone[:district_type_code]} - #{@zone[:district_title]}"
        haml :zone_detail
      else
        params[:page] = params[:zone_id] # hack to get URL to show up on not_found page
        haml :not_found
      end
    end
    
    get "/:page" do
      begin
        cache_control :public, max_age: 604800  # 1 week
        @title = params[:page].capitalize.gsub(/[_-]/, " ")
        @current_menu = params[:page]
        haml params[:page].to_sym
      rescue Errno::ENOENT
        haml :not_found
      end
    end

    error do
      'Sorry there was a nasty error - ' + env['sinatra.error'].name
    end
  end
end
