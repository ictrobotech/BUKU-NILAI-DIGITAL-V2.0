/*!
 * xlsx-lite.js — pembuat berkas .xlsx tanpa pustaka eksternal
 * ---------------------------------------------------------------------------
 * Dipakai oleh supabase-adapter.js untuk menggantikan fitur ekspor Excel yang
 * dulu dikerjakan Google Sheets (createExcelExport_ / exportSpreadsheetAsXlsx_
 * pada Code.gs). Berkas dibentuk langsung di browser: tidak perlu Google Drive,
 * tidak perlu jaringan tambahan, dan hasilnya tetap .xlsx asli (OOXML).
 *
 * Kemampuan: multi-sheet, merge sel, warna isi & huruf, tebal/miring, ukuran
 * huruf, perataan, wrap, garis tabel, format angka, lebar kolom, tinggi baris,
 * panel beku (freeze), dan warna tab. Berkas ditulis tanpa kompresi (metode
 * ZIP "store") sehingga tidak butuh pustaka deflate.
 *
 * Pemakaian:
 *   const wb = XlsxLite.createWorkbook();
 *   const ws = wb.addWorksheet('FORMATIF', { tabColor: 'F7941D', gridlines: false });
 *   ws.set(1, 1, 'NILAI FORMATIF', { bold: true, size: 15, color: 'FFFFFF', fill: '0B1F6B', align: 'center' });
 *   ws.merge(1, 1, 1, 5);
 *   ws.colWidth(1, 55);
 *   ws.rowHeight(5, 64);
 *   ws.freeze(4, 2);
 *   const bytes = wb.build();          // Uint8Array siap diunduh
 *   const base64 = XlsxLite.toBase64(bytes);
 * ---------------------------------------------------------------------------
 * Lisensi: MIT — bebas dipakai dan dimodifikasi untuk aplikasi sekolah.
 */
(function (root) {
  'use strict';

  // -------------------------------------------------------------------------
  // 1. CRC32 + penulis ZIP (metode store / tanpa kompresi)
  // -------------------------------------------------------------------------
  const CRC_TABLE = (function () {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function utf8(text) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
    const escaped = unescape(encodeURIComponent(text));
    const out = new Uint8Array(escaped.length);
    for (let i = 0; i < escaped.length; i++) out[i] = escaped.charCodeAt(i);
    return out;
  }

  function dosDateTime(date) {
    const d = date || new Date();
    const time = ((d.getHours() & 0x1F) << 11) | ((d.getMinutes() & 0x3F) << 5) | (Math.floor(d.getSeconds() / 2) & 0x1F);
    const day = (((d.getFullYear() - 1980) & 0x7F) << 9) | (((d.getMonth() + 1) & 0x0F) << 5) | (d.getDate() & 0x1F);
    return { time: time, date: day };
  }

  /** Menyusun arsip ZIP dari daftar { name, data } tanpa kompresi. */
  function zipStore(entries) {
    const chunks = [];
    const central = [];
    let offset = 0;
    const stamp = dosDateTime(new Date());

    const push = (bytes) => { chunks.push(bytes); offset += bytes.length; };

    entries.forEach(function (entry) {
      const nameBytes = utf8(entry.name);
      const data = entry.data;
      const crc = crc32(data);

      const local = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true);   // signature
      lv.setUint16(4, 20, true);           // versi minimum
      lv.setUint16(6, 0x0800, true);       // flag: nama berkas UTF-8
      lv.setUint16(8, 0, true);            // metode: store
      lv.setUint16(10, stamp.time, true);
      lv.setUint16(12, stamp.date, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, data.length, true);
      lv.setUint32(22, data.length, true);
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);
      local.set(nameBytes, 30);

      const headerOffset = offset;
      push(local);
      push(data);

      const cd = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, stamp.time, true);
      cv.setUint16(14, stamp.date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint32(42, headerOffset, true);
      cd.set(nameBytes, 46);
      central.push(cd);
    });

    const centralSize = central.reduce((total, part) => total + part.length, 0);
    const centralOffset = offset;
    central.forEach(push);

    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, entries.length, true);
    ev.setUint16(10, entries.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, centralOffset, true);
    push(eocd);

    const total = chunks.reduce((sum, part) => sum + part.length, 0);
    const out = new Uint8Array(total);
    let position = 0;
    chunks.forEach(function (part) { out.set(part, position); position += part.length; });
    return out;
  }

  // -------------------------------------------------------------------------
  // 2. Utilitas XML
  // -------------------------------------------------------------------------
  function escapeXml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
      // buang karakter kontrol yang tidak sah di XML
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ');
  }

  function columnName(index) {            // 1 -> A, 27 -> AA
    let name = '';
    let n = index;
    while (n > 0) {
      const rem = (n - 1) % 26;
      name = String.fromCharCode(65 + rem) + name;
      n = Math.floor((n - 1) / 26);
    }
    return name;
  }

  function cellRef(row, col) { return columnName(col) + row; }

  function argb(hex) {
    const clean = String(hex || '').replace('#', '').toUpperCase();
    if (!clean) return 'FF000000';
    return clean.length === 8 ? clean : 'FF' + clean;
  }

  // -------------------------------------------------------------------------
  // 3. Kumpulan gaya (style) — semua kombinasi di-intern agar berkas ringkas
  // -------------------------------------------------------------------------
  function createStyleRegistry() {
    const fonts = [{ key: 'default', xml: '<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>' }];
    const fills = [
      { key: 'none', xml: '<fill><patternFill patternType="none"/></fill>' },
      { key: 'gray125', xml: '<fill><patternFill patternType="gray125"/></fill>' }
    ];
    const borders = [
      { key: 'none', xml: '<border><left/><right/><top/><bottom/><diagonal/></border>' },
      { key: 'thin', xml: '<border>' +
          '<left style="thin"><color rgb="FFD4DCEB"/></left>' +
          '<right style="thin"><color rgb="FFD4DCEB"/></right>' +
          '<top style="thin"><color rgb="FFD4DCEB"/></top>' +
          '<bottom style="thin"><color rgb="FFD4DCEB"/></bottom>' +
          '<diagonal/></border>' }
    ];
    // xfs[0] wajib gaya default: indeks sel (0-based) harus sama dengan posisi di <cellXfs>.
    const xfs = [{ key: 'default', xml: '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' }];
    const fontIndex = new Map([[fonts[0].key, 0]]);
    const fillIndex = new Map([[fills[0].key, 0], [fills[1].key, 1]]);
    const borderIndex = new Map([[borders[0].key, 0], [borders[1].key, 1]]);
    const xfIndex = new Map();

    function intern(list, map, key, xml) {
      if (map.has(key)) return map.get(key);
      list.push({ key: key, xml: xml });
      const index = list.length - 1;
      map.set(key, index);
      return index;
    }

    /** style: {bold, italic, size, color, fill, align, valign, wrap, border, numFmt} */
    function register(style) {
      const s = style || {};
      const fontKey = [s.bold ? 1 : 0, s.italic ? 1 : 0, s.size || 11, argb(s.color || 'FF000000')].join('|');
      const fontId = intern(fonts, fontIndex, fontKey,
        '<font>' +
        (s.bold ? '<b/>' : '') +
        (s.italic ? '<i/>' : '') +
        '<sz val="' + (s.size || 11) + '"/>' +
        '<color rgb="' + argb(s.color || 'FF000000') + '"/>' +
        '<name val="Calibri"/><family val="2"/></font>');

      const fillId = s.fill
        ? intern(fills, fillIndex, 'solid:' + argb(s.fill),
            '<fill><patternFill patternType="solid"><fgColor rgb="' + argb(s.fill) + '"/><bgColor indexed="64"/></patternFill></fill>')
        : 0;

      const borderId = s.border ? 1 : 0;

      // OOXML hanya mengenal vertical: top | center | bottom | justify | distributed
      const valign = s.valign === 'middle' ? 'center' : s.valign;
      const alignXml = (s.align || valign || s.wrap)
        ? '<alignment' +
          (s.align ? ' horizontal="' + s.align + '"' : '') +
          (valign ? ' vertical="' + valign + '"' : '') +
          (s.wrap ? ' wrapText="1"' : '') +
          '/>'
        : '';

      const numFmtId = s.numFmt ? (s.numFmt === '0.00' ? 2 : 0) : 0;
      const xfKey = [fontId, fillId, borderId, numFmtId, alignXml].join('~');

      if (xfIndex.has(xfKey)) return xfIndex.get(xfKey);
      xfs.push({ key: xfKey, xml:
        '<xf numFmtId="' + numFmtId + '" fontId="' + fontId + '" fillId="' + fillId + '" borderId="' + borderId + '" xfId="0"' +
        (numFmtId ? ' applyNumberFormat="1"' : '') +
        (fontId ? ' applyFont="1"' : '') +
        (fillId ? ' applyFill="1"' : '') +
        (borderId ? ' applyBorder="1"' : '') +
        (alignXml ? ' applyAlignment="1"' : '') + '>' +
        alignXml + '</xf>' });
      const index = xfs.length - 1;
      xfIndex.set(xfKey, index);
      return index;
    }

    function toXml() {
      return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<fonts count="' + fonts.length + '">' + fonts.map(f => f.xml).join('') + '</fonts>' +
        '<fills count="' + fills.length + '">' + fills.map(f => f.xml).join('') + '</fills>' +
        '<borders count="' + borders.length + '">' + borders.map(b => b.xml).join('') + '</borders>' +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="' + xfs.length + '">' + xfs.map(x => x.xml).join('') + '</cellXfs>' +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        '</styleSheet>';
    }

    return { register: register, toXml: toXml };
  }

  // -------------------------------------------------------------------------
  // 4. Lembar kerja
  // -------------------------------------------------------------------------
  function Worksheet(name, options, registry) {
    const opts = options || {};
    this.name = String(name).slice(0, 31);
    this.registry = registry;
    this.gridlines = opts.gridlines === false ? false : true;
    this.tabColor = opts.tabColor || '';
    this.cells = new Map();          // "r:c" -> { value, styleIndex }
    this.merges = [];
    this.colWidths = new Map();
    this.rowHeights = new Map();
    this.freezeRows = 0;
    this.freezeCols = 0;
  }

  Worksheet.prototype.set = function (row, col, value, style) {
    if (value === null || value === undefined || value === '') {
      if (!style) return this;
    }
    const styleIndex = style ? this.registry.register(style) : 0;
    this.cells.set(row + ':' + col, { value: value, styleIndex: styleIndex });
    return this;
  };

  Worksheet.prototype.merge = function (row1, col1, row2, col2) {
    if (row1 === row2 && col1 === col2) return this;
    this.merges.push(cellRef(row1, col1) + ':' + cellRef(row2, col2));
    return this;
  };

  Worksheet.prototype.colWidth = function (col, width) { this.colWidths.set(col, width); return this; };
  Worksheet.prototype.rowHeight = function (row, height) { this.rowHeights.set(row, height); return this; };
  Worksheet.prototype.freeze = function (rows, cols) {
    this.freezeRows = rows || 0;
    this.freezeCols = cols || 0;
    return this;
  };

  Worksheet.prototype.toXml = function () {
    const rows = new Map();
    this.cells.forEach(function (cell, key) {
      const parts = key.split(':');
      const rowNumber = Number(parts[0]);
      if (!rows.has(rowNumber)) rows.set(rowNumber, []);
      rows.get(rowNumber).push({ col: Number(parts[1]), cell: cell });
    });

    const rowNumbers = Array.from(rows.keys()).sort((a, b) => a - b);
    const rowXml = rowNumbers.map((rowNumber) => {
      const list = rows.get(rowNumber).sort((a, b) => a.col - b.col);
      const cells = list.map((item) => {
        const ref = cellRef(rowNumber, item.col);
        const value = item.cell.value;
        const styleAttr = item.cell.styleIndex ? ' s="' + item.cell.styleIndex + '"' : '';
        if (typeof value === 'number' && isFinite(value)) {
          return '<c r="' + ref + '"' + styleAttr + '><v>' + value + '</v></c>';
        }
        const text = String(value);
        const preserve = /^\s|\s$/.test(text) ? ' xml:space="preserve"' : '';
        return '<c r="' + ref + '"' + styleAttr + ' t="inlineStr"><is><t' + preserve + '>' +
               escapeXml(text) + '</t></is></c>';
      }).join('');
      const height = this.rowHeights.has(rowNumber)
        ? ' ht="' + this.rowHeights.get(rowNumber) + '" customHeight="1"'
        : '';
      return '<row r="' + rowNumber + '"' + height + '>' + cells + '</row>';
    }, this).join('');

    const colsXml = this.colWidths.size
      ? '<cols>' + Array.from(this.colWidths.keys()).sort((a, b) => a - b).map((col) =>
          '<col min="' + col + '" max="' + col + '" width="' + this.colWidths.get(col) + '" customWidth="1"/>'
        ).join('') + '</cols>'
      : '';

    const paneXml = (this.freezeRows || this.freezeCols)
      ? '<pane' +
        (this.freezeCols ? ' xSplit="' + this.freezeCols + '"' : '') +
        (this.freezeRows ? ' ySplit="' + this.freezeRows + '"' : '') +
        ' topLeftCell="' + cellRef(this.freezeRows + 1, this.freezeCols + 1) + '"' +
        ' activePane="' + (this.freezeRows && this.freezeCols ? 'bottomRight' : this.freezeRows ? 'bottomLeft' : 'topRight') + '"' +
        ' state="frozen"/>'
      : '';

    const mergeXml = this.merges.length
      ? '<mergeCells count="' + this.merges.length + '">' +
        this.merges.map((ref) => '<mergeCell ref="' + ref + '"/>').join('') + '</mergeCells>'
      : '';

    const maxCol = this.cells.size
      ? Math.max(...Array.from(this.cells.keys()).map((key) => Number(key.split(':')[1])))
      : 1;
    const maxRow = this.cells.size
      ? Math.max(...Array.from(this.cells.keys()).map((key) => Number(key.split(':')[0])))
      : 1;

    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<dimension ref="A1:' + cellRef(maxRow, maxCol) + '"/>' +
      '<sheetViews><sheetView' + (this.gridlines ? '' : ' showGridLines="0"') + ' workbookViewId="0">' +
      paneXml + '</sheetView></sheetViews>' +
      '<sheetFormatPr defaultRowHeight="15"/>' +
      colsXml +
      '<sheetData>' + rowXml + '</sheetData>' +
      mergeXml +
      '</worksheet>';
  };

  // -------------------------------------------------------------------------
  // 5. Buku kerja
  // -------------------------------------------------------------------------
  function Workbook() {
    this.registry = createStyleRegistry();
    this.sheets = [];
  }

  Workbook.prototype.addWorksheet = function (name, options) {
    const sheet = new Worksheet(name, options, this.registry);
    this.sheets.push(sheet);
    return sheet;
  };

  Workbook.prototype.build = function () {
    const sheetCount = this.sheets.length;
    const entries = [];

    const contentTypes =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      this.sheets.map((sheet, index) =>
        '<Override PartName="/xl/worksheets/sheet' + (index + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
      ).join('') +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      '</Types>';

    const rootRels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>';

    const workbookXml =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets>' +
      this.sheets.map((sheet, index) =>
        '<sheet name="' + escapeXml(sheet.name) + '" sheetId="' + (index + 1) + '" r:id="rId' + (index + 1) + '"/>'
      ).join('') +
      '</sheets></workbook>';

    const workbookRels =
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      this.sheets.map((sheet, index) =>
        '<Relationship Id="rId' + (index + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (index + 1) + '.xml"/>'
      ).join('') +
      '<Relationship Id="rId' + (sheetCount + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
      '</Relationships>';

    entries.push({ name: '[Content_Types].xml', data: utf8(contentTypes) });
    entries.push({ name: '_rels/.rels', data: utf8(rootRels) });
    entries.push({ name: 'xl/workbook.xml', data: utf8(workbookXml) });
    entries.push({ name: 'xl/_rels/workbook.xml.rels', data: utf8(workbookRels) });
    entries.push({ name: 'xl/styles.xml', data: utf8(this.registry.toXml()) });

    this.sheets.forEach(function (sheet, index) {
      // Warna tab disisipkan sebagai sheetPr di awal elemen worksheet.
      let xml = sheet.toXml();
      if (sheet.tabColor) {
        xml = xml.replace('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
          '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          '<sheetPr><tabColor rgb="' + argb(sheet.tabColor) + '"/></sheetPr>');
      }
      entries.push({ name: 'xl/worksheets/sheet' + (index + 1) + '.xml', data: utf8(xml) });
    });

    return zipStore(entries);
  };

  Workbook.prototype.toBlob = function () {
    const bytes = this.build();
    return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  // -------------------------------------------------------------------------
  // 6. Utilitas ekspor
  // -------------------------------------------------------------------------
  function toBase64(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  function download(bytes, fileName) {
    if (typeof document === 'undefined') return;
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName || 'Buku_Nilai.xlsx';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  const XlsxLite = {
    createWorkbook: function () { return new Workbook(); },
    toBase64: toBase64,
    download: download,
    escapeXml: escapeXml,
    columnName: columnName,
    crc32: crc32,
    zipStore: zipStore
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = XlsxLite;
  root.XlsxLite = XlsxLite;
})(typeof self !== 'undefined' ? self : this);
