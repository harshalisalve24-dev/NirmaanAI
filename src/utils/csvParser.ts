/**
 * RFC 4180 CSV parser.
 * Handles quoted fields with embedded newlines, commas, and escaped quotes ("").
 * Returns an array of rows; each row is an array of cell strings.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const n = text.length;
  let i = 0;

  while (i < n) {
    const row: string[] = [];
    let endOfFile = false;

    // Parse one row
    while (true) {
      let field = "";

      if (i >= n) {
        endOfFile = true;
        break;
      }

      if (text[i] === '"') {
        // Quoted field — may contain embedded newlines and commas
        i++; // skip opening quote
        while (i < n) {
          if (text[i] === '"') {
            if (i + 1 < n && text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            if (text[i] === "\r") { i++; continue; }
            field += text[i++];
          }
        }
      } else {
        // Unquoted field — ends at comma, \n, or EOF
        while (i < n && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          field += text[i++];
        }
      }

      row.push(field.trim());

      // After field: comma = next field; newline / EOF = end of row
      if (i >= n) {
        endOfFile = true;
        break;
      } else if (text[i] === ",") {
        i++; // advance to next field
      } else if (text[i] === "\r") {
        i++;
        if (i < n && text[i] === "\n") i++;
        break;
      } else if (text[i] === "\n") {
        i++;
        break;
      }
    }

    // Skip entirely empty rows (e.g. trailing newline)
    if (row.length > 0 && !(row.length === 1 && row[0] === "")) {
      rows.push(row);
    }

    if (endOfFile) break;
  }

  return rows;
}
