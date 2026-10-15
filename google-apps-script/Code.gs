/**
 * Wave: receives orders from the Next.js API route and appends them to a sheet.
 *
 * Setup:
 *  1. Create a Google Sheet. Open Extensions > Apps Script and paste this file.
 *  2. Set SECRET below to a long random string (the same value goes in SHEETS_SECRET).
 *  3. Deploy > New deployment > type: Web app
 *       Execute as: Me
 *       Who has access: Anyone
 *  4. Copy the Web app URL into SHEETS_WEBHOOK_URL.
 *  After any edit to this file: Deploy > Manage deployments > Edit > New version.
 */
const SECRET = "CHANGE_ME_TO_A_LONG_RANDOM_STRING";
const SHEET_NAME = "Orders";
const HEADERS = ["Date", "Order ID", "Name", "Phone", "Address", "Notes", "Items", "Pieces", "Total", "Currency", "Status"];

// Stops values such as "=1+1" or "+20..." from being read as formulas
const safe = (v) => {
  const s = String(v == null ? "" : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
};

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.secret !== SECRET) return reply({ ok: false, error: "unauthorized" });

    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    }

    const list = d.itemsList || [];
    const items = list.length
      ? list.map((i) => i.name + " | " + i.size + " / " + i.color + " | x" + i.qty + " | " + i.lineTotal).join("\n")
      : String(d.items || "");
    const pieces = list.reduce((n, i) => n + i.qty, 0);

    sheet.appendRow([
      new Date(d.date),
      d.orderId,
      safe(d.name),
      safe(d.phone),
      safe(d.address),
      safe(d.notes),
      items,
      pieces,
      d.total,
      d.currency,
      "New",
    ]);
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}
