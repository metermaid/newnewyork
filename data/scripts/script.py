import googlemaps
import tempfile
import json
import csv
import sys

gmaps = googlemaps.Client(key='')


with open('../movies.csv', newline='') as csvfile:
  reader = csv.DictReader(csvfile)
  for row in reader:
    lookup = gmaps.geocode(row['location'])[0]
    row['lat'] = lookup['geometry']['location']['lat']
    row['lng'] = lookup['geometry']['location']['lng']
    print(row)