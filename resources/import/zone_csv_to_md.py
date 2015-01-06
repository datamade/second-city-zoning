from datetime import date, datetime, timedelta
import csv
import requests
import itertools
from slugify import slugify

def escape(html):
    """Returns the given HTML with ampersands, quotes and carets encoded."""
    return html.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&#39;').replace(":","&#58;")

type_dict = ["Business", "Commercial / Mixed-Use", "Manufacturing", "Residential", 
                      "Planned Development", "Planned Manufacturing District", "Downtown Mixed-Use",
                      "Downtown Core", "Downtown Residential", "Downtown Service", 
                      "Transportation","Parks and Open Space"];


with open('zoning-code-summary-district-types.csv', 'rb') as csvfile:
    csvreader = csv.DictReader(csvfile)
    for e in csvreader:

      print e

      md = """---
layout: zone
category: zones
"""
      md = md + 'title: "' + e['district_type_code'] + ' - ' + e['district_title'] + '"\n'
      md = md + 'description: "' + e['juan_description'] + '"\n'
      md = md + "zone_type_name: " + type_dict[int(e['zone_type']) - 1] + "\n"

      for key, val in e.items():
        md = md + '%s: "%s"\n' % (key.lower().replace(" ", "_"), escape(val))

      md = md + "---\n"

      md_title = e['district_type_code'] + ".md"
      print "writing to " + md_title
      
      with open("../../zone/" + md_title, 'w') as f:
        f.write(md)