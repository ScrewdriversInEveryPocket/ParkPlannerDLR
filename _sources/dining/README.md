# Disney dining pull

From Disney's own site only (disneyland.disney.go.com), about 1 request a second.

- List feed: `https://disneyland.disney.go.com/finder/api/v1/explorer-service/list-ancestor-entities/dlr/80008297;entityType=destination/<date>/dining`
- Detail feed, one per place: `https://disneyland.disney.go.com/finder/api/v1/explorer-service/details-entity-simple/dlr/<urlFriendlyId>/<date>/`

Re-run (PowerShell):

```
.\fetch-dining.ps1 -Date 2026-10-26
.\parse-dining.ps1 -Date 2026-10-26
```

`fetch-dining.ps1` skips files already in `raw\`, so delete `raw\` first for a fresh pull.

Outputs:
- `disney_dining.csv`: one row per dining place in Disneyland park or California Adventure.
  `park` uses the app's names (Disneyland, California Adventure); `land` is Disney's own label.
  Lat/lon are Disney's map pins. `type` is worked out from Disney's facets; places whose only menu is snacks are Snacks.
  `meals` comes from the menu titles on each detail page (lounge = lounge menu only).
- `disney_dining_hours.csv`: each place's hours for the week after `<date>`, from the detail pages.

Ariel's Grotto is not on Disney's dining list; its detail URL returns 404.
