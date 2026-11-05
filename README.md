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
