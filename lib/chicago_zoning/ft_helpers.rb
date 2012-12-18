module SiteTemplate
  module FtHelpers

    def get_zone_type_description zone_type
      return FT.execute("SELECT * FROM #{Zoning_code_summary_id} WHERE 'District type code' STARTS WITH '#{zone_type}';").first
    end

    def get_zone_districts zone_type
      return FT.execute("SELECT * FROM #{Zoning_code_summary_id} WHERE 'District type code' STARTS WITH '#{zone_type}';")
    end

  end
end