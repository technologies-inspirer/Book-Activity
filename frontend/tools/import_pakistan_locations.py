"""Build the offline city/locality index from GeoNames' Pakistan country extract.

Usage: python frontend/tools/import_pakistan_locations.py tmp/pakistan-geonames.zip
Source: https://download.geonames.org/export/dump/PK.zip (CC BY 4.0).
"""
import json
import sys
from pathlib import Path
from zipfile import ZipFile

root = Path(__file__).resolve().parents[2]
archive = Path(sys.argv[1])
regions = {'04': 'Punjab', '05': 'Sindh', '03': 'Khyber Pakhtunkhwa', '02': 'Balochistan', '08': 'Islamabad Capital Territory', '06': 'Azad Jammu and Kashmir', '07': 'Gilgit-Baltistan'}
places = {name: {} for name in regions.values()}
with ZipFile(archive) as zipped:
    for line in zipped.read('PK.txt').decode('utf-8').splitlines():
        fields = line.split('\t')
        if len(fields) < 19 or fields[6] != 'P' or fields[7] in {'PPLH', 'PPLQ', 'PPLW', 'PPLCH', 'PPLX'}:
            continue
        state = regions.get(fields[10])
        name = (fields[2] or fields[1]).strip()
        if not state or not name or len(name) > 150:
            continue
        population = int(fields[14] or 0)
        key = name.casefold()
        previous = places[state].get(key)
        if previous is None or population > previous[1]:
            places[state][key] = (name, population)

result = {state: [name for name, _ in sorted(rows.values(), key=lambda item: (-item[1], item[0].casefold()))] for state, rows in places.items()}
output = root / 'backend' / 'data' / 'pakistan-cities.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print('Offline city/locality index:', {state: len(names) for state, names in result.items()})
