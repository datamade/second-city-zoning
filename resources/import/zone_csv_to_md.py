from datetime import date, datetime, timedelta
import csv
import requests
import itertools
from slugify import slugify

with open('zoning-code-summary-district-types.csv', 'rb') as csvfile:
    csvreader = csv.DictReader(csvfile)
    for e in csvreader:

      print e

      md = """---
layout: 'zone'
categories: 
  - 'zones'
"""
      md = md + "title: '" + e['District type code'] + "'\n"
      md = md + "description: '" + e['District Title'] + "'\n"
      md = md + "District_type_code: '" + e['District type code'] + "'\n"
      md = md + "Old_zoning_ordinance_code: '" + e['Old zoning ordinance code'] + "'\n"
      md = md + "Zone_Type: '" + e['Zone Type'] + "'\n"
      md = md + "Old_Description: '" + e['Old Description'].replace("\n", "") + "'\n"
      md = md + "Juan_Description: '" + e['Juan Description'] + "'\n"
      md = md + "District_Title: '" + e['District Title'] + "'\n"
      md = md + "Zoning_Code_Section: '" + e['Zoning Code Section'] + "'\n"
      md = md + "Floor_Area_Ratio: '" + e['Floor Area Ratio'] + "'\n"
      md = md + "Maximum_Building_Height: '" + e['Maximum Building Height'] + "'\n"
      md = md + "Lot_Area_per_Unit: '" + e['Lot Area per Unit'] + "'\n"
      md = md + "Front_Yard_Setback: '" + e['Front Yard Setback'] + "'\n"
      md = md + "Side_Setback: '" + e['Side Setback'] + "'\n"
      md = md + "Rear_Yard_Setback: '" + e['Rear Yard Setback'] + "'\n"
      md = md + "Rear_Yard_Open_Space: '" + e['Rear Yard Open Space'] + "'\n"
      md = md + "On_Site_Open_Space: '" + e['On Site Open Space'] + "'\n"
      md = md + "---"

      md_title = e['District type code'] + ".md"
      print "writing to " + md_title
      
      with open("../../zone/" + md_title, 'w') as f:
        f.write(md)