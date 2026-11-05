# Gifted Motors Records Portal (demo)

Staff record money in (hires, prepayments, balance payments) and money out (expenses). Managers get an overview, detail pages and a live financial report.

Demo version: entries stay in the browser and nothing is sent to Google Sheets yet.
Demo passwords: staff `staff`, manager `manager`.

Files
- `index.html` - the page
- `core.js` - settings (business details, vehicle list, expense categories), data and chart helpers
- `staff.js` - sign in and the two staff forms
- `manager.js` - overview and detail pages (orders, spending, vehicles, prepaid, owing)
- `report.js` - the financial report
- `app.js` - starts the site and switches pages
- `styles.css`, `print.css` - look on screen and when saved as PDF

Business details printed on the report (name, registration number, address) are at the top of `core.js`.

## Going live with Google Sheets
1. In the Google Sheet: Extensions > Apps Script. Paste `apps-script/Code.gs`, change the two passwords at the top, run `setup`.
2. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone). Copy the `/exec` address.
3. Put that address in `API_URL` at the top of `core.js` and push.
