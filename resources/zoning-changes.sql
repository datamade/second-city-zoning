# select all zoning objects updated after 2017-09-11 (last update)
SELECT a.*, b.zone_class as old_zone_class
FROM second_city_zoning_feb_27_2020 as a, zoning_asof_11sep2017 as b
WHERE a.zoning_id = b.zoning_id
AND a.update_timestamp > 1505144090000

# select all zoning objects that have a new zone_class
SELECT a.*, b.zone_class as old_zone_class
FROM second_city_zoning_feb_27_2020 as a, zoning_asof_11sep2017 as b
WHERE a.zoning_id = b.zoning_id
AND a.zone_class != b.zone_class