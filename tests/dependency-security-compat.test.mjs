import test from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";

const xlsxModule = await import("xlsx");
const XLSX = xlsxModule.default || xlsxModule;

function workbookBuffer(bookType) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Name", "Score"],
      ["Fictional employee", 4],
    ]),
    "Data"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([["Measure"], ["Stress"]]),
    "Second sheet"
  );
  return XLSX.write(workbook, { bookType, type: "array" });
}

test("maintained SheetJS distribution preserves the app's XLSX and legacy XLS reader APIs", () => {
  for (const bookType of ["xlsx", "xls"]) {
    const workbook = XLSX.read(workbookBuffer(bookType), { type: "array" });
    assert.deepEqual(workbook.SheetNames, ["Data", "Second sheet"]);
    assert.deepEqual(
      XLSX.utils.sheet_to_json(workbook.Sheets.Data, {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      }),
      [["Name", "Score"], ["Fictional employee", "4"]]
    );
  }
});

test("maintained SheetJS distribution preserves CSV parsing used by Workplace uploads", () => {
  const csv = new TextEncoder().encode("Name,Score\r\nFictional employee,4\r\n");
  const workbook = XLSX.read(csv, { type: "array" });
  assert.deepEqual(
    XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    }),
    [["Name", "Score"], ["Fictional employee", "4"]]
  );
});

test("Nodemailer 10 retains the application's Gmail transport and sendMail API without sending externally", async () => {
  const gmailTransport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: "preview@example.invalid", pass: "not-used" },
  });
  assert.equal(typeof gmailTransport.sendMail, "function");

  const jsonTransport = nodemailer.createTransport({ jsonTransport: true });
  const message = await jsonTransport.sendMail({
    from: "root@example.invalid",
    to: "recipient@example.invalid",
    subject: "Local compatibility check",
    text: "JSON transport only; no email is sent.",
  });
  assert.ok(message.messageId);
  assert.ok(message.message);
});
