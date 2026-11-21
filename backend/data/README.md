# Pakistan locations

`pakistan-cities.json` contains deduplicated city/town/locality names grouped by province or region, extracted from the GeoNames Pakistan country dump on 2026-11-21. It includes populated places, excludes historic/abandoned/destroyed places and subdivisions of populated places, and lists more populated places first for the initial search suggestions.

Source: [GeoNames Pakistan extract](https://download.geonames.org/export/dump/PK.zip), [format documentation](https://download.geonames.org/export/dump/readme.txt).

Attribution: GeoNames, licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). GeoNames does not guarantee completeness or accuracy. The dataset uses ASCII/transliterated names. Duplicate names within a region are combined; this is a school-address selector, not a boundary or geocoding service.

Regenerate from the repository root:

```sh
python frontend/tools/import_pakistan_locations.py tmp/pakistan-geonames.zip
```
