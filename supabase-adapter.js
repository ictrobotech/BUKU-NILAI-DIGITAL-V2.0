/*!
 * supabase-adapter.js — jembatan Supabase untuk Buku Nilai Digital V2.0
 * ---------------------------------------------------------------------------
 * Berkas ini MENGGANTIKAN blok Apps Script pada app.js:
 *
 *     // ============ GITHUB PAGES API CONFIGURATION ============
 *     const APPS_SCRIPT_API_URL = '...';
 *     async function apiRequest(method,args){ ... }
 *
 * Cukup hapus/timpa blok tersebut dengan satu baris:
 *
 *     <script src="xlsx-lite.js"></script>
 *     <script src="supabase-adapter.js"></script>   <!-- sebelum app.js -->
 *
 * Seluruh sisa app.js (callServer, secure, render, state) tidak perlu diubah,
 * karena protokolnya tetap sama: apiRequest(action, args) -> Promise<result>.
 *
 * Yang ditangani khusus oleh adaptor ini:
 *   1. saveAppAppearance -> gambar latar login diunggah ke Supabase Storage
 *      (bucket login-backgrounds), lalu hanya URL-nya yang disimpan di database.
 *   2. exportExcel -> data diambil dari fungsi api_export_data, berkas .xlsx
 *      dibentuk di browser oleh xlsx-lite.js (tanpa Google Drive), dan
 *      dikembalikan dalam bentuk { fileName, mimeType, base64 } sehingga
 *      fungsi downloadExcel() pada app.js tetap bekerja apa adanya.
 * ---------------------------------------------------------------------------
 */
(function (root) {
  'use strict';

  // =========================================================================
  // KONFIGURASI — sesuaikan dua nilai di bawah dengan proyek Supabase Anda
  // =========================================================================
  const SUPABASE_CONFIG = {
    url: 'https://jhrzblaxfutxcukcaybw.supabase.co',
    anonKey: 'sb_publishable_cdqiG2xL2dmf_Sh2bv5efA_pOniEGNG',

    loginBackgroundBucket: 'login-backgrounds',
    exportBucket: 'exports',

    // Arsipkan setiap berkas ekspor ke bucket 'exports' agar tersimpan.
    // Biarkan false bila cukup diunduh ke perangkat pengguna.
    archiveExports: false,

    // Awalan folder ekspor: 'username/tahun-bulan/berkas.xlsx'
    exportPrefix: 'exports'
  };

  const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const SESSION_STORAGE_KEY = 'bn_untad_session';

  // =========================================================================
  // 1. Pemanggilan inti
  // =========================================================================
  function isConfigured() {
    return Boolean(SUPABASE_CONFIG.url) &&
      SUPABASE_CONFIG.url.indexOf('PROJECT-ID-ANDA') === -1 &&
      SUPABASE_CONFIG.anonKey.indexOf('PASTE_') === -1;
  }

  function currentToken() {
    // Token disimpan app.js pada sessionStorage; dipakai juga oleh Storage.
    try {
      return (root.sessionStorage && root.sessionStorage.getItem(SESSION_STORAGE_KEY)) || '';
    } catch (error) {
      return '';
    }
  }

  // Pembungkus fetch: memudahkan pengujian dan mengikuti global window.fetch.
  function http(url, options) {
    const sender = root.fetch || (typeof fetch === 'function' ? fetch : null);
    if (!sender) return Promise.reject(new Error('Fitur fetch tidak tersedia pada peramban ini.'));
    return sender(url, options);
  }

  function rpc(action, args) {
    if (!isConfigured()) {
      return Promise.reject(new Error(
        'Supabase belum dikonfigurasi. Isi url dan anonKey pada berkas supabase-adapter.js.'));
    }

    return http(SUPABASE_CONFIG.url + '/rest/v1/rpc/api_dispatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': 'Bearer ' + SUPABASE_CONFIG.anonKey,
        'x-app-token': currentToken()
      },
      body: JSON.stringify({ p_action: action, p_args: args || [] })
    }).then(function (response) {
      return response.text().then(function (raw) {
        let payload = null;
        try { payload = raw ? JSON.parse(raw) : null; } catch (error) { payload = null; }

        if (!response.ok) {
          const message = (payload && (payload.message || payload.error || payload.details)) ||
            ('Permintaan ke server gagal (HTTP ' + response.status + ').');
          throw new Error(message);
        }
        if (payload === null) {
          throw new Error('Respons server tidak valid. Periksa koneksi dan konfigurasi Supabase.');
        }
        return payload;
      });
    });
  }

  // =========================================================================
  // 2. Titik masuk yang dipakai app.js
  // =========================================================================
  function apiRequest(method, args) {
    const list = (args || []).slice();

    if (method === 'saveAppAppearance') {
      return prepareAppearance(list).then(function (prepared) {
        return rpc(method, prepared);
      });
    }

    if (method === 'exportExcel') {
      return buildExcel(list);
    }

    return rpc(method, list);
  }

  // =========================================================================
  // 3. Latar login -> Supabase Storage
  // =========================================================================
  function dataUriToBlob(dataUri) {
    const match = /^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUri || '');
    if (!match) throw new Error('Format gambar latar login tidak dikenali.');
    const binary = atob(match[2].replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { blob: new Blob([bytes], { type: match[1] }), type: match[1] };
  }

  function extensionFor(mimeType) {
    if (mimeType === 'image/png') return 'png';
    if (mimeType === 'image/webp') return 'webp';
    return 'jpg';
  }

  function uploadToStorage(bucket, path, blob) {
    const token = currentToken();
    return http(SUPABASE_CONFIG.url + '/storage/v1/object/' + bucket + '/' + path, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_CONFIG.anonKey,
        'Authorization': 'Bearer ' + SUPABASE_CONFIG.anonKey,
        'x-app-token': token,
        'Content-Type': blob.type || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: blob
    }).then(function (response) {
      return response.text().then(function (raw) {
        if (!response.ok) {
          throw new Error('Unggahan gambar gagal (HTTP ' + response.status + '). ' +
            (raw || 'Periksa kebijakan bucket login-backgrounds.'));
        }
        return SUPABASE_CONFIG.url + '/storage/v1/object/public/' + bucket + '/' + path;
      });
    });
  }

  function prepareAppearance(args) {
    const payload = Object.assign({}, (args[1] || {}));
    const token = args[0];

    if (payload.loginBackgroundDataUri) {
      const parsed = dataUriToBlob(payload.loginBackgroundDataUri);
      const path = 'latar-login-' + Date.now() + '-' +
        Math.random().toString(36).slice(2, 8) + '.' + extensionFor(parsed.type);
      return uploadToStorage(SUPABASE_CONFIG.loginBackgroundBucket, path, parsed.blob)
        .then(function (publicUrl) {
          delete payload.loginBackgroundDataUri;
          payload.loginBackgroundUrl = publicUrl;
          return [token, payload];
        });
    }

    return Promise.resolve([token, payload]);
  }

  // =========================================================================
  // 4. Ekspor Excel di sisi klien (pengganti Google Sheets/Drive)
  //    Seluruh tata letak mengikuti formatIdentityExport_, formatStudentsExport_,
  //    formatFormativeExport_, formatSummativeExport_, dan formatRecapExport_.
  // =========================================================================
  const COLOR = {
    navy: '0B1F6B', blue: '123E9A', orange: 'F7941D', green: '84C225',
    oliveTab: 'E9F4D5', peachTab: 'FDF2E4', paleBlue: 'EDF2FB', paleLine: 'F3F7FE',
    stripe: 'F8FAFD', recapColumn: 'FFF5E8', summativeTab: 'A45717', recapTab: '5B4DB5',
    white: 'FFFFFF'
  };

  const BORDER = { border: true };

  function xlsx() {
    if (!root.XlsxLite) {
      throw new Error('Berkas xlsx-lite.js belum dimuat. Sertakan sebelum supabase-adapter.js.');
    }
    return root.XlsxLite;
  }

  function display(value, fallback) {
    const text = (value === null || value === undefined) ? '' : String(value);
    return text.trim() ? text : fallback;
  }

  function materialTitle(material, index) {
    return display(material && material.title, 'Lingkup Materi ' + (index + 1));
  }

  function objectiveText(objective, index) {
    return display(objective, 'Tujuan Pembelajaran ' + (index + 1));
  }

  function scoreCell(value) {
    return (value === null || value === undefined || value === '') ? '' : Number(value);
  }

  function homeroomTeacher(bundle) {
    const profile = bundle.classProfile || {};
    return display(profile.homeroomTeacher, 'Belum diatur');
  }

  function contextLine(bundle) {
    const context = bundle.context || {};
    return 'MAPEL: ' + context.subject + '  |  SEMESTER: ' + context.semester +
      '  |  TAHUN PELAJARAN: ' + context.academicYear;
  }

  function buildExcel(args) {
    const bundle = rpc('exportExcel', args);
    return bundle.then(function (data) {
      if (!data || !data.context) throw new Error('Data ekspor tidak lengkap dari server.');
      const workbook = composeWorkbook(data);

      const bytes = workbook.build();
      const result = {
        fileName: data.fileName || 'Buku_Nilai.xlsx',
        mimeType: MIME_XLSX,
        base64: xlsx().toBase64(bytes)
      };

      if (SUPABASE_CONFIG.archiveExports) {
        const folder = (SUPABASE_CONFIG.exportPrefix || 'exports') + '/' + result.fileName;
        uploadToStorage(SUPABASE_CONFIG.exportBucket, folder, new Blob([bytes], { type: MIME_XLSX }))
          .catch(function () { /* arsip opsional: kegagalan tidak menghentikan unduhan */ });
      }

      return result;
    });
  }

  function composeWorkbook(data) {
    const wb = xlsx().createWorkbook();
    const waliCopy = Boolean(data.waliCopy);
    const includeRecap = Boolean(data.includeRecap) && !waliCopy;

    buildIdentitySheet(wb, data, waliCopy);
    if (!waliCopy) buildStudentsSheet(wb, data);
    buildFormativeSheet(wb, data);
    buildSummativeSheet(wb, data);
    if (includeRecap) buildRecapSheet(wb, data);

    return wb;
  }

  // ---- Lembar 1: IDENTITAS & MATERI (wali kelas: MATERI & TUJUAN) ----------
  function buildIdentitySheet(wb, data, waliCopy) {
    const sheet = wb.addWorksheet(waliCopy ? 'MATERI & TUJUAN' : 'IDENTITAS & MATERI',
      { tabColor: COLOR.navy, gridlines: false });
    const school = data.school || {};
    const context = data.context || {};

    sheet.set(1, 1, 'DAFTAR NILAI KURIKULUM NASIONAL',
      { bold: true, size: 16, color: COLOR.white, fill: COLOR.navy, align: 'center', valign: 'middle' });
    sheet.merge(1, 1, 1, 8);
    sheet.rowHeight(1, 26);

    sheet.set(2, 1, school.schoolName, { bold: true, color: COLOR.white, fill: COLOR.blue, align: 'center' });
    sheet.merge(2, 1, 2, 8);

    const rows = [
      ['NAMA SATUAN PENDIDIKAN', school.schoolName],
      ['STATUS SEKOLAH', school.schoolStatus],
      ['ALAMAT', school.address],
      ['DESA/KELURAHAN', school.village],
      ['KECAMATAN', school.district],
      ['KABUPATEN/KOTA', school.city],
      ['PROVINSI', school.province],
      ['NAMA PENDIDIK', context.teacherName || '-'],
      ['NIP', context.teacherNip || '-'],
      ['MATA PELAJARAN', context.subject],
      ['KELAS', context.className],
      ['WALI KELAS', homeroomTeacher(data)],
      ['SEMESTER', context.semester],
      ['TAHUN PELAJARAN', context.academicYear]
    ];

    const start = 4;
    rows.forEach(function (row, index) {
      const line = start + index;
      sheet.set(line, 1, row[0], Object.assign({ bold: true, color: COLOR.navy, fill: COLOR.paleLine }, BORDER));
      sheet.set(line, 2, display(row[1], '-'), Object.assign({ color: COLOR.navy }, BORDER));
    });

    const head = start + rows.length + 2;
    sheet.set(head, 1, 'DAFTAR MATERI PELAJARAN',
      { bold: true, size: 12, color: COLOR.white, fill: COLOR.orange, align: 'center' });
    sheet.merge(head, 1, head, 3);

    sheet.set(head + 1, 1, 'NO', { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center' });
    sheet.set(head + 1, 2, 'LINGKUP MATERI', { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center' });
    sheet.set(head + 1, 3, 'TUJUAN PEMBELAJARAN', { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center' });

    let row = head + 2;
    (context.materials || []).forEach(function (material, index) {
      const objectives = material.objectives || [];
      const count = Math.max(objectives.length, 1);

      sheet.set(row, 1, index + 1,
        Object.assign({ bold: true, fill: COLOR.oliveTab, align: 'center', valign: 'middle' }, BORDER));
      sheet.set(row, 2, materialTitle(material, index),
        Object.assign({ bold: true, fill: COLOR.peachTab, wrap: true, valign: 'middle' }, BORDER));
      if (count > 1) {
        sheet.merge(row, 1, row + count - 1, 1);
        sheet.merge(row, 2, row + count - 1, 2);
      }

      objectives.forEach(function (objective, objectiveIndex) {
        const line = row + objectiveIndex;
        sheet.set(line, 3, objectiveText(objective, objectiveIndex), Object.assign({ wrap: true }, BORDER));
      });
      if (!objectives.length) sheet.set(row, 3, '', BORDER);

      row += count;
    });

    sheet.colWidth(1, 205 / 7);
    sheet.colWidth(2, 310 / 7);
    sheet.colWidth(3, 500 / 7);
    sheet.colWidth(9, 95 / 7);
  }

  // ---- Lembar 2: DATA MURID ------------------------------------------------
  function buildStudentsSheet(wb, data) {
    const sheet = wb.addWorksheet('DATA MURID', { tabColor: COLOR.green, gridlines: false });

    sheet.set(1, 1, 'DATA MURID', { bold: true, size: 15, color: COLOR.white, fill: COLOR.navy, align: 'center' });
    sheet.merge(1, 1, 1, 3);
    sheet.set(2, 1, 'KELAS: ' + (data.context || {}).className + ' | WALI KELAS: ' + homeroomTeacher(data),
      { bold: true, color: COLOR.white, fill: COLOR.blue, align: 'center' });
    sheet.merge(2, 1, 2, 3);

    sheet.set(4, 1, 'NO.', { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center' });
    sheet.set(4, 2, 'NAMA MURID', { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center' });
    sheet.set(4, 3, 'KELAS', { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center' });

    (data.students || []).forEach(function (student, index) {
      const line = 5 + index;
      const stripe = index % 2 === 0 ? { fill: COLOR.stripe } : {};
      sheet.set(line, 1, index + 1, Object.assign({ align: 'center' }, stripe, BORDER));
      sheet.set(line, 2, student.name, Object.assign({}, stripe, BORDER));
      sheet.set(line, 3, student.className, Object.assign({}, stripe, BORDER));
    });

    sheet.freeze(4, 0);
    sheet.colWidth(1, 60 / 7);
    sheet.colWidth(2, 310 / 7);
    sheet.colWidth(3, 225 / 7);
  }

  // ---- Judul beku untuk lembar nilai --------------------------------------
  function writeFrozenTitle(sheet, lastColumn, title, data) {
    sheet.set(1, 1, 'BUKU NILAI',
      { bold: true, size: 11, color: COLOR.white, fill: COLOR.navy, align: 'center', valign: 'middle' });
    sheet.merge(1, 1, 1, 2);
    sheet.set(1, 3, title,
      { bold: true, size: 15, color: COLOR.white, fill: COLOR.navy, align: 'center', valign: 'middle' });
    sheet.merge(1, 3, 1, lastColumn);

    sheet.set(2, 1, 'KELAS: ' + (data.context || {}).className,
      { bold: true, size: 9, color: COLOR.white, fill: COLOR.blue, align: 'center', valign: 'middle' });
    sheet.merge(2, 1, 2, 2);
    sheet.set(2, 3, contextLine(data),
      { bold: true, color: COLOR.white, fill: COLOR.blue, align: 'center' });
    sheet.merge(2, 3, 2, lastColumn);
    sheet.rowHeight(1, 24);
    sheet.rowHeight(2, 20);
  }

  // ---- Lembar 3: FORMATIF --------------------------------------------------
  function buildFormativeSheet(wb, data) {
    const context = data.context || {};
    const materials = context.materials || [];
    const scoreCount = (data.scoreCounts || {}).formative || 0;
    const scoreStart = 3;
    const last = scoreCount + 3;
    const sheet = wb.addWorksheet('FORMATIF', { tabColor: COLOR.orange, gridlines: false });

    writeFrozenTitle(sheet, last, 'NILAI FORMATIF', data);

    sheet.set(4, 1, 'NO', { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center', valign: 'middle' });
    sheet.merge(4, 1, 5, 1);
    sheet.set(4, 2, 'NAMA', { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center', valign: 'middle' });
    sheet.merge(4, 2, 5, 2);
    sheet.set(4, last, 'RATA-RATA FORMATIF',
      { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center', valign: 'middle', wrap: true });
    sheet.merge(4, last, 5, last);

    let column = scoreStart;
    materials.forEach(function (material, materialIndex) {
      const objectives = material.objectives || [];
      const count = Math.max(objectives.length, 1);
      const color = materialIndex % 2 === 0 ? COLOR.orange : COLOR.green;

      sheet.set(4, column, 'LINGKUP ' + (materialIndex + 1) + ': ' + materialTitle(material, materialIndex),
        { bold: true, color: COLOR.white, fill: color, align: 'center', valign: 'middle', wrap: true });
      if (count > 1) sheet.merge(4, column, 4, column + count - 1);

      for (let i = 0; i < count; i++) {
        const objective = objectives[i];
        sheet.set(5, column + i, 'TP ' + (i + 1) + '\n' + objectiveText(objective, i),
          { bold: true, size: 8, color: COLOR.navy, fill: COLOR.paleBlue, align: 'center', valign: 'middle', wrap: true });
      }
      column += count;
    });

    sheet.rowHeight(4, 34);
    sheet.rowHeight(5, 64);

    const recap = data.recap || [];
    (data.students || []).forEach(function (student, index) {
      const line = 6 + index;
      const scores = (data.formative || {})[student.id] || [];
      const stripe = index % 2 === 0 ? { fill: COLOR.stripe } : {};

      sheet.set(line, 1, index + 1, Object.assign({ align: 'center' }, stripe, BORDER));
      sheet.set(line, 2, student.name, Object.assign({}, stripe, BORDER));
      for (let i = 0; i < scoreCount; i++) {
        sheet.set(line, scoreStart + i, scoreCell(scores[i]),
          Object.assign({ align: 'center', numFmt: '0.00' }, stripe, BORDER));
      }
      sheet.set(line, last, scoreCell(recap[index] && recap[index].formativeAverage),
        Object.assign({ align: 'center', numFmt: '0.00' }, stripe, BORDER));
    });

    sheet.freeze(5, 2);
    sheet.colWidth(1, 55 / 7);
    sheet.colWidth(2, 230 / 7);
    if (scoreCount) for (let i = 0; i < scoreCount; i++) sheet.colWidth(scoreStart + i, 72 / 7);
    sheet.colWidth(last, 85 / 7);
  }

  // ---- Lembar 4: SUMATIF ---------------------------------------------------
  function buildSummativeSheet(wb, data) {
    const context = data.context || {};
    const materials = context.materials || [];
    const perSection = (data.scoreCounts || {}).summative || 0;
    const last = 3 + perSection * 2;
    const sheet = wb.addWorksheet('SUMATIF', { tabColor: COLOR.summativeTab, gridlines: false });

    writeFrozenTitle(sheet, last, 'NILAI SUMATIF', data);

    sheet.set(4, 1, 'NO', { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center', valign: 'middle' });
    sheet.merge(4, 1, 6, 1);
    sheet.set(4, 2, 'NAMA', { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center', valign: 'middle' });
    sheet.merge(4, 2, 6, 2);

    if (perSection) {
      sheet.set(4, 3, 'ASESMEN SUMATIF AKHIR MATERI (ASAM)',
        { bold: true, color: COLOR.white, fill: COLOR.orange, align: 'center', valign: 'middle' });
      sheet.merge(4, 3, 4, 3 + perSection - 1);
      sheet.set(4, 3 + perSection, 'ASESMEN SUMATIF AKHIR SEMESTER (ASAS)',
        { bold: true, color: COLOR.white, fill: COLOR.green, align: 'center', valign: 'middle' });
      sheet.merge(4, 3 + perSection, 4, 3 + perSection * 2 - 1);
    }

    sheet.set(4, last, 'RATA-RATA SUMATIF',
      { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center', valign: 'middle', wrap: true });
    sheet.merge(4, last, 6, last);

    materials.forEach(function (material, index) {
      const asamStart = 3 + index * 2;
      const asasStart = 3 + perSection + index * 2;

      sheet.set(5, asamStart, 'ASAM ' + (index + 1) + ': ' + materialTitle(material, index),
        { bold: true, color: COLOR.navy, fill: COLOR.peachTab, align: 'center', valign: 'middle', wrap: true });
      sheet.merge(5, asamStart, 5, asamStart + 1);
      sheet.set(5, asasStart, 'ASAS ' + (index + 1),
        { bold: true, color: COLOR.navy, fill: COLOR.oliveTab, align: 'center', valign: 'middle' });
      sheet.merge(5, asasStart, 5, asasStart + 1);

      [asamStart, asasStart].forEach(function (start) {
        sheet.set(6, start, 'TES', { bold: true, color: COLOR.navy, fill: COLOR.paleBlue, align: 'center' });
        sheet.set(6, start + 1, 'NON TES', { bold: true, color: COLOR.navy, fill: COLOR.paleBlue, align: 'center' });
      });
    });

    sheet.rowHeight(4, 22);
    sheet.rowHeight(5, 48);
    sheet.rowHeight(6, 18);

    const recap = data.recap || [];
    (data.students || []).forEach(function (student, index) {
      const line = 7 + index;
      const scores = (data.summative || {})[student.id] || {};
      const asam = scores.asam || [];
      const asas = scores.asas || [];
      const stripe = index % 2 === 0 ? { fill: COLOR.stripe } : {};

      sheet.set(line, 1, index + 1, Object.assign({ align: 'center' }, stripe, BORDER));
      sheet.set(line, 2, student.name, Object.assign({}, stripe, BORDER));
      for (let i = 0; i < perSection; i++) {
        sheet.set(line, 3 + i, scoreCell(asam[i]),
          Object.assign({ align: 'center', numFmt: '0.00' }, stripe, BORDER));
        sheet.set(line, 3 + perSection + i, scoreCell(asas[i]),
          Object.assign({ align: 'center', numFmt: '0.00' }, stripe, BORDER));
      }
      sheet.set(line, last, scoreCell(recap[index] && recap[index].summativeAverage),
        Object.assign({ align: 'center', numFmt: '0.00' }, stripe, BORDER));
    });

    sheet.freeze(6, 2);
    sheet.colWidth(1, 55 / 7);
    sheet.colWidth(2, 230 / 7);
    if (perSection * 2) for (let i = 0; i < perSection * 2; i++) sheet.colWidth(3 + i, 74 / 7);
    sheet.colWidth(last, 85 / 7);
  }

  // ---- Lembar 5: REKAP NA --------------------------------------------------
  function buildRecapSheet(wb, data) {
    const context = data.context || {};
    const sheet = wb.addWorksheet('REKAP NA', { tabColor: COLOR.recapTab, gridlines: false });

    sheet.set(1, 1, 'REKAP NILAI AKHIR',
      { bold: true, size: 16, color: COLOR.white, fill: COLOR.navy, align: 'center' });
    sheet.merge(1, 1, 1, 5);
    sheet.set(2, 1, 'KELAS: ' + context.className + '  |  ' + contextLine(data),
      { bold: true, color: COLOR.white, fill: COLOR.blue, align: 'center' });
    sheet.merge(2, 1, 2, 5);
    sheet.set(3, 1, 'Rumus NR (Nilai Rapor): (Formatif × ' + context.formativeWeight +
      '%) + (Sumatif × ' + context.summativeWeight + '%), dinormalisasi terhadap total bobot.',
      { italic: true, color: COLOR.navy, fill: COLOR.paleLine, align: 'center' });
    sheet.merge(3, 1, 3, 5);

    sheet.set(5, 1, 'NO', { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center', valign: 'middle' });
    sheet.set(5, 2, 'NAMA', { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center', valign: 'middle' });
    sheet.set(5, 3, 'RATA-RATA FORMATIF',
      { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center', valign: 'middle', wrap: true });
    sheet.set(5, 4, 'RATA-RATA SUMATIF',
      { bold: true, color: COLOR.white, fill: COLOR.navy, align: 'center', valign: 'middle', wrap: true });
    sheet.set(5, 5, 'NR (NILAI RAPORT)',
      { bold: true, color: COLOR.white, fill: COLOR.orange, align: 'center', valign: 'middle', wrap: true });

    (data.recap || []).forEach(function (row, index) {
      const line = 6 + index;
      const stripe = index % 2 === 0 ? { fill: COLOR.stripe } : {};
      sheet.set(line, 1, row.number, Object.assign({ align: 'center' }, stripe, BORDER));
      sheet.set(line, 2, row.name, Object.assign({}, stripe, BORDER));
      sheet.set(line, 3, scoreCell(row.formativeAverage),
        Object.assign({ align: 'center', numFmt: '0.00' }, stripe, BORDER));
      sheet.set(line, 4, scoreCell(row.summativeAverage),
        Object.assign({ align: 'center', numFmt: '0.00' }, stripe, BORDER));
      sheet.set(line, 5, scoreCell(row.finalScore),
        Object.assign({ align: 'center', numFmt: '0.00', fill: COLOR.recapColumn }, BORDER));
    });

    sheet.rowHeight(5, 34);
    sheet.freeze(5, 0);
    sheet.colWidth(1, 55 / 7);
    sheet.colWidth(2, 300 / 7);
    sheet.colWidth(3, 180 / 7);
    sheet.colWidth(4, 205 / 7);
    sheet.colWidth(5, 105 / 7);
  }

  // =========================================================================
  // 5. Ekspor ke global (dipakai app.js)
  // =========================================================================
  root.SupabaseAdapter = {
    config: SUPABASE_CONFIG,
    apiRequest: apiRequest,
    rpc: rpc,
    buildExcel: buildExcel,
    composeWorkbook: composeWorkbook,
    isConfigured: isConfigured
  };

  // app.js memanggil apiRequest secara global.
  root.apiRequest = apiRequest;
})(typeof self !== 'undefined' ? self : this);
