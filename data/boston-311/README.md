# Boston 311 service requests

Saved 2026-10-18 for Hackachusetts.

Street address, photos, and coordinates are left out. The live call returns 100 recent cases. data.csv has a larger saved slice from the new 311 system.

Rows in data.csv: 5000

Columns: open_date, case_topic, service_name, assigned_department, case_status, neighborhood, zip_code, on_time, city_council_district, ward

How to use it

- Spreadsheets: open data.csv in Excel or Google Sheets.
- Fresh copy: run `python fetch.py` or `node fetch.js`. Both call the URL below and save the response.
- The preview on the Hackachusetts site is a few rows of this same table.

Direct request

https://data.boston.gov/api/3/action/datastore_search?resource_id=254adca6-64ab-4c5c-9fc0-a6da622be185&fields=open_date,case_topic,service_name,assigned_department,case_status,neighborhood,zip_code,on_time,city_council_district,ward&sort=open_date%20desc&limit=100

Check the source license before publishing a project.
