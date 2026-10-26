# Restrooms

Where `data/restrooms.js` comes from: Disney's restroom map, [disneyland.disney.go.com/guest-services/restrooms/](https://disneyland.disney.go.com/guest-services/restrooms/).

- `fetch-restrooms.ps1` saves the page to `raw\restrooms-page-<date>.html` (one request).
- `parse-restrooms.ps1` reads the newest saved page and writes `restrooms.csv` (park, name, lat, lon, companion, island, disney_id) for the two theme parks.
- `raw\` stays on this PC and isn't uploaded (Disney's files). `raw\guest-services-2026-10-25.json` is Disney's guest-services list. It only has one sample restroom per park, which is why the page is used instead.

The first pull (Oct 26, 2026) found 28 restrooms in Disneyland (3 on Tom Sawyer Island) and 19 in California Adventure. See UPDATING.md, `restrooms`.
