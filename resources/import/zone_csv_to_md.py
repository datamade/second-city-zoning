from datetime import date, datetime, timedelta
import csv
import requests
import itertools
from slugify import slugify

def escape(html):
    """Returns the given HTML with ampersands, quotes and carets encoded."""
    return html.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;').replace("'", '&#39;').replace(":","&#58;")

with open('zoning-code-summary-district-types.csv', 'rb') as csvfile:
    csvreader = csv.DictReader(csvfile)
    for e in csvreader:

      print e

      md = """---
layout: zone
category: zones
"""
      md = md + "title: " + e['District type code'] + "\n"
      md = md + "description: " + e['District Title'] + "\n"

      for key, val in e.items():
        md = md + '%s: "%s"\n' % (key.lower().replace(" ", "_"), escape(val))

      md = md + "---\n"

      md_title = e['District type code'] + ".md"
      print "writing to " + md_title
      
      with open("../../zone/" + md_title, 'w') as f:
        f.write(md)