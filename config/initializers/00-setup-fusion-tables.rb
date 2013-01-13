configure do   
  begin
    yaml = YAML.load_file("config/config.yml")[settings.environment.to_s]
    yaml.each_pair do |key, value|
      set(key.to_sym, value)
    end
  rescue Errno::ENOENT
    puts "config file not found"
  end
end

begin
  google_account = settings.google_account.to_s
  google_password = settings.google_password.to_s
  api_key = settings.api_key.to_s
  zoning_map_id = settings.zoning_map_id.to_s
  zoning_code_summary_id = settings.zoning_code_summary_id.to_s
rescue
  google_account = ENV['google_account']
  google_password = ENV['google_password'] 
  api_key = ENV['api_key']
  zoning_map_id = ENV['zoning_map_id']
  zoning_code_summary_id = ENV['zoning_code_summary_id']
end

#puts "google_account: #{google_account}"
#puts "google_password: #{google_password}"

FT = GData::Client::FusionTables.new      
FT.clientlogin(google_account, google_password)
FT.set_api_key(api_key)

# make Fusion Tables IDs available to the rest of the app
Zoning_map_id = zoning_map_id
Zoning_code_summary_id = zoning_code_summary_id