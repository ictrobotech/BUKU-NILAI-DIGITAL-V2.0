'use strict';

'use strict';
    const state = {
      sessionToken: sessionStorage.getItem('bn_untad_session') || '',
      user: null, school: {}, context: null, classes: [], classProfiles: [], subjects: [],
      students: [], formative: {}, summative: {}, recap: [], scoreCounts: { formative: 0, summative: 0 },
      users: [], homeroomLocked: false, editUserId: null, appearance: { theme: 'professional', loginBackgroundDataUri: '', decimals: 2 }, aboutText: '', activeView: 'identity', waliData: null, waliTab: 'formative'
    };
    const ABOUT_TEMPLATE = [
      'Buku Nilai Digital V2.0 adalah sebuah platform manajemen penilaian siswa yang dikembangkan untuk menjawab kebutuhan transformasi digital dalam dunia pendidikan. Aplikasi ini dirancang secara khusus untuk mempermudah tugas administratif pendidik, sehingga guru dapat lebih berfokus pada hal yang paling penting: merancang pengalaman belajar yang bermakna, mendalam, dan menyenangkan bagi peserta didik. Hadir dengan antarmuka yang intuitif dan alur kerja yang efisien, versi 2.0 ini membawa berbagai peningkatan fungsionalitas untuk memastikan pengelolaan data akademik menjadi lebih cepat, akurat, dan transparan.',
      '',
      '## Fitur dan Keunggulan Utama',
      '- **Otomatisasi Penilaian**: Menghitung akumulasi nilai formatif, sumatif, dan nilai akhir secara otomatis untuk meminimalisir kesalahan perhitungan manual (human error).',
      '- **Keselarasan Kurikulum**: Struktur data yang telah disesuaikan dengan kebutuhan asesmen modern, memudahkan perekaman capaian pembelajaran siswa secara komprehensif.',
      '- **Manajemen Data Terpusat**: Memungkinkan pendidik untuk mengelola, memantau, dan menyimpan rekam jejak akademik siswa secara aman dalam satu platform yang terintegrasi.',
      '- **Efisiensi Ekspor & Pelaporan**: Dilengkapi dengan fitur penarikan data (ekspor) yang rapi dan terstruktur, memudahkan pembuatan rapor.',
      '- **Aksesibilitas Tinggi**: Dibangun dengan teknologi web yang ringan dan responsif, sehingga dapat diakses dengan lancar melalui berbagai perangkat di lingkungan sekolah.',
      '',
      '## Visi Pengembangan',
      'Aplikasi ini dibangun dengan semangat inovasi teknologi pendidikan. Kami percaya bahwa dengan mengintegrasikan sistem komputasi yang tepat guna, proses evaluasi dan asesmen tidak lagi menjadi beban administratif yang menyita waktu, melainkan menjadi instrumen yang kuat untuk mendukung Higher Order Thinking Skills (HOTS) dan perkembangan karakter peserta didik.',
      '',
      '## Informasi Sistem',
      'Pengembang Utama: ICT-ROBOTECH',
      'Institusi: SMP Labschool Untad Palu',
      'Versi Rilis: 2.0 (Agustus 2026)'
    ].join('\n');
    const $ = (selector, root) => (root || document).querySelector(selector);
    const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

    function svg(name) {
      const icons = {
        info:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 10v5"></path><path d="M12 7h.01"></path></svg>',
        check:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>',
        alert:'<svg viewBox="0 0 24 24"><path d="M12 9v4"></path><path d="M12 17h.01"></path><path d="M10.3 3.9 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path></svg>',
        users:'<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M17 11a4 4 0 1 0-1-7.87"></path></svg>',
        lock:'<svg viewBox="0 0 24 24"><path d="M12 17v.01"></path><path d="M12 11v3"></path><path d="M5 10V8a7 7 0 0 1 14 0v2"></path><rect x="3" y="10" width="18" height="11" rx="2"></rect></svg>',
        formula:'<svg viewBox="0 0 24 24"><path d="M4 5h16"></path><path d="m7 5 5 7-5 7"></path><path d="M15 12h5"></path></svg>'
      };
      return icons[name] || '';
    }
    function escapeHtml(value) { return String(value === null || typeof value === 'undefined' ? '' : value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'); }
    function escapeAttr(value) { return escapeHtml(value); }
    function shortText(value, length) { const text=String(value || ''); return text.length>length ? text.slice(0,Math.max(1,length-1))+'…' : text; }
    function toNumber(value) { if(value===null||value===''||typeof value==='undefined') return null; const n=Number(String(value).replace(',','.'));return Number.isFinite(n)?n:null; }
    function round2(value) { return Math.round((Number(value)+Number.EPSILON)*100)/100; }
    // Revisi 33: jumlah desimal rata-rata dapat diatur (2 / 1 / 0) lewat Pengaturan.
    const DECIMAL_MODES=[0,1,2];
    const DECIMALS_STORAGE_KEY='bn_decimals';
    let decimalsMemory=null;   // cadangan bila localStorage tidak bisa dipakai (mode privat/iframe)
    function storedDecimals(){
      try{
        const raw=window.localStorage.getItem(DECIMALS_STORAGE_KEY);
        if(raw!==null&&raw!==''){
          const value=Number(raw);
          if(DECIMAL_MODES.indexOf(value)!==-1)return value;
        }
      }catch(error){/* localStorage diblokir: pakai cache memori */}
      return decimalsMemory;
    }
    function rememberDecimals(value){
      const numeric=Number(value);
      decimalsMemory=DECIMAL_MODES.indexOf(numeric)===-1?null:numeric;
      try{
        if(decimalsMemory===null)window.localStorage.removeItem(DECIMALS_STORAGE_KEY);
        else window.localStorage.setItem(DECIMALS_STORAGE_KEY,String(decimalsMemory));
      }catch(error){/* mode privat/iframe: cukup andalkan cache memori */}
    }
    function normalizeDecimals(raw){
      const value=Number(raw);
      if(DECIMAL_MODES.indexOf(value)!==-1)return value;
      // Kosong/rusak -> pilihan tersimpan di perangkat, atau 2 desimal bila belum pernah memilih.
      if(raw===null||typeof raw==='undefined'||raw==='')return storedDecimals()===null?2:storedDecimals();
      return storedDecimals()===null?2:storedDecimals();
    }
    function decimalMode(){const raw=state.appearance&&state.appearance.decimals;return normalizeDecimals(raw);}
    function decimalDigits(){return decimalMode();}
    // Jumlah desimal efektif untuk sebuah konteks: pengaturan Pemilik/Admin menimpa
    // pilihan lokal (perangkat) bila konteks/data tersebut membawa nilainya.
    function digitsFor(data){
      const raw=data&&data.decimals;
      if(raw!==null&&raw!==undefined&&raw!==''){const value=Number(raw);if(DECIMAL_MODES.indexOf(value)!==-1)return value;}
      return decimalMode();
    }
    // Pengaturan desimal yang dipakai saat menyimpan identitas/materi (ikut tersimpan di server).
    function contextDecimals(){return decimalMode();}
    // Ambil pengaturan desimal dari sebuah konteks/data (dikirim server) tanpa menimpanya bila kosong.
    // Pemilik/Admin: simpan pilihan desimal ke konteks identitas agar akun lain (wali kelas/guru)
    // yang membuka mapel & kelas yang sama ikut memakai pengaturan ini.
    function persistContextDecimals(decimals){
      if(!isAdmin()||!state.context)return;
      const context={...state.context,decimals:Number(decimals)};
      state.context=context;
      // Disimpan per konteks (mapel + kelas) agar akun wali kelas ikut memakainya.
      silentServer('saveContextDecimals',[state.sessionToken,context],()=>{});
      // Cadangan: bila server belum mendukung, simpan juga pada identitas seperti biasa.
      silentServer('saveContext',[state.sessionToken,{school:readSchoolForm(),context}],()=>{});
    }
    // Cadangan bila getContextData belum menyisipi 'decimals': minta langsung ke server.
    let decimalsLookupKey='';
    function fetchContextDecimals(context){
      if(!context||!context.className||!state.sessionToken)return;
      const key=[context.className,context.subject,context.semester,context.academicYear].join('|');
      if(decimalsLookupKey===key)return;
      decimalsLookupKey=key;
      silentServer('getContextDecimals',[state.sessionToken,context],result=>{
        const value=Number(result&&result.decimals);
        if(DECIMAL_MODES.indexOf(value)===-1)return;
        if(Number(state.appearance&&state.appearance.decimals)===value)return;
        state.appearance={...(state.appearance||{}),decimals:value};
        rememberDecimals(value);
        syncDecimalBridge();
        renderAll();
      });
    }
    function adoptContextDecimals(data){
      const raw=data&&data.decimals;
      if(raw===null||raw===undefined||raw==='')return false;
      const value=Number(raw);
      if(DECIMAL_MODES.indexOf(value)===-1)return false;
      if(Number(state.appearance&&state.appearance.decimals)===value)return false;
      state.appearance={...(state.appearance||{}),decimals:value};
      rememberDecimals(value);
      syncDecimalBridge();
      return true;
    }
    function syncDecimalBridge(){try{window.__bnDecimals=decimalMode();}catch(error){/* diabaikan */}}
    function formatScore(value,data){
      if(value===null||typeof value==='undefined'||!Number.isFinite(Number(value)))return '—';
      // Pengaturan 2 desimal mempertahankan gaya lama: nol di belakang koma tidak ditampilkan
      // ("75", bukan "75,00"), sementara 1/0 desimal mengikuti jumlah digit yang dipilih.
      const digits=digitsFor(data);
      const factor=Math.pow(10,digits);
      // Pembulatan setengah ke atas (seperti Excel), bukan setengah ke genap.
      const rounded=Math.round((Number(value)+Number.EPSILON)*factor)/factor;
      return rounded.toLocaleString('id-ID',{minimumFractionDigits:digits===2?0:digits,maximumFractionDigits:digits});
    }
    // Angka untuk berkas Excel/Word (selalu tanpa titik ribuan agar tetap numerik).
    function exportNumber(value,digits){
      if(value===null||typeof value==='undefined'||value===''||!Number.isFinite(Number(value)))return null;
      const factor=Math.pow(10,typeof digits==='number'?digits:decimalDigits());
      return Math.round((Number(value)+Number.EPSILON)*factor)/factor;
    }
    function blankScore(value) { return value===null||typeof value==='undefined'?'':value; }
    function vector(values,length){const source=Array.isArray(values)?values:[];return Array.from({length:Math.max(0,length||0)},(_,i)=>source[i]===null||source[i]===''||typeof source[i]==='undefined'?null:Number(source[i]));}
    function average(values){const n=(values||[]).map(v=>typeof v==='string'?v.trim():v).filter(v=>v!==null&&typeof v!=='undefined'&&v!==''&&Number.isFinite(Number(v))).map(Number);return n.length?round2(n.reduce((a,b)=>a+b,0)/n.length):null;}
    function isAdmin(){return state.user && state.user.role==='ADMIN';}
    function isGuru(){return state.user && state.user.role==='GURU';}
    function isWali(){return state.user && state.user.role==='WALI_KELAS';}
    function roleLabel(role){return role==='ADMIN'?'Pemilik / Admin':role==='GURU'?'Guru Mapel — hanya baca':'Wali Kelas — salin & unduh';}
    function currentSelection(){if(!state.context)return{};return {className:state.context.className,subject:state.context.subject,semester:state.context.semester,academicYear:state.context.academicYear};}
    function contextDescription(){return state.context?`${state.context.className} · ${state.context.subject} · ${state.context.semester} · ${state.context.academicYear}`:'—';}
    // ---------- Revisi 32: urutan akun pada Manajemen Akses ----------
    // Urutan baku rombel (VII -> IX) agar daftar akun tidak lagi mengikuti urutan abjad
    // (yang menaruh "VIII" sebelum "VII"). Nama kelas dibandingkan tanpa spasi/tanda baca
    // supaya variasi penulisan seperti "VII RA Kartini", "VII RA-KARTINI", atau
    // "VII RA KARTINI" tetap terbaca sama.
    const CLASS_ORDER = [
      'VII KH DEWANTARA',
      'VII AHMAD DAHLAN',
      'VII RA KARTINI',
      'VII AHMAD YANI',
      'VIII AGUS SALIM',
      'VIII SIS AL JUFRI',
      'VIII ADAM MALIK',
      'VIII TADULAKO',
      'IX TOMBOLOTUTU',
      'IX S HASANUDIN',
      'IX HJ HAYUN',
      'IX KARANJALEMBA'
    ].map(name=>name.toUpperCase().replace(/[^A-Z0-9]/g,''));
    function classOrderKey(name){
      const original=String(name||'');
      const normalized=original.toUpperCase().replace(/[^A-Z0-9]/g,'');
      const exact=CLASS_ORDER.indexOf(normalized);
      if(exact!==-1)return {tier:0,index:exact};
      // Kelas lain (atau variasi nama): tetap dikelompokkan per tingkat, urut abjad.
      const level=normalized.slice(0,4)==='VIII'?'VIII':normalized.slice(0,3)==='VII'?'VII':normalized.slice(0,2)==='IX'?'IX':'';
      const tier=level?['VII','VIII','IX'].indexOf(level)+1:4;
      return {tier,index:tier,key:normalized,original};
    }
    function compareClassName(a,b){
      const ka=classOrderKey(a),kb=classOrderKey(b);
      if(ka.tier!==kb.tier)return ka.tier-kb.tier;
      if(ka.tier===0)return ka.index-kb.index;
      if(ka.tier===4){const byLevel=String(a||'').localeCompare(String(b||''),'id',{numeric:true});if(byLevel!==0)return byLevel;}
      const byName=String(a||'').localeCompare(String(b||''),'id',{numeric:true,sensitivity:'base'});
      return byName;
    }
    function sortClassProfiles(profiles){return (profiles||[]).slice().sort((a,b)=>compareClassName(a.className,b.className));}
    function subjectRank(subject,list){const index=list.indexOf(subject);return index===-1?list.length:index;}
    function userAccessLabel(user){
      const subjects=Array.isArray(user.subjects)&&user.subjects.length?user.subjects:(user.subject?[user.subject]:[]);
      const ordered=subjects.slice().sort((a,b)=>subjectRank(a,state.subjects||[])-subjectRank(b,state.subjects||[]));
      return {subjects:ordered,text:[ordered.join(', '),user.className].filter(Boolean).join(' · ')||'Semua konteks'};
    }
    // Pemilik/Admin selalu paling atas; akun guru mengikuti susunan kelas, lalu mapel, lalu nama.
    function sortUsersForAccess(users){
      const roleRank={ADMIN:0,GURU:1,WALI_KELAS:2};
      return (users||[]).slice().sort((a,b)=>{
        const roleDiff=(roleRank[a.role]===undefined?9:roleRank[a.role])-(roleRank[b.role]===undefined?9:roleRank[b.role]);
        if(roleDiff!==0)return roleDiff;
        if(a.role==='ADMIN')return String(a.name||'').localeCompare(String(b.name||''),'id');
        const firstSubject=user=>{const u=userAccessLabel(user);return u.subjects.length?u.subjects[0]:'';};
        const byClass=compareClassName(a.className||'',b.className||'');
        if(byClass!==0)return byClass;
        const sa=firstSubject(a),sb=firstSubject(b);
        if(sa!==sb)return subjectRank(sa,state.subjects||[])-subjectRank(sb,state.subjects||[]);
        return String(a.name||'').localeCompare(String(b.name||''),'id');
      });
    }
    function classProfile(className){return state.classProfiles.find(item=>item.className===className)||null;}
    function classLabel(className){const p=classProfile(className);return `${className}${p?` · Wali: ${p.homeroomTeacher||'Belum diatur'}`:''}`;}
    function setBusy(on,text){const overlay=$('#loadingOverlay');if(text)$('#loadingText').textContent=text||'Memproses…';overlay.classList.toggle('show',Boolean(on));}
    function toast(message,type){const el=document.createElement('div');el.className=`toast ${type||''}`;el.innerHTML=`${svg(type==='error'?'alert':type==='success'?'check':'info')}<span>${escapeHtml(message)}</span>`;$('#toastStack').appendChild(el);setTimeout(()=>{el.style.opacity='0';el.style.transform='translateX(15px)';setTimeout(()=>el.remove(),250);},4300);}
    function messageOf(error){return error&&error.message?error.message:String(error||'Terjadi kesalahan yang tidak diketahui.');}

    // ===================== MODAL KONFIRMASI MODERN (pengganti confirm bawaan peramban) =====================
    // Revisi tampilan 26: dialog konfirmasi tampil di tengah layar dengan latar redup.
    // Dipakai untuk: hapus satu murid, hapus massal (kelas aktif / kelas tertentu / semua
    // kelas), dan peringatan perpindahan kelas saat masih ada perubahan yang belum disimpan.
    let studentsDirty=false;let identityDirty=false;
    let bnModalKeyHandler=null;
    function injectModalStyles(){
      if(document.getElementById('bn-modal-style'))return;
      const style=document.createElement('style');style.id='bn-modal-style';
      style.textContent=[
        '.bn-modal-backdrop{position:fixed;inset:0;background:rgba(10,16,32,.62);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);z-index:9998;animation:bnModalFade .18s ease-out}',
        '.bn-modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;width:min(480px,calc(100vw - 28px));max-height:min(86vh,660px);overflow:auto;background:#fff;color:#1d2740;border-radius:20px;box-shadow:0 24px 70px rgba(4,10,30,.38);padding:24px 24px 20px;animation:bnModalPop .2s cubic-bezier(.2,.9,.3,1.15);font-family:inherit}',
        '.bn-modal h3{margin:12px 0 6px;font-size:19px;line-height:1.3;color:#0f1a3d}',
        '.bn-modal-message{font-size:14px;line-height:1.55;color:#43506e}',
        '.bn-modal-message p{margin:6px 0}',
        '.bn-modal-icon{width:52px;height:52px;border-radius:16px;display:grid;place-items:center}',
        '.bn-modal-icon svg{width:26px;height:26px;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
        '.bn-modal-icon.danger{background:#fdecef}.bn-modal-icon.danger svg{stroke:#c2243a}',
        '.bn-modal-icon.warning{background:#fdf3e4}.bn-modal-icon.warning svg{stroke:#b26a08}',
        '.bn-modal-icon.info{background:#eaf0fd}.bn-modal-icon.info svg{stroke:#123e9a}',
        '.bn-modal-warn{margin-top:10px;padding:10px 12px;border-radius:10px;background:#fff5f6;border:1px solid #f3ccd3;color:#8f2b3c;font-size:13px}',
        '.bn-modal-option,.bn-modal-check{display:flex;gap:10px;align-items:flex-start;margin-top:10px;padding:11px 12px;border:1px solid #dfe6f3;border-radius:12px;cursor:pointer;font-size:14px;color:#24304d;transition:border-color .15s,background .15s}',
        '.bn-modal-option:hover,.bn-modal-check:hover{border-color:#9db4e8;background:#f7faff}',
        '.bn-modal-option input,.bn-modal-check input{margin-top:3px;width:16px;height:16px;accent-color:#c2243a;flex:none;cursor:pointer}',
        '.bn-modal-option small{display:block;color:#7a86a3;font-size:12px;margin-top:2px}',
        '.bn-modal-select{margin-top:10px;width:100%;padding:10px 12px;border:1px solid #d5deee;border-radius:10px;font-size:14px;background:#fbfcff;color:#1d2740;font-weight:600}',
        '.bn-modal-select:disabled{opacity:.55;background:#f2f4f9;cursor:not-allowed}',
        '.bn-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px;flex-wrap:wrap}',
        '.bn-modal-button{border:0;border-radius:12px;padding:11px 18px;font-size:14px;font-weight:700;cursor:pointer;min-height:42px;transition:transform .12s,filter .15s,background .15s;font-family:inherit}',
        '.bn-modal-button:active{transform:translateY(1px)}',
        '.bn-modal-button.ghost{background:#eef2f9;color:#33405e}.bn-modal-button.ghost:hover{background:#e2e9f4}',
        '.bn-modal-button.danger{background:linear-gradient(135deg,#d63a52,#a81f36);color:#fff;box-shadow:0 8px 20px rgba(178,32,56,.32)}',
        '.bn-modal-button.danger:hover{filter:brightness(1.08)}',
        '.bn-modal-button.danger:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}',
        '.bn-modal-button.primary{background:linear-gradient(135deg,#1641b0,#0b1f6b);color:#fff;box-shadow:0 8px 20px rgba(11,31,107,.28)}',
        '.bn-modal-button.primary:hover{filter:brightness(1.12)}',
        '@keyframes bnModalFade{from{opacity:0}to{opacity:1}}',
        '@keyframes bnModalPop{from{opacity:0;transform:translate(-50%,-46%) scale(.94)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}',
        '@media (max-width:520px){.bn-modal{padding:20px 16px 16px}.bn-modal-actions{flex-direction:column-reverse}.bn-modal-actions .bn-modal-button{width:100%}}'
      ].join('');
      document.head.appendChild(style);
    }
    function closeAppModal(){
      const host=document.getElementById('bnModalHost');
      if(host)host.innerHTML='';
      if(bnModalKeyHandler){document.removeEventListener('keydown',bnModalKeyHandler);bnModalKeyHandler=null;}
    }
    function openAppModal(options){
      const opt=options||{};
      injectModalStyles();
      let host=document.getElementById('bnModalHost');
      if(!host){host=document.createElement('div');host.id='bnModalHost';document.body.appendChild(host);}
      const tone=opt.tone==='danger'?'danger':opt.tone==='warning'?'warning':'info';
      const iconSvg=tone==='danger'
        ?'<svg viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>'
        :svg(tone==='warning'?'alert':'info');
      host.innerHTML=`<div class="bn-modal-backdrop"></div><div class="bn-modal" role="alertdialog" aria-modal="true" aria-labelledby="bnModalTitle" aria-describedby="bnModalText"><div class="bn-modal-icon ${tone}">${iconSvg}</div><h3 id="bnModalTitle">${escapeHtml(opt.title||'Konfirmasi')}</h3><div class="bn-modal-message" id="bnModalText">${opt.html||''}</div><div class="bn-modal-actions"><button type="button" class="bn-modal-button ghost" data-modal-cancel>${escapeHtml(opt.cancelText||'Batal')}</button><button type="button" class="bn-modal-button ${tone==='danger'?'danger':'primary'}" data-modal-confirm>${escapeHtml(opt.confirmText||'Ya, Lanjutkan')}</button></div></div>`;
      host.querySelector('[data-modal-cancel]').addEventListener('click',closeAppModal);
      host.querySelector('.bn-modal-backdrop').addEventListener('click',closeAppModal);
      host.querySelector('[data-modal-confirm]').addEventListener('click',()=>{
        // false = validasi pada onConfirm gagal, dialog sengaja tetap terbuka.
        if(opt.onConfirm&&opt.onConfirm()===false)return;
        closeAppModal();
      });
      if(opt.onChange)host.addEventListener('change',event=>opt.onChange(event,host));
      bnModalKeyHandler=event=>{if(event.key==='Escape')closeAppModal();};
      document.addEventListener('keydown',bnModalKeyHandler);
      host.querySelector('[data-modal-confirm]').focus();
    }

    // ---------- Hapus satu murid (dialog modern, menggantikan confirm() bawaan) ----------
    function confirmRemoveStudent(student){
      const className=student.className||(state.context&&state.context.className)||'-';
      openAppModal({
        tone:'danger',
        title:'Hapus Data Murid?',
        confirmText:'Ya, Hapus',
        cancelText:'Batal',
        html:`<p>Murid <b>${escapeHtml(student.name)}</b> akan dihapus dari kelas <b>${escapeHtml(className)}</b>.</p><div class="bn-modal-warn">Nilai formatif/sumatif yang terkait akan terhapus setelah data disimpan.</div>`,
        onConfirm:()=>{
          state.students=state.students.filter(item=>item.id!==student.id);
          studentsDirty=true;
          renderStudents();
          toast('Murid dihapus dari daftar sementara. Klik Simpan Data Murid untuk menerapkan.','success');
        }
      });
    }

    // ---------- Hapus data murid massal: kelas aktif / kelas tertentu / semua kelas ----------
    // Deleksi memakai alur resmi: getContextData per kelas lalu saveStudents dengan daftar
    // murid kosong (server menghapus sisa murid kelas tersebut; nilai ikut terhapus oleh FK).
    function deleteClassStudentsFlow(classList,restoreClass,single){
      let index=0;
      const total=classList.length;
      const doneMessage=single?`Data murid kelas ${classList[0]} berhasil dihapus.`:`Data murid ${total} kelas berhasil dihapus.`;
      const step=()=>{
        if(index>=total){
          secure('getContextData',[{...currentSelection(),className:restoreClass}],data=>{
            applyData(data);
            studentsDirty=false;
            toast(doneMessage,'success');
          },'Memuat ulang data kelas…');
          return;
        }
        const className=classList[index];index+=1;
        const progress=`Menghapus data murid kelas ${className} (${index}/${total})…`;
        secure('getContextData',[{...currentSelection(),className}],data=>{
          applyData(data);
          state.students=[];
          secure('saveStudents',[{...currentSelection(),students:[]}],fresh=>{applyData(fresh);step();},progress);
        },progress);
      };
      step();
    }
    function openBulkDeleteStudentsModal(){
      if(!isAdmin())return;
      if(!state.context){toast('Muat konteks penilaian terlebih dahulu.','error');return;}
      const classes=state.classProfiles.map(profile=>profile.className);
      if(!classes.length){toast('Daftar kelas belum tersedia.','error');return;}
      const active=state.context.className;
      const original=active;
      const options=classes.map(name=>`<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join('');
      openAppModal({
        tone:'danger',
        title:'Hapus Data Murid',
        confirmText:'Hapus Sekarang',
        cancelText:'Batal',
        html:`<p>Pilih cakupan penghapusan data murid beserta nilai terkaitnya.</p>
      <label class="bn-modal-option"><input type="radio" name="bn-del-scope" value="active" checked><span><b>Kelas aktif saja</b><small>${escapeHtml(classLabel(active))}</small></span></label>
      <label class="bn-modal-option"><input type="radio" name="bn-del-scope" value="pick"><span><b>Kelas tertentu</b><small>Pilih satu kelas pada daftar di bawah</small></span></label>
      <select id="bnDelClass" class="bn-modal-select" disabled>${options}</select>
      <label class="bn-modal-option"><input type="radio" name="bn-del-scope" value="all"><span><b>Semua kelas</b><small>Seluruh data murid pada ${classes.length} kelas dihapus</small></span></label>
      <label class="bn-modal-check"><input type="checkbox" id="bnDelAck"><span>Saya memahami data murid dan nilai terkait akan dihapus permanen.</span></label>`,
        onChange:event=>{
          if(event.target&&event.target.name==='bn-del-scope'){
            const picker=document.getElementById('bnDelClass');
            if(picker)picker.disabled=event.target.value!=='pick';
          }
        },
        onConfirm:()=>{
          const ack=document.getElementById('bnDelAck');
          if(!ack||!ack.checked){toast('Centang konfirmasi penghapusan terlebih dahulu.','error');return false;}
          const checked=document.querySelector('input[name="bn-del-scope"]:checked');
          const scope=checked?checked.value:'active';
          const picker=document.getElementById('bnDelClass');
          const targetClass=picker?picker.value:'';
          if(scope==='pick'&&!targetClass){toast('Pilih kelas yang akan dihapus datanya.','error');return false;}
          studentsDirty=false;
          if(scope==='active')deleteClassStudentsFlow([active],original,true);
          else if(scope==='pick')deleteClassStudentsFlow([targetClass],original,true);
          else deleteClassStudentsFlow(classes.slice(),original,false);
        }
      });
    }

    // ---------- Pemilih kelas pada Data Murid ----------
    // Keterangan "Data kelas aktif: …" tetap tampil apa adanya; daftar murid yang diinput
    // menyesuaikan kelas yang dipilih pada kotak ini.
    function renderStudentsClassPicker(){
      const select=$('#studentsClassSelect');
      if(!select||!state.context)return;
      renderClassOptions(select,state.context.className,false);
      select.value=state.context.className||'';
    }
    function switchStudentsClass(){
      const select=$('#studentsClassSelect');
      const target=select?select.value:'';
      if(!target||!state.context||target===state.context.className)return;
      const move=()=>secure('getContextData',[{...currentSelection(),className:target}],data=>{
        studentsDirty=false;
        applyData(data);
        toast('Kelas aktif: '+target,'success');
      },'Memuat data murid…');
      if(studentsDirty){
        select.value=state.context.className;
        openAppModal({
          tone:'warning',
          title:'Ada Perubahan Belum Disimpan',
          confirmText:'Buang & Beralih',
          cancelText:'Batal',
          html:`<p>Perubahan data murid di <b>${escapeHtml(state.context.className)}</b> belum disimpan. Beralih ke <b>${escapeHtml(target)}</b> akan membuang perubahan tersebut.</p>`,
          onConfirm:()=>{select.value=target;move();}
        });
        return;
      }
      move();
    }


    // ===================== KONFIGURASI SUPABASE =====================
// apiRequest(method, args) kini disediakan oleh supabase-adapter.js
// (isi url + anonKey pada SUPABASE_CONFIG di dalam berkas tersebut).
// Modul yang wajib dimuat sebelum berkas ini:
//   xlsx-lite.js        -> pembuat berkas .xlsx di sisi klien
//   supabase-adapter.js -> jembatan PostgREST/RPC + Supabase Storage
function callServer(method,args,onSuccess,busyText){
  setBusy(true,busyText||'Memproses data…');
  apiRequest(method,args).then(result=>{setBusy(false);onSuccess(result);}).catch(error=>{setBusy(false);const text=messageOf(error);if(text.indexOf('SESI_BERAKHIR')!==-1){showLogin('Sesi berakhir. Silakan masuk kembali.');}else toast(text,'error');});
}
function secure(method,args,onSuccess,busyText){callServer(method,[state.sessionToken].concat(args||[]),onSuccess,busyText);}

    function applyAppearance(appearance,options){const value=appearance||{};const opt=options||{};
      const hasDecimals=Object.prototype.hasOwnProperty.call(value,'decimals')&&!opt.keepDecimals;
      // Pengaturan desimal tidak boleh hilang hanya karena server belum menyimpan field ini:
      // bila balasan server tidak memuat 'decimals', pakai pilihan tersimpan di perangkat/memori.
      const decimals=hasDecimals?normalizeDecimals(value.decimals):(storedDecimals()!==null?storedDecimals():(state.appearance&&DECIMAL_MODES.indexOf(Number(state.appearance.decimals))!==-1?Number(state.appearance.decimals):2));
      state.appearance={theme:value.theme==='modern'?'modern':'professional',loginBackgroundDataUri:value.loginBackgroundDataUri||'',decimals};
      if(hasDecimals)rememberDecimals(decimals);
      syncDecimalBridge();document.body.classList.remove('theme-professional','theme-modern');document.body.classList.add(`theme-${state.appearance.theme}`);const screen=$('#authScreen');if(state.appearance.loginBackgroundDataUri){screen.style.setProperty('--login-background',`url("${state.appearance.loginBackgroundDataUri}")`);screen.classList.add('has-login-background');}else{screen.style.removeProperty('--login-background');screen.classList.remove('has-login-background');}renderAppearancePanel();}
    function resetLoginFields(){const username=$('#loginUsername'),password=$('#loginPassword'),toggle=$('#toggleLoginPassword');if(username)username.value='';if(password){password.value='';password.type='password';}if(toggle){toggle.setAttribute('aria-pressed','false');toggle.setAttribute('aria-label','Tampilkan kata sandi');}}
    function toggleLoginPassword(){const input=$('#loginPassword'),button=$('#toggleLoginPassword');const visible=input.type==='text';input.type=visible?'password':'text';button.setAttribute('aria-pressed',String(!visible));button.setAttribute('aria-label',visible?'Tampilkan kata sandi':'Sembunyikan kata sandi');}

    function showLogin(message){
      clearInterval(heartbeatTimer);clearInterval(presenceTimer);state.sessionToken='';state.user=null;sessionStorage.removeItem('bn_untad_session');resetLoginFields();$('#appShell').classList.add('is-hidden');$('#authScreen').hidden=false;$('#setupBox').hidden=true;$('#loginBox').hidden=false;$('#loginStatus').textContent=message||'';$('#loginUsername').focus();
    }
    function showSetup(status){$('#authScreen').hidden=false;$('#appShell').classList.add('is-hidden');$('#loginBox').hidden=true;$('#setupBox').hidden=false;$('#setupStatus').textContent=`Basis data: ${status.storagePath||'Supabase'} · proyek ${(window.SupabaseAdapter&&SupabaseAdapter.config.url||'').replace(/^https?:\/\//,'').split('.')[0]}.`;}
    function bootstrap(){
      if(!window.SupabaseAdapter || !SupabaseAdapter.isConfigured()){
        setBusy(false);
        $('#authScreen').hidden=false;
        $('#appShell').classList.add('is-hidden');
        $('#setupBox').hidden=true;
        $('#loginBox').hidden=false;
        $('#loginStatus').textContent='Frontend siap. Admin perlu mengisi url dan anonKey pada SUPABASE_CONFIG di supabase-adapter.js sebelum aplikasi digunakan.';
        return;
      }
      callServer('getAppStatus',[],status=>{
        applyAppearance(status.appearance,{keepDecimals:true});
        if(status.setupRequired){showSetup(status);return;}
        if(!state.sessionToken){showLogin();return;}
        callServer('getInitialData',[state.sessionToken],data=>{if(data.setupRequired){showSetup(status);}else applyData(data);},'Memulihkan sesi…');
      },'Memeriksa aplikasi…');
    }
    function login(){const username=$('#loginUsername').value.trim(),password=$('#loginPassword').value;resetLoginFields();if(!username||!password){toast('Username dan kata sandi wajib diisi.','error');return;}callServer('login',[{username,password}],result=>{state.sessionToken=result.sessionToken;sessionStorage.setItem('bn_untad_session',state.sessionToken);callServer('getInitialData',[state.sessionToken],applyData,'Memuat buku nilai…');},'Memverifikasi akun…');}
    function activate(){const folderUrlOrId=$('#setupFolder').value.trim(),name=$('#setupOwnerName').value.trim(),username=$('#setupUsername').value.trim(),password=$('#setupPassword').value,confirm=$('#setupPasswordConfirm').value;const projectNote=folderUrlOrId;if(!name||!username||!password){toast('Nama pemilik, username, dan kata sandi wajib diisi.','error');return;}void projectNote;if(password!==confirm){toast('Ulangi kata sandi harus sama.','error');return;}callServer('initializeApplication',[{folderUrlOrId,owner:{name,username,password}}],result=>{state.sessionToken=result.sessionToken;sessionStorage.setItem('bn_untad_session',state.sessionToken);toast(result.message,'success');callServer('getInitialData',[state.sessionToken],applyData,'Menyiapkan aplikasi…');},'Membuat akun Pemilik/Admin pada Supabase…');}
    let heartbeatTimer=null, presenceTimer=null;
    function silentServer(method,args,onSuccess){if(!state.sessionToken)return;apiRequest(method,args).then(result=>{if(onSuccess)onSuccess(result);}).catch(()=>{});}
    function startPresenceTimers(){clearInterval(heartbeatTimer);clearInterval(presenceTimer);if(!state.sessionToken)return;heartbeatTimer=setInterval(()=>silentServer('heartbeat',[state.sessionToken]),60000);if(isAdmin())presenceTimer=setInterval(()=>silentServer('getUserPresence',[state.sessionToken],result=>{state.users=result.users||state.users;if(!state.editUserId)renderUsers();renderHomeroomManager();}),30000);}
    function logout(){clearInterval(heartbeatTimer);clearInterval(presenceTimer);callServer('logout',[state.sessionToken],()=>showLogin('Anda telah keluar dari aplikasi.'),'Keluar dari aplikasi…');}

    function applyData(data){
      state.user=data.user||state.user;state.school=data.school||{};state.context=data.context||null;
      // Pengaturan desimal milik konteks (disimpan Pemilik/Admin) berlaku untuk semua akun.
      const adopted=adoptContextDecimals(state.context);
      if(!adopted)fetchContextDecimals(state.context);state.classes=data.classes||[];state.classProfiles=data.classProfiles||[];state.subjects=data.subjects||[];state.students=data.students||[];state.formative=data.formative||{};state.summative=data.summative||{};state.recap=data.recap||[];state.scoreCounts=data.scoreCounts||{formative:0,summative:0};state.users=data.users||state.users||[];state.homeroomLocked=Boolean(data.homeroomLocked);if(data.appearance)applyAppearance(data.appearance,{keepDecimals:true});if(typeof data.aboutText==='string')state.aboutText=data.aboutText;
      $('#authScreen').hidden=true;$('#appShell').classList.remove('is-hidden');renderAll();startPresenceTimers();
    }
    function renderAll(){renderAccount();updateRoleUI();renderDecimalPicker();showView(state.activeView,false);}
    function renderView(name){if(name==='identity')renderIdentity();else if(name==='settings')renderSettings();else if(name==='students')renderStudents();else if(name==='formative')renderFormative();else if(name==='summative')renderSummative();else if(name==='recap')renderRecap();else if(name==='about')renderAbout();}
    function renderAccount(){if(!state.user)return;$('#accountAvatar').textContent=(state.user.name||'?').split(/\s+/).slice(0,2).map(t=>t[0]).join('').toUpperCase();$('#accountName').textContent=state.user.name;$('#accountRole').textContent=roleLabel(state.user.role);}
    function renderAdminCredentials(){const input=$('#adminUsername');if(!input||!state.user)return;if(isAdmin())input.value=state.user.username||'';}
    function saveAdminCredentials(){const username=$('#adminUsername').value.trim(),currentPassword=$('#adminCurrentPassword').value,newPassword=$('#adminNewPassword').value,confirmPassword=$('#adminConfirmPassword').value;if(!username||!currentPassword){toast('Username dan kata sandi saat ini wajib diisi.','error');return;}if(newPassword!==confirmPassword){toast('Ulangi kata sandi baru harus sama.','error');return;}secure('updateAdminCredentials',[{username,currentPassword,newPassword}],result=>{state.sessionToken=result.sessionToken;sessionStorage.setItem('bn_untad_session',state.sessionToken);state.user=result.user;state.users=result.users||state.users;$('#adminCurrentPassword').value='';$('#adminNewPassword').value='';$('#adminConfirmPassword').value='';renderAccount();renderAdminCredentials();renderUsers();startPresenceTimers();toast('Username / kata sandi Pemilik berhasil diperbarui.','success');},'Memperbarui keamanan akun pemilik…');}
    function updateRoleUI(){ 
      document.body.dataset.role=state.user?state.user.role:'';
      $$('.admin-only').forEach(el=>el.hidden=!isAdmin());
const allowed=isAdmin()?['identity','students','formative','summative','recap','about','settings']:isGuru()?['identity','recap','about']:['recap','about'];
      $$('.nav-item[data-view-target]').forEach(btn=>{btn.hidden=allowed.indexOf(btn.dataset.viewTarget)===-1;});$('#sidebarLogoutButton').hidden=isAdmin();$('#logoutButton').hidden=!isAdmin();
      if(allowed.indexOf(state.activeView)===-1)state.activeView=isWali()?'recap':'identity';
      // Pengaturan desimal hanya milik pemilik/guru mapel; wali kelas memakai desimal yang sudah ditetapkan pemilik mapel.
      $('#normalRecap').hidden=isWali();$('#decimalQuickBox').hidden=isWali();$('#exportActions').hidden=!isAdmin();$('#waliCopyPanel').hidden=!isWali();
      $('#roleIdentityNote').hidden=!isGuru();
      if(isWali())$('#recapIntro').textContent='Pilih mata pelajaran pada kelas yang dipegang, lalu salin atau unduh pengisian nilai Formatif dan Sumatif.';
      else $('#recapIntro').textContent=isGuru()?'Akun guru berada dalam mode baca. Nilai tidak dapat disalin, diunduh, atau diubah dari akun ini.':'Rekap akhir dihitung otomatis dari nilai formatif dan sumatif pada konteks aktif.';
    }
    function showView(name,update=true){const allowed=isAdmin()?['identity','students','formative','summative','recap','about','settings']:isGuru()?['identity','recap','about']:['recap','about'];if(allowed.indexOf(name)===-1)name=isWali()?'recap':'identity';if(update)state.activeView=name;renderView(name);$$('.view').forEach(view=>view.classList.toggle('active',view.id===`view-${name}`));$$('.nav-item').forEach(btn=>btn.classList.toggle('active',btn.dataset.viewTarget===name));requestAnimationFrame(()=>$$('[data-score-range]').forEach(slider=>slider._refreshScoreSlider&&slider._refreshScoreSlider()));window.scrollTo({top:0,behavior:'smooth'});}
    // Nilai default identitas sekolah — sama persis dengan yang dipulihkan tombol Reset Data
    // (public.api_reset_application_data). Kolom yang isinya masih sama dengan default
    // ditampilkan sebagai teks petunjuk (placeholder) agar admin tahu nilai bakunya.
    const SCHOOL_DEFAULTS = {"#schoolName":"SMP LABSCHOOL UNTAD PALU","#schoolStatus":"Swasta",
      "#schoolAddress":"Jl. SETIABUDI NO. 14","#schoolVillage":"BESUSU TIMUR","#schoolDistrict":"PALU TIMUR",
      "#schoolCity":"-","#schoolProvince":"SULAWESI TENGAH"};
    function applySchoolFieldHint(id,value){const el=$(id);if(!el)return;const baku=SCHOOL_DEFAULTS[id]||"";el.placeholder=baku;const bersih=(value===null||typeof value==="undefined")?"":String(value).trim();el.value=(bersih&&bersih!==baku)?value:"";}

    // ---------- Identitas, materi dinamis, akun admin ----------
    function defaultClientMaterials(){return Array.from({length:5},()=>({title:'',objectives:Array.from({length:8},()=> '')}));}
    function safeMaterials(materials){const source=Array.isArray(materials)&&materials.length?materials:defaultClientMaterials();return source.map(m=>({title:(m&&m.title)||'',objectives:Array.isArray(m&&m.objectives)&&m.objectives.length?m.objectives.map(o=>o||''):['']}));}
    function materialTitleLabel(material,index){return material&&material.title?material.title:`Lingkup Materi ${index+1}`;}
    function objectiveLabel(objective,index){return objective||`Tujuan Pembelajaran ${index+1}`;}
    // Revisi 29: label "Kelas — <wali>" pada Identitas Pembelajaran mengikuti kelas yang dipilih.
    function updateClassHomeroomHint(){const select=$('#className');if(!select)return;const profile=classProfile(select.value);$('#classHomeroomHint').textContent=profile?`— ${profile.homeroomTeacher||'Belum diatur'}`:'';}
    // Revisi 30: mengganti kelas pada Identitas Pembelajaran langsung memuat konteks kelas
    // tersebut (lingkup materi + tujuan pembelajaran yang tersimpan) tanpa perlu menekan
    // tombol Muat Konteks. Bila masih ada isian identitas/materi yang belum disimpan,
    // tampilkan dialog "Buang & Beralih" agar tidak hilang diam-diam.
    function handleIdentityClassChange(){
      const select=$('#className');
      if(!select||!state.context)return;
      const target=select.value;
      updateClassHomeroomHint();
      if(!target||target===state.context.className)return;
      const proceed=()=>{identityDirty=false;loadContext();};
      if(identityDirty){
        select.value=state.context.className;
        updateClassHomeroomHint();
        openAppModal({
          tone:'warning',
          title:'Ada Perubahan Belum Disimpan',
          confirmText:'Buang & Beralih',
          cancelText:'Batal',
          html:`<p>Perubahan Identitas / Materi pada <b>${escapeHtml(state.context.className)}</b> belum disimpan. Memuat konteks <b>${escapeHtml(target)}</b> akan membuang perubahan tersebut.</p>`,
          onConfirm:()=>{select.value=target;updateClassHomeroomHint();proceed();}
        });
        return;
      }
      proceed();
    }
    function renderClassOptions(select,selected,includeWali=true){select.innerHTML=sortClassProfiles(state.classProfiles).map(p=>`<option value="${escapeAttr(p.className)}">${escapeHtml(includeWali?classLabel(p.className):p.className)}</option>`).join('');select.value=selected||state.classes[0]||'';}
    function renderSubjectOptions(select,selected,allowedSubjects){const source=Array.isArray(allowedSubjects)&&allowedSubjects.length?allowedSubjects:(state.subjects||[]);const subjects=Array.from(new Set([selected].concat(source).filter(Boolean)));select.innerHTML=subjects.map(subject=>`<option value="${escapeAttr(subject)}">${escapeHtml(subject)}</option>`).join('');select.value=selected||subjects[0]||'';}
    function renderIdentity(){
      if(!state.context)return;
      const s=state.school,c=state.context;const teacherSubjects=isGuru()&&Array.isArray(state.user.subjects)&&state.user.subjects.length?state.user.subjects:state.subjects;applySchoolFieldHint('#schoolName',s.schoolName);applySchoolFieldHint('#schoolStatus',s.schoolStatus);applySchoolFieldHint('#schoolAddress',s.address);applySchoolFieldHint('#schoolVillage',s.village);applySchoolFieldHint('#schoolDistrict',s.district);applySchoolFieldHint('#schoolCity',s.city);applySchoolFieldHint('#schoolProvince',s.province);$('#teacherName').value=c.teacherName||'';$('#teacherNip').value=c.teacherNip||'';renderSubjectOptions($('#mapelName'),c.subject||'',teacherSubjects);$('#semester').value=c.semester||'GANJIL';$('#academicYear').value=c.academicYear||'';$('#formativeWeight').value=c.formativeWeight??50;$('#summativeWeight').value=c.summativeWeight??50;
      renderClassOptions($('#className'),c.className,true);$('#mapelOptions').innerHTML=state.subjects.map(subject=>`<option value="${escapeAttr(subject)}"></option>`).join('');
      updateClassHomeroomHint();
      const admin=isAdmin();['schoolName','schoolStatus','schoolAddress','schoolVillage','schoolDistrict','schoolCity','schoolProvince','teacherName','teacherNip','formativeWeight','summativeWeight'].forEach(id=>{$('#'+id).disabled=!admin;});
      $('#saveContextButton').hidden=!admin;
      $('#className').disabled=isGuru()&&Boolean(state.user.className);$('#mapelName').disabled=isGuru()&&teacherSubjects.length<=1;$('#semester').disabled=false;$('#academicYear').readOnly=false;
      renderMaterials(safeMaterials(c.materials));
    }
    function renderSettings(){if(!isAdmin())return;renderHomeroomManager();renderUsers();renderAdminCredentials();renderAppearancePanel();}
    function renderMaterials(materials){const admin=isAdmin();$('#materialsBuilder').innerHTML=materials.map((m,mi)=>`<article class="material-card" data-material-index="${mi}"><div class="material-top"><span class="scope-number">${mi+1}</span><input class="material-title" data-material-title="${mi}" maxlength="200" value="${escapeAttr(m.title||'')}" placeholder="Contoh: Lingkup Materi ${mi+1}" ${admin?'':'disabled'} aria-label="Judul lingkup materi ${mi+1}">${admin?`<button class="tiny-icon" type="button" data-material-action="delete-material" data-material-index="${mi}" title="Hapus lingkup materi"><svg viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path></svg></button>`:''}</div><div class="tp-list">${m.objectives.map((o,oi)=>`<div class="tp-row"><span class="tp-tag">TP ${oi+1}</span><textarea data-objective-material="${mi}" data-objective-index="${oi}" maxlength="500" placeholder="Contoh: Tujuan Pembelajaran ${oi+1}" ${admin?'':'disabled'}>${escapeHtml(o||'')}</textarea>${admin?`<button class="tiny-icon neutral" type="button" data-material-action="delete-objective" data-material-index="${mi}" data-objective-index="${oi}" title="Hapus tujuan pembelajaran"><svg viewBox="0 0 24 24"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg></button>`:'<span></span>'}</div>`).join('')}</div>${admin?`<div class="material-footer"><button class="button secondary compact" type="button" data-material-action="add-objective" data-material-index="${mi}">+ Tujuan Pembelajaran</button></div>`:''}</article>`).join('');}
    function materialsFromDOM(){const cards=$$('article.material-card[data-material-index]',$('#materialsBuilder'));if(!cards.length)return safeMaterials(state.context&&state.context.materials);return cards.map(card=>{const titleInput=$('[data-material-title]',card);return {title:titleInput?titleInput.value.trim():'',objectives:$$('[data-objective-material]',card).map(input=>input.value.trim())};});}
    function materialAction(button){const action=button.dataset.materialAction;const mi=Number(button.dataset.materialIndex);const oi=Number(button.dataset.objectiveIndex);const materials=materialsFromDOM();if(action==='delete-material'){if(materials.length<=1){toast('Minimal satu lingkup materi harus tersedia.','error');return;}materials.splice(mi,1);}if(action==='add-objective'){if(materials[mi].objectives.length>=20){toast('Maksimal 20 tujuan pembelajaran untuk satu lingkup materi.','error');return;}materials[mi].objectives.push('');}if(action==='delete-objective'){if(materials[mi].objectives.length<=1){toast('Minimal satu tujuan pembelajaran harus tersedia.','error');return;}materials[mi].objectives.splice(oi,1);}renderMaterials(materials);}
    function addMaterial(){const materials=materialsFromDOM();if(materials.length>=12){toast('Maksimal 12 lingkup materi.','error');return;}materials.push({title:'',objectives:['']});renderMaterials(materials);}
    function readContextForm(){const className=$('#className').value,subject=$('#mapelName').value.trim();if(!className||!subject)throw new Error('Kelas dan mata pelajaran wajib diisi.');return {className,subject,semester:$('#semester').value,academicYear:$('#academicYear').value.trim(),teacherName:$('#teacherName').value.trim(),teacherNip:$('#teacherNip').value.trim(),formativeWeight:$('#formativeWeight').value,summativeWeight:$('#summativeWeight').value,materials:materialsFromDOM()};}
    function readSchoolForm(){const nilai=id=>{const el=$(id);const teks=el?el.value.trim():'';return teks||SCHOOL_DEFAULTS[id]||'';};return {schoolName:nilai('#schoolName'),schoolStatus:nilai('#schoolStatus'),address:nilai('#schoolAddress'),village:nilai('#schoolVillage'),district:nilai('#schoolDistrict'),city:nilai('#schoolCity'),province:nilai('#schoolProvince'),defaultSemester:$('#semester').value,defaultAcademicYear:$('#academicYear').value.trim()};}
    function loadContext(){let selection;try{selection=readContextForm();}catch(error){toast(error.message,'error');return;}secure('getContextData',[selection],data=>{identityDirty=false;applyData(data);},'Memuat konteks kelas dan mapel…');}
    function saveContext(){let context;try{context=readContextForm();}catch(error){toast(error.message,'error');return;}context={...context,decimals:contextDecimals()};secure('saveContext',[{school:readSchoolForm(),context}],data=>{identityDirty=false;applyData(data);toast('Identitas dan materi berhasil disimpan.','success');},'Menyimpan identitas dan materi…');}

    function renderHomeroomManager(){const body=$('#homeroomManagerBody');if(!body)return;
      // Revisi 27: baca dulu isi kolom yang sedang diketik agar tidak hilang saat panel
      // dibangun ulang oleh polling presence admin (tiap 30 detik).
      const terisi={};$$('[data-homeroom-class]').forEach(input=>{terisi[input.dataset.homeroomClass]=input.value;});
      const locked=state.homeroomLocked;body.innerHTML=sortClassProfiles(state.classProfiles).map(p=>{const wali=(state.users||[]).find(user=>user.role==='WALI_KELAS'&&user.className===p.className&&user.active);const presence=wali?` <span class="presence-status" title="${wali.online?'Wali kelas sedang online':'Wali kelas offline'}"><i class="presence-dot ${wali.online?'online':'offline'}"></i>${wali.online?'Online':'Offline'}</span>`:'';return `<tr><td>${escapeHtml(p.className)}${presence}</td><td><input class="homeroom-input" data-homeroom-class="${escapeAttr(p.className)}" maxlength="120" value="${escapeAttr(terisi.hasOwnProperty(p.className)?terisi[p.className]:(p.homeroomTeacher||''))}" placeholder="Masukkan nama wali kelas" ${locked?'disabled':''}></td></tr>`;}).join('');$('#saveHomeroomButton').hidden=locked;$('#unlockHomeroomButton').hidden=!locked;$('#homeroomLockNote').innerHTML=locked?`${svg('lock')}<div><strong>Daftar wali kelas terkunci.</strong> Nama yang sudah disimpan tidak dapat diubah atau dihapus secara langsung. Klik <b>Buka Pengeditan</b> bila pemilik ingin memperbarui data.</div>`:`${svg('info')}<div><strong>Mode pengeditan aktif.</strong> Kolom kosong menampilkan hint “Masukkan nama wali kelas”. Klik <b>Simpan & Kunci</b> setelah data selesai.</div>`;}
    function saveHomerooms(){const values={};$$('[data-homeroom-class]').forEach(input=>{values[input.dataset.homeroomClass]=input.value.trim();});const profiles=state.classProfiles.map(p=>({className:p.className,homeroomTeacher:Object.prototype.hasOwnProperty.call(values,p.className)?values[p.className]:p.homeroomTeacher}));secure('saveHomeroomTeachers',[profiles],result=>{state.classProfiles=result.classProfiles;state.homeroomLocked=Boolean(result.homeroomLocked);renderAll();toast('Nama wali kelas berhasil disimpan dan daftar dikunci.','success');},'Menyimpan dan mengunci wali kelas…');}
    function unlockHomerooms(){secure('unlockHomeroomTeachers',[],result=>{state.homeroomLocked=Boolean(result.homeroomLocked);renderHomeroomManager();toast('Pengeditan daftar wali kelas dibuka.','success');},'Membuka pengeditan wali kelas…');}
    function renderUsers(forceClear){const classSelect=$('#newUserClass');if(!classSelect)return;
      // Revisi 27: simpan dulu isian formulir yang belum disimpan, lalu dipulihkan setelah
      // render ulang. Tanpa ini, polling presence admin (tiap 30 detik) membangun ulang panel
      // dan menghapus teks yang sedang diketik (nama/username/sandi/mapel/kelas akun baru).
      const sebelum={name:$('#newUserName').value,username:$('#newUserUsername').value,password:$('#newUserPassword').value,role:$('#newUserRole').value,className:classSelect.value,subjects:$$('[data-new-user-subject]:checked').map(input=>input.dataset.newUserSubject)};
      const adaIsian=sebelum.name!==''||sebelum.username!==''||sebelum.password!==''||Boolean(sebelum.className)||sebelum.subjects.length>0;
      const editing=(state.users||[]).find(user=>user.id===state.editUserId)||null;classSelect.innerHTML='<option value="">Semua Kelas (Khusus Guru Mapel)</option>'+sortClassProfiles(state.classProfiles).map(p=>`<option value="${escapeAttr(p.className)}">${escapeHtml(p.className)}</option>`).join('');const editSubjects=editing&&Array.isArray(editing.subjects)?editing.subjects:(editing&&editing.subject?[editing.subject]:(!forceClear&&adaIsian?sebelum.subjects:[]));const checklist=$('#newUserSubjectsChecklist');checklist.innerHTML=state.subjects.map(subject=>`<label class="subject-check-option"><input type="checkbox" data-new-user-subject="${escapeAttr(subject)}" ${editSubjects.indexOf(subject)!==-1?'checked':''}><span>${escapeHtml(subject)}</span></label>`).join('');if(editing){$('#newUserName').value=editing.name||'';$('#newUserUsername').value=editing.username||'';$('#newUserPassword').value='';$('#newUserPassword').placeholder='Kosongkan bila tidak diubah';$('#newUserRole').value=editing.role;classSelect.value=editing.className||'';$('#createUserButton').textContent='Simpan Perubahan Akun';$('#cancelEditUserButton').hidden=false;}else if(!forceClear&&adaIsian){$('#newUserName').value=sebelum.name;$('#newUserUsername').value=sebelum.username;$('#newUserPassword').value=sebelum.password;$('#newUserPassword').placeholder='Minimal 8 karakter';$('#newUserRole').value=sebelum.role||'GURU';classSelect.value=sebelum.className||'';$('#createUserButton').textContent='Tambah Akun Akses';$('#cancelEditUserButton').hidden=true;}
      else{$('#newUserName').value='';$('#newUserUsername').value='';$('#newUserPassword').value='';$('#newUserPassword').placeholder='Minimal 8 karakter';$('#newUserRole').value='GURU';classSelect.value='';$('#createUserButton').textContent='Tambah Akun Akses';$('#cancelEditUserButton').hidden=true;}const body=$('#usersTableBody');if(!isAdmin()){body.innerHTML='';return;}body.innerHTML=sortUsersForAccess(state.users).map(user=>{const access=userAccessLabel(user).text;const presence=(user.role==='GURU'||user.role==='WALI_KELAS')?`<br><span class="presence-status"><i class="presence-dot ${user.online?'online':'offline'}"></i>${user.online?'Online':'Offline'}</span>`:'';const manageable=user.id!==state.user.id&&user.role!=='ADMIN';const actions=manageable?`<div class="inline-actions" style="justify-content:center"><button class="button secondary compact" type="button" data-edit-user="${escapeAttr(user.id)}">Ubah</button><button class="button danger compact" type="button" data-delete-user="${escapeAttr(user.id)}">Hapus</button><button class="button ${user.active?'danger':'secondary'} compact" type="button" data-toggle-user="${escapeAttr(user.id)}" data-next-active="${user.active?'false':'true'}">${user.active?'Nonaktifkan':'Aktifkan'}</button></div>`:'—';return `<tr><td>${escapeHtml(user.name)}</td><td>${escapeHtml(user.username)}</td><td><span class="access-role ${escapeAttr(user.role)}">${escapeHtml(roleLabel(user.role))}</span></td><td>${escapeHtml(access)}</td><td>${user.active?'<span class="tag">Aktif</span>':'<span class="tag" style="color:#8d3440;background:#fff0f2">Nonaktif</span>'}${presence}</td><td class="center">${actions}</td></tr>`;}).join('')||`<tr><td colspan="6"><div class="empty-state">${svg('users')}<b>Belum ada akun tambahan</b></div></td></tr>`;}
    function resetUserEditor(){state.editUserId=null;renderUsers(true);}
    function beginEditUser(userId){const user=(state.users||[]).find(item=>item.id===userId);if(!user)return;state.editUserId=user.id;renderUsers();const field=$('#newUserName');if(field&&typeof field.scrollIntoView==='function')field.scrollIntoView({behavior:'smooth',block:'center'});}
    function createUser(){const payload={name:$('#newUserName').value.trim(),username:$('#newUserUsername').value.trim(),password:$('#newUserPassword').value,role:$('#newUserRole').value,subjects:$$('[data-new-user-subject]:checked').map(input=>input.dataset.newUserSubject),className:$('#newUserClass').value};const editing=state.editUserId;const method=editing?'updateUser':'createUser';const args=editing?[editing,payload]:[payload];secure(method,args,result=>{state.users=result.users;state.editUserId=null;renderUsers(true);toast(editing?'Akun berhasil diperbarui.':'Akun akses berhasil dibuat.','success');},editing?'Menyimpan perubahan akun…':'Membuat Akun Akses…');}
    function deleteUserAccount(userId){const user=(state.users||[]).find(item=>item.id===userId);if(!user)return;if(!confirm(`Hapus akun ${user.name}? Akun tidak dapat dipulihkan.`))return;secure('deleteUser',[userId],result=>{state.users=result.users;if(state.editUserId===userId)state.editUserId=null;renderUsers();toast('Akun berhasil dihapus.','success');},'Menghapus akun…');}
    function toggleUser(button){secure('setUserActive',[button.dataset.toggleUser,button.dataset.nextActive==='true'],result=>{state.users=result.users;renderUsers();toast('Status pengguna diperbarui.','success');},'Memperbarui pengguna…');}

    // Wali kelas / guru juga perlu mengatur desimal rata-rata yang mereka lihat & ekspor.
    function ensureDecimalPicker(){
      const holder=$('#decimalQuickHolder');
      if(!holder||holder.dataset.ready==='true')return;
      holder.dataset.ready='true';
      holder.innerHTML=`<div class="field"><label for="appDecimalsQuick">Desimal rata-rata</label><select id="appDecimalsQuick"><option value="2">2 desimal (58,67)</option><option value="1">1 desimal (58,7)</option><option value="0">Tanpa desimal / bulat (59)</option></select><small>Berlaku untuk tampilan dan unduhan Excel di akun ini.</small></div>`;
      holder.querySelector('select').addEventListener('change',event=>{
        const decimals=Number(event.target.value);
        if(DECIMAL_MODES.indexOf(decimals)===-1)return;
        state.appearance={...state.appearance,decimals};rememberDecimals(decimals);syncDecimalBridge();renderAll();
        toast(`Rata-rata kini ditampilkan ${decimals===0?'tanpa desimal (bulat)':`dengan ${decimals} desimal`}.`,'success');
        silentServer('saveAppAppearance',[state.sessionToken,{...state.appearance,decimals}],()=>{});
        persistContextDecimals(decimals);
      });
    }
    function renderDecimalPicker(){
      ensureDecimalPicker();
      const quick=$('#appDecimalsQuick');
      if(quick)quick.value=String(decimalMode());
    }
    function renderAppearancePanel(){renderDecimalPicker();const theme=$('#appTheme');const preview=$('#loginBackgroundPreview');if(!theme||!preview)return;theme.value=(state.appearance&&state.appearance.theme)==='modern'?'modern':'professional';const decimals=$('#appDecimals');if(decimals){const mode=String(decimalMode());if(decimals.value!==mode)decimals.value=mode;}const uri=state.appearance&&state.appearance.loginBackgroundDataUri;if(uri)preview.innerHTML=`<img src="${escapeAttr(uri)}" alt="Pratinjau background login">`;else preview.textContent='Belum ada gambar background login.';}
    function previewLoginBackgroundFile(){const file=$('#loginBackgroundFile').files&&$('#loginBackgroundFile').files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{$('#loginBackgroundPreview').innerHTML=`<img src="${escapeAttr(reader.result)}" alt="Pratinjau gambar yang dipilih">`;};reader.readAsDataURL(file);}
    function compressLoginBackground(file){return new Promise((resolve,reject)=>{if(!file||!/^image\/(png|jpeg|webp)$/i.test(file.type)){reject(new Error('Pilih gambar PNG, JPG, atau WEBP.'));return;}const reader=new FileReader();reader.onerror=()=>reject(new Error('Gambar tidak dapat dibaca.'));reader.onload=()=>{const image=new Image();image.onerror=()=>reject(new Error('Gambar tidak dapat diproses.'));image.onload=()=>{const maxDimension=1600;const scale=Math.min(1,maxDimension/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));const context=canvas.getContext('2d');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);let quality=.86;let data=canvas.toDataURL('image/jpeg',quality);while(data.length>1850000&&quality>.42){quality-=.08;data=canvas.toDataURL('image/jpeg',quality);}if(data.length>1950000){reject(new Error('Gambar masih terlalu besar setelah kompresi. Pilih gambar lain dengan ukuran lebih kecil.'));return;}resolve(data);};image.src=reader.result;};reader.readAsDataURL(file);});}
    // Revisi 35: jaring pengaman angka ekspor. Bila server belum mengirim recap/average,
    // berkas Excel tetap memakai angka yang sama dengan aplikasi (bobot & pembulatan yang sama).
    function fillExportRecap(data){
      if(!data||!data.context)return data;
      const weights=normalizedWeights();
      const counts=data.scoreCounts||state.scoreCounts||{formative:0,summative:0};
      const students=data.students||[];
      const hasRecap=Array.isArray(data.recap)&&data.recap.length===students.length&&students.length>0;
      const readFormative=id=>{
        if(!data.waliCopy)return formattedScores(id);
        return vector((data.formative||{})[id],counts.formative);
      };
      const readSummative=id=>{
        const source=((data.waliCopy?data.summative:state.summative)||{})[id]||{};
        return {asam:vector(source.asam,counts.summative),asas:vector(source.asas,counts.summative)};
      };
      const rows=students.map((student,index)=>{
        const formativeValues=readFormative(student.id);
        const formativeAverage=average(formativeValues);
        const summative=readSummative(student.id);
        const all=summative.asam.concat(summative.asas);
        const summativeAverage=average(all);
        const parts=[];
        if(formativeAverage!==null)parts.push({value:formativeAverage,weight:weights.formativeWeight});
        if(summativeAverage!==null)parts.push({value:summativeAverage,weight:weights.summativeWeight});
        const totalWeight=parts.reduce((sum,part)=>sum+part.weight,0);
        const finalScore=totalWeight>0?round2(parts.reduce((sum,part)=>sum+part.value*part.weight,0)/totalWeight):null;
        return {number:index+1,name:student.name||'',formativeAverage,summativeAverage,finalScore,className:student.className||data.context.className};
      });
      const existing=hasRecap?data.recap:null;
      data.recap=rows.map((row,index)=>{
        const server=existing?existing[index]:null;
        if(!server)return row;
        const pick=(serverValue,localValue)=>{
          const value=toNumber(serverValue);
          if(value===null)return localValue;
          // Pakai angka server hanya bila sama dengan hitungan aplikasi (selisih < 0,01).
          if(localValue===null||Math.abs(value-localValue)<0.01)return localValue;
          return localValue;
        };
        return {...row,formativeAverage:pick(server.formativeAverage,row.formativeAverage),summativeAverage:pick(server.summativeAverage,row.summativeAverage),finalScore:pick(server.finalScore,row.finalScore)};
      });
      if(data.context){data.context=Object.assign({},data.context,{formativeWeight:weights.formativeWeight,summativeWeight:weights.summativeWeight});}
      return data;
    }
    function decimalSelection(){const field=$('#appDecimals');const value=Number(field&&field.value);return DECIMAL_MODES.indexOf(value)===-1?2:value;}
    // Revisi 34: bobot Formatif/Sumatif bisa disamakan dengan lembar Excel sekolah (mis. 50/50)
    // tanpa mengubah struktur server: tetap memakai fungsi saveContext yang sudah ada.
    function normalizedWeights(){
      const context=state.context||{};
      const readPair=(fw,sw,fromForm)=>{
        const pick=(value,fallback)=>{const n=toNumber(value);return n===null||n<0||n>100?fallback:n;};
        let formative=pick(fw,undefined),summative=pick(sw,undefined);
        if(formative===undefined&&summative===undefined)return null;
        if(formative===undefined)formative=100-summative;
        if(summative===undefined)summative=100-formative;
        const total=formative+summative;
        if(total<=0)return null;
        return {formativeWeight:round2(formative*100/total),summativeWeight:round2(summative*100/total)};
      };
      const fromForm=readPair($('#formativeWeight')&&$('#formativeWeight').value,$('#summativeWeight')&&$('#summativeWeight').value,true);
      if(fromForm)return fromForm;
      return readPair(context.formativeWeight,context.summativeWeight)||{formativeWeight:50,summativeWeight:50};
    }
    async function saveAppearance(){try{const file=$('#loginBackgroundFile').files&&$('#loginBackgroundFile').files[0];const payload={theme:$('#appTheme').value,decimals:decimalSelection()};
      // Terapkan & ingat pilihan segera agar tabel langsung berubah, walau server belum mendukung field ini.
      state.appearance={...state.appearance,theme:payload.theme,decimals:payload.decimals};rememberDecimals(payload.decimals);syncDecimalBridge();renderAll();
      if(file)payload.loginBackgroundDataUri=await compressLoginBackground(file);
      secure('saveAppAppearance',[payload],result=>{applyAppearance({...(result.appearance||{}),decimals:payload.decimals});$('#loginBackgroundFile').value='';renderAll();toast('Tema, desimal rata-rata, dan tampilan login berhasil disimpan.','success');},'Menyimpan tampilan aplikasi…');}catch(error){toast(messageOf(error),'error');}}
    function clearLoginBackground(){secure('saveAppAppearance',[{theme:$('#appTheme').value,decimals:decimalSelection(),clearBackground:true}],result=>{applyAppearance(result.appearance);$('#loginBackgroundFile').value='';toast('Background login dihapus.','success');},'Menghapus background login…');}
    function resetApplication(){const password=$('#resetAdminPassword').value;const confirmed=$('#resetConfirm').checked;if(!password||!confirmed){toast('Masukkan kata sandi Pemilik/Admin dan centang konfirmasi reset.','error');return;}if(!confirm('Reset seluruh data murid, nilai, rekap, dan identitas materi? Tindakan ini tidak dapat dibatalkan.'))return;secure('resetApplicationData',[password],data=>{$('#resetAdminPassword').value='';$('#resetConfirm').checked=false;state.activeView='identity';applyData(data);toast('Seluruh data penilaian berhasil direset ke default.','success');},'Mereset seluruh data penilaian…');}
    function aboutInline(text){return escapeHtml(text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');}
    function shouldUseAboutTemplate(text){const value=String(text||'');return !value.includes('##')&&/Fitur dan Keunggulan Utama/i.test(value)&&/Visi Pengembangan/i.test(value);}
    function formattedAboutHtml(text){let source=String(text||'').trim()||ABOUT_TEMPLATE;if(shouldUseAboutTemplate(source))source=ABOUT_TEMPLATE;const lines=source.replace(/\r\n?/g,'\n').split('\n');const intro=[];const sections=[];let current=null;lines.forEach(raw=>{const line=raw.trim();if(!line)return;if(/^##\s+/.test(line)){current={title:line.replace(/^##\s+/,''),lines:[]};sections.push(current);}else if(current){current.lines.push(line);}else intro.push(line);});let html=intro.length?`<p class="about-intro">${aboutInline(intro.join(' '))}</p>`:'';sections.forEach(section=>{const isInfo=/informasi sistem/i.test(section.title);const bullets=section.lines.filter(line=>/^[-•]\s+/.test(line)).map(line=>line.replace(/^[-•]\s+/,''));const paragraphs=section.lines.filter(line=>!/^[-•]\s+/.test(line));html+='<section class="about-section"><h3>'+aboutInline(section.title)+'</h3>';if(bullets.length)html+='<ul class="about-feature-list">'+bullets.map(item=>{const split=item.indexOf(':');if(split<0)return '<li>'+aboutInline(item)+'</li>';return '<li style="display:grid;grid-template-columns:min(var(--bn-about-label,12em),45%) max-content minmax(0,1fr);column-gap:7px;align-items:baseline">'+aboutInline(item.slice(0,split))+'<span aria-hidden="true">:</span>'+'<span style="text-align:left">'+aboutInline(item.slice(split+1).trim())+'</span>'+'</li>';}).join('')+'</ul>';if(isInfo&&paragraphs.length){html+='<div class="about-system" style="display:grid;grid-template-columns:max-content max-content minmax(0,1fr);column-gap:6px;row-gap:4px;align-items:baseline">'+paragraphs.map(item=>{const split=item.indexOf(':');return split>-1?'<div class="about-system-row" style="display:contents">'+'<b>'+aboutInline(item.slice(0,split).trim())+'</b><span aria-hidden="true">:</span><span>'+aboutInline(item.slice(split+1).trim())+'</span></div>':'<div style="display:contents"><span style="grid-column:1 / -1">'+aboutInline(item)+'</span></div>';}).join('')+'</div>';}else if(paragraphs.length){html+=paragraphs.map(item=>'<p>'+aboutInline(item)+'</p>').join('');}html+='</section>';});return html||'<p class="about-intro">'+aboutInline(source)+'</p>';}
    // Menyamakan lebar kolom label pada seluruh butir daftar fitur About.
    // Setiap baris adalah grid tersendiri, jadi lebarnya harus dipatok dari label TERPANJANG
    // agar semua titik dua lurus ke bawah dan keterangan yang membungkus tetap sejajar.
    function alignAboutLabels(container){
      if(!container)return;
      const daftar=container.querySelector(".about-feature-list");
      if(!daftar)return;
      const label=[...daftar.querySelectorAll("li > strong")];
      if(!label.length)return;
      daftar.style.removeProperty("--bn-about-label");
      // Ukur lebar intrinsik tiap label memakai elemen tak terlihat (white-space:nowrap).
      // Cara ini tidak terpengaruh lebar kolom saat ini — berbeda dengan mengukur langsung,
      // yang bisa terjebak lingkaran: kolom sempit -> label membungkus -> hasil ukur ikut kecil.
      const ukur=document.createElement("span");
      ukur.setAttribute("aria-hidden","true");
      ukur.style.cssText="position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;pointer-events:none";
      daftar.appendChild(ukur);
      let lebar=0;
      label.forEach(el=>{
        const cs=getComputedStyle(el);
        ukur.style.fontWeight=cs.fontWeight;
        ukur.style.fontSize=cs.fontSize;
        ukur.style.fontFamily=cs.fontFamily;
        ukur.style.fontStyle=cs.fontStyle;
        ukur.style.letterSpacing=cs.letterSpacing;
        ukur.textContent=el.textContent;
        lebar=Math.max(lebar,ukur.getBoundingClientRect().width);
        // Label juga dibuat rata kiri agar baris kedua tidak melar seperti teks justify.
        el.style.textAlign="left";
      });
      ukur.remove();
      if(!lebar){ // cadangan: ukur lewat kanvas bila elemen benar-benar tidak dapat diukur
        try{const cs=getComputedStyle(container);const ctx=document.createElement("canvas").getContext("2d");
          ctx.font="700 "+(cs.fontSize||"14px")+" "+(cs.fontFamily||"sans-serif");
          label.forEach(el=>{lebar=Math.max(lebar,ctx.measureText(el.textContent).width);});
        }catch(error){}
      }
      if(lebar)daftar.style.setProperty("--bn-about-label",Math.ceil(lebar)+"px");
    }

    function renderAbout(){const display=$('#aboutDisplay');if(!display)return;const text=state.aboutText||ABOUT_TEMPLATE;display.innerHTML=formattedAboutHtml(text);alignAboutLabels(display);}
    function applyAboutTemplate(){const editor=$('#aboutText');editor.value=ABOUT_TEMPLATE;$('#aboutDisplay').innerHTML=formattedAboutHtml(ABOUT_TEMPLATE);alignAboutLabels($('#aboutDisplay'));toast('Template About rapi diterapkan. Klik Simpan Informasi About untuk menyimpan.','success');}
    function saveAbout(){const editor=$('#aboutText');const text=editor.value.trim();secure('saveAbout',[text],result=>{state.aboutText=result.aboutText;editor.value='';renderAbout();toast('Informasi About berhasil disimpan dan kolom deskripsi dikosongkan.','success');},'Menyimpan informasi About…');}

    // ---------- Data murid ----------
    function renderStudents(){const body=$('#studentsTableBody');$('#studentsClassLabel').textContent=state.context?classLabel(state.context.className):'—';renderStudentsClassPicker();if(!state.students.length){body.innerHTML=`<tr><td colspan="4"><div class="empty-state">${svg('users')}<b>Belum ada data murid</b><span>Tambahkan nama murid pada kelas aktif.</span></div></td></tr>`;return;}body.innerHTML=state.students.map((student,index)=>`<tr><td class="center">${index+1}</td><td><input class="cell-input student-name-input" data-student-id="${escapeAttr(student.id)}" maxlength="120" value="${escapeAttr(student.name)}"></td><td>${escapeHtml(student.className)}</td><td class="center"><span class="student-order-actions"><button class="tiny-icon move" type="button" data-move-student="${escapeAttr(student.id)}" data-move-direction="up" title="Naikkan urutan" ${index===0?'disabled':''}><svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"></path></svg></button><button class="tiny-icon move" type="button" data-move-student="${escapeAttr(student.id)}" data-move-direction="down" title="Turunkan urutan" ${index===state.students.length-1?'disabled':''}><svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"></path></svg></button><button class="tiny-icon" type="button" data-remove-student="${escapeAttr(student.id)}" title="Hapus murid"><svg viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path></svg></button></span></td></tr>`).join('');}
    function temporaryId(){return `tmp-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;}
    function addStudent(name){const clean=String(name||'').trim();if(!clean){toast('Tuliskan nama murid terlebih dahulu.','error');return false;}state.students.push({id:temporaryId(),name:clean,className:state.context.className});studentsDirty=true;renderStudents();return true;}
    function addOneStudent(){const input=$('#singleStudentName');if(addStudent(input.value)){input.value='';input.focus();toast('Nama ditambahkan. Klik Simpan Data Murid untuk menyimpan.','success');}}
    function addBulkStudents(){const area=$('#bulkStudentNames');const names=area.value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);if(!names.length){toast('Tuliskan minimal satu nama.','error');return;}names.forEach(addStudent);area.value='';renderStudents();toast(`${names.length} nama ditambahkan. Klik Simpan Data Murid untuk menyimpan.`,'success');}
    function syncStudentInputs(){const names={};$$('.student-name-input').forEach(input=>{names[input.dataset.studentId]=input.value.trim();});state.students=state.students.map(s=>({...s,name:names[s.id]??s.name})).filter(s=>s.name);}
    function saveStudents(){syncStudentInputs();secure('saveStudents',[{...currentSelection(),students:state.students}],data=>{applyData(data);studentsDirty=false;toast('Data murid berhasil disimpan.','success');},'Menyimpan data murid…');}
    // ---------- Nilai formatif dan sumatif ----------
    function scoreScrollControls(kind,label){return `<div class="score-scroll-toolbar"><div class="score-scroll-caption"><b>Geser tabel ${escapeHtml(label)}</b><span>Gunakan tombol atau slider di atas ini; tidak perlu mencari scrollbar di bawah.</span></div><div class="score-scroll-actions"><button class="scroll-shift-button" type="button" data-score-scroll-shift="${kind}" data-scroll-direction="-1" title="Geser ke kiri"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg></button><button class="scroll-shift-button" type="button" data-score-scroll-shift="${kind}" data-scroll-direction="1" title="Geser ke kanan"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"></path></svg></button></div><label class="score-range-wrap"><span class="score-range-label">Slider horizontal</span><input class="score-range-slider" data-score-range="${kind}" type="range" min="0" max="0" value="0" aria-label="Slider horizontal tabel ${escapeAttr(label)}"></label></div>`;}
    // Revisi 31: lebar minimum tabel nilai DIHITUNG dari jumlah kolom nilai. Sebelumnya CSS
// mematok min-width 3150px (ukuran konteks lama 40 kolom) sehingga konteks kecil (mis. 4
// komponen) melar raksasa: kolom NO menyerap seluruh kelebihan lebar dan kolom nilai
// terdorong keluar layar (tampilan "berantakan"). Kini: NO+NAMA tetap ramping, sisa lebar
// panel mengisi kolom nilai secara proporsional, dan tabel lebar tetap menggulir horizontal.
    function applyScoreTableWidth(table,kind){
      const rows=table.querySelectorAll('tbody tr').length;
      const inputs=table.querySelectorAll('tbody input.score-input').length;
      const kolom=rows?inputs/rows:0;
      const perKomponen=(kind==='formative'||kind==='wali-formative')?76:74;
      const dasar=55+215+95+30;
      // Lebar tabel = lebar alami konten; min-width hanya menjaga agar kolom NO/NAMA
      // tidak pernah menyerap surplus (penyebab tampilan "berantakan" sebelumnya).
      table.style.minWidth=Math.max(640,Math.min(3150,Math.round(dasar+kolom*perKomponen)))+'px';
    }
    function setupScoreScroll(kind,root){const slider=$(`[data-score-range="${kind}"]`,root),shell=$(`[data-score-scroll-body="${kind}"]`,root),table=shell&&$('table',shell);if(!slider||!shell||!table)return;applyScoreTableWidth(table,kind);const refresh=()=>{const max=Math.max(0,table.scrollWidth-shell.clientWidth);slider.max=String(max);slider.value=String(Math.min(max,shell.scrollLeft));slider.disabled=max===0;};slider._refreshScoreSlider=refresh;refresh();requestAnimationFrame(refresh);slider.addEventListener('input',()=>{shell.scrollLeft=Number(slider.value);});shell.addEventListener('scroll',()=>{slider.value=String(Math.min(Number(slider.max)||0,shell.scrollLeft));});}
    function shiftScoreTable(button){const kind=button.dataset.scoreScrollShift;const root=kind==='formative'?$('#formativeTableWrap'):kind==='summative'?$('#summativeTableWrap'):kind==='wali-formative'?$('#waliFormativeWrap'):$('#waliSummativeWrap');const shell=$(`[data-score-scroll-body="${kind}"]`,root);if(!shell)return;const direction=Number(button.dataset.scrollDirection)||1;shell.scrollBy({left:direction*Math.max(300,Math.round(shell.clientWidth*.72)),behavior:'smooth'});}
    function formattedScores(studentId){return vector(state.formative[studentId],state.scoreCounts.formative);}
    function sumScores(studentId){const src=state.summative[studentId]||{};return {asam:vector(src.asam,state.scoreCounts.summative),asas:vector(src.asas,state.scoreCounts.summative)};}
    function renderFormative(){const root=$('#formativeTableWrap');$('#formativeContextText').textContent=contextDescription();$('#formativePill').textContent=`${state.scoreCounts.formative||0} KOMPONEN`;if(!state.students.length){root.innerHTML=`<div class="empty-state">${svg('users')}<b>Belum ada data murid</b><span>Tambahkan data murid terlebih dahulu.</span></div>`;return;}const materials=safeMaterials(state.context.materials);const groups=materials.map((m,i)=>`<th class="group-formative" colspan="${m.objectives.length}" title="${escapeAttr(materialTitleLabel(m,i))}">${escapeHtml(shortText(materialTitleLabel(m,i),38))}<span class="group-sub">Lingkup Materi ${i+1}</span></th>`).join('');const heads=materials.map(m=>m.objectives.map((o,i)=>`<th class="objective-head" title="${escapeAttr(objectiveLabel(o,i))}">TP ${i+1}<small>${escapeHtml(shortText(objectiveLabel(o,i),18))}</small></th>`).join('')).join('');const rows=state.students.map((student,index)=>{const scores=formattedScores(student.id),mean=average(scores);const cells=scores.map((score,si)=>`<td class="center"><input class="score-input" data-score-kind="formative" data-student-id="${escapeAttr(student.id)}" data-score-index="${si}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="${escapeAttr(blankScore(score))}"></td>`).join('');return `<tr><td class="sticky-no">${index+1}</td><td class="sticky-name name-cell">${escapeHtml(student.name)}</td>${cells}<td class="score-average" data-average-cell="formative">${formatScore(mean)}</td></tr>`;}).join('');root.innerHTML=`${scoreScrollControls('formative','formatif')}<div class="table-shell" data-score-scroll-body="formative"><table class="score-table formative-table"><thead><tr><th class="sticky-no" rowspan="2">NO</th><th class="sticky-name" rowspan="2">NAMA</th>${groups}<th rowspan="2">RATA-RATA<br>FORMATIF</th></tr><tr>${heads}</tr></thead><tbody>${rows}</tbody></table></div>`;setupScoreScroll('formative',root);}
    function renderSummative(){const root=$('#summativeTableWrap');$('#summativeContextText').textContent=contextDescription();$('#summativePill').textContent=`${state.context&&state.context.materials?state.context.materials.length:0} LINGKUP`;if(!state.students.length){root.innerHTML=`<div class="empty-state">${svg('users')}<b>Belum ada data murid</b><span>Tambahkan data murid terlebih dahulu.</span></div>`;return;}const materials=safeMaterials(state.context.materials);const asamGroups=materials.map((m,i)=>`<th class="asam-group" colspan="2">ASAM ${i+1}<span class="group-sub">${escapeHtml(shortText(materialTitleLabel(m,i),22))}</span></th>`).join('');const asasGroups=materials.map((m,i)=>`<th class="asas-group" colspan="2">ASAS ${i+1}<span class="group-sub">${escapeHtml(shortText(materialTitleLabel(m,i),22))}</span></th>`).join('');const typeHeads=Array.from({length:materials.length*2},()=>'<th class="objective-head">TES</th><th class="objective-head">NON<br>TES</th>').join('');const rows=state.students.map((student,index)=>{const scores=sumScores(student.id),mean=average(scores.asam.concat(scores.asas));const cell=(kind,arr)=>arr.map((score,si)=>`<td class="center"><input class="score-input" data-score-kind="${kind}" data-student-id="${escapeAttr(student.id)}" data-score-index="${si}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" value="${escapeAttr(blankScore(score))}"></td>`).join('');return `<tr><td class="sticky-no">${index+1}</td><td class="sticky-name name-cell">${escapeHtml(student.name)}</td>${cell('asam',scores.asam)}${cell('asas',scores.asas)}<td class="score-average" data-average-cell="summative">${formatScore(mean)}</td></tr>`;}).join('');root.innerHTML=`${scoreScrollControls('summative','sumatif')}<div class="table-shell" data-score-scroll-body="summative"><table class="score-table"><thead><tr><th class="sticky-no" rowspan="3">NO</th><th class="sticky-name" rowspan="3">NAMA</th><th class="asam-group" colspan="${state.scoreCounts.summative}">ASESMEN SUMATIF AKHIR MATERI</th><th class="asas-group" colspan="${state.scoreCounts.summative}">ASESMEN SUMATIF AKHIR SEMESTER</th><th rowspan="3">RATA-RATA<br>SUMATIF</th></tr><tr>${asamGroups}${asasGroups}</tr><tr>${typeHeads}</tr></thead><tbody>${rows}</tbody></table></div>`;setupScoreScroll('summative',root);}
    function updateScoreInput(input){const kind=input.dataset.scoreKind,id=input.dataset.studentId,index=Number(input.dataset.scoreIndex),raw=input.value.trim(),value=raw===''?null:toNumber(raw),invalid=raw!==''&&(value===null||value<0||value>100);input.classList.toggle('invalid-score',invalid);if(invalid||!Number.isInteger(index))return;if(kind==='formative'){const scores=formattedScores(id);scores[index]=value;state.formative[id]=scores;const output=$('[data-average-cell="formative"]',input.closest('tr'));if(output)output.textContent=formatScore(average(scores),{decimals});}else{const scores=sumScores(id);scores[kind][index]=value;state.summative[id]=scores;const output=$('[data-average-cell="summative"]',input.closest('tr'));if(output)output.textContent=formatScore(average(scores.asam.concat(scores.asas)));}}
    function hasInvalidScores(){return Boolean($('.score-input.invalid-score'));}
    // ---------- Revisi 28: kolom nilai manual (tanpa spinner), Enter pindah baris, tempel dari luar ----------
    function injectScoreStyles(){
      if(document.getElementById('bn-score-style'))return;
      const style=document.createElement('style');style.id='bn-score-style';
      style.textContent=[
        '.score-input{text-align:center!important;appearance:textfield!important;-moz-appearance:textfield!important}',
        '.score-table th.sticky-no,.score-table td.sticky-no{width:55px;max-width:60px!important}',
        '.score-table th.sticky-name,.score-table td.sticky-name{max-width:215px!important}',
        '.score-input::-webkit-outer-spin-button,.score-input::-webkit-inner-spin-button{-webkit-appearance:none!important;margin:0!important}'
      ].join('');
      document.head.appendChild(style);
    }
    // Terima "85", "85,5", "85.5", "85 %", "1.234" (ribuan) -> angka; '' = kosong; null = bukan angka.
    function parseScoreText(raw){
      let t=String(raw==null?'':raw).trim();
      if(t==='')return '';
      t=t.replace(/\s/g,'').replace(/%$/,'');
      if(/^\d{1,3}(\.\d{3})+$/.test(t))t=t.replace(/\./g,'');                       // titik ribuan: 1.500 -> 1500
      else if(t.indexOf(',')!==-1&&t.indexOf('.')!==-1)t=t.replace(/\./g,'').replace(/,/g,'.'); // 1.234,5 -> 1234.5
      else t=t.replace(/,/g,'.');                                                    // koma desimal: 85,5 -> 85.5
      if(!/^-?\d*(\.\d*)?$/.test(t)||t===''||t==='-'||t==='.')return null;
      const n=Number(t);
      return Number.isFinite(n)?n:null;
    }
    function applyScoreValue(input,raw){
      const parsed=parseScoreText(raw);
      if(parsed===''){input.value='';updateScoreInput(input);return;}
      if(parsed===null){input.value=String(raw==null?'':raw).trim();updateScoreInput(input);return;}
      input.value=(parsed>=0&&parsed<=100)?String(round2(parsed)):String(parsed);
      updateScoreInput(input);
    }
    function moveScoreFocus(input,rowsAhead){
      moveScoreFocusBy(input,rowsAhead,0);
    }
    // ---------- Navigasi keyboard sel nilai: panah atas/bawah/kiri/kanan (Revisi 29) ----------
    function scoreGrid(input){
      const table=input.closest('table');if(!table)return null;
      const grid=Array.from(table.querySelectorAll('tbody tr')).map(tr=>Array.from(tr.querySelectorAll('input.score-input')));
      const rowIndex=grid.findIndex(row=>row.indexOf(input)!==-1);
      if(rowIndex===-1)return null;
      return {grid,rowIndex,colIndex:grid[rowIndex].indexOf(input)};
    }
    function commitScoreValue(input){
      // Navigasi tidak boleh gagal hanya karena penyimpanan nilai error.
      try{ if(input.value!=='')applyScoreValue(input,input.value);else updateScoreInput(input); }catch(error){ console.warn('Nilai belum tersimpan:',error); }
    }
    function focusScoreInput(input,selectAll){
      if(!input)return false;
      input.focus();
      if(selectAll!==false&&typeof input.select==='function')input.select();
      revealScoreInput(input);
      return true;
    }
    // rowStep: pindah baris (murid) • colStep: pindah sel dalam baris yang sama
    function moveScoreFocusBy(input,rowStep,colStep){
      const info=scoreGrid(input);if(!info)return false;
      const {grid,rowIndex,colIndex}=info,row=grid[rowIndex];
      commitScoreValue(input);
      let target=null;
      if(colStep===Number.NEGATIVE_INFINITY)target=row[0]||null;          // Home -> sel pertama baris
      else if(colStep===Number.POSITIVE_INFINITY)target=row[row.length-1]||null; // End -> sel terakhir baris
      else if(rowStep){
        const nextRow=grid[rowIndex+rowStep];
        if(nextRow&&nextRow.length)target=nextRow[Math.min(colIndex,nextRow.length-1)]||null;
      }else if(colStep){
        target=row[colIndex+colStep]||null;
      }
      return target?focusScoreInput(target,true):false;
    }
    function jumpScoreRowEdge(input,direction){
      const info=scoreGrid(input);if(!info)return false;
      const {grid,rowIndex,colIndex}=info;
      commitScoreValue(input);
      const row=direction<0?grid[0]:grid[grid.length-1];
      if(!row||!row.length)return false;
      const target=row[Math.min(colIndex,row.length-1)]||null;
      return target?focusScoreInput(target,true):false;
    }
    function revealScoreInput(input){
      const shell=input.closest('[data-score-scroll-body]');
      if(!shell)return;
      const rect=input.getBoundingClientRect(),shellRect=shell.getBoundingClientRect();
      const sticky=$('.sticky-name',input.closest('tr'));
      const leftLimit=shellRect.left+(sticky?sticky.getBoundingClientRect().width:0)+4;
      if(rect.left<leftLimit)shell.scrollLeft=Math.max(0,shell.scrollLeft-(leftLimit-rect.left));
      else if(rect.right>shellRect.right-4)shell.scrollLeft+=rect.right-(shellRect.right-4);
      if(rect.top<shellRect.top)shell.scrollTop=Math.max(0,shell.scrollTop-(shellRect.top-rect.top)-8);
      else if(rect.bottom>shellRect.bottom)shell.scrollTop+=rect.bottom-shellRect.bottom+8;
      // Slider horizontal ada di toolbar (bukan induk langsung shell), jadi dicari lebih luas.
      const slider=$(`[data-score-range="${shell.dataset.scoreScrollBody}"]`,shell.closest('section')||document);
      if(slider&&slider._refreshScoreSlider)slider._refreshScoreSlider();
    }
    function scrollScoreInputIntoView(input){revealScoreInput(input);}
    function handleScoreKeydown(event){
        const input=event.target;
        if(!input||!input.matches||!input.matches('input.score-input[data-score-kind]'))return;
        if(event.isComposing||event.altKey)return;
        const key=event.key,jump=event.ctrlKey||event.metaKey;
        if(key==='Enter'){event.preventDefault();moveScoreFocus(input,event.shiftKey?-1:1);return;}
        if(key==='Tab'){return;}
        if(key==='ArrowUp'||key==='ArrowDown'){
          event.preventDefault();
          const dir=key==='ArrowDown'?1:-1;
          const moved=jump?jumpScoreRowEdge(input,dir):moveScoreFocusBy(input,dir,0);
          if(!moved)input.select();
          return;
        }
        if(key==='ArrowLeft'||key==='ArrowRight'){
          const step=key==='ArrowLeft'?-1:1;
          const pos=input.selectionStart??input.value.length;
          const endPos=input.selectionEnd??pos;
          const hasSelection=endPos>pos;
          const atEdge=step<0?(pos===0&&endPos===0):(pos>=input.value.length&&endPos>=input.value.length);
          // Kursor masih bisa bergerak di dalam angka -> biarkan perilaku bawaan.
          if(!hasSelection&&!atEdge&&!jump)return;
          event.preventDefault();
          const moved=moveScoreFocusBy(input,0,step);
          if(!moved)input.select();
          return;
        }
        if(key==='Home'||key==='End'){
          event.preventDefault();
          moveScoreFocusBy(input,0,key==='Home'?Number.NEGATIVE_INFINITY:Number.POSITIVE_INFINITY);
          return;
        }
        if(key==='PageUp'||key==='PageDown'){
          event.preventDefault();
          moveScoreFocusBy(input,key==='PageDown'?10:-10,0);
        }
      }

    function applyScorePaste(input,text){
      const lines=String(text||'').replace(/\r\n?/g,'\n').split('\n');
      while(lines.length&&lines[lines.length-1].trim()==='')lines.pop();
      if(!lines.length)return;
      const table=input.closest('table');
      if(!table||lines.length===1){
        const cells=lines[0].split('\t');
        while(cells.length>1&&cells[cells.length-1].trim()==='')cells.pop();
        applyScoreValue(input,cells[0]);
        return;
      }
      // Tempelan multi-sel (mis. disalin dari Excel/Sheets): jangkar = sel yang sedang aktif.
      const grid=Array.from(table.querySelectorAll('tbody tr')).map(tr=>Array.from(tr.querySelectorAll('input.score-input')));
      const rowStart=grid.findIndex(row=>row.indexOf(input)!==-1);
      if(rowStart===-1){applyScoreValue(input,lines[0].split('\t')[0]);return;}
      const colStart=grid[rowStart].indexOf(input);
      lines.forEach((line,dr)=>{
        const row=grid[rowStart+dr];if(!row)return;
        String(line).split('\t').forEach((raw,dc)=>{
          const cell=row[colStart+dc];
          if(cell)applyScoreValue(cell,raw);
        });
      });
    }
    function saveFormative(){if(hasInvalidScores()){toast('Periksa nilai merah; nilai harus 0 sampai 100.','error');return;}const payload={...currentSelection(),rows:state.students.map(s=>({studentId:s.id,scores:formattedScores(s.id)}))};secure('saveFormativeScores',[payload],data=>{applyData(data);toast('Nilai formatif berhasil disimpan.','success');},'Menyimpan nilai formatif…');}
    function saveSummative(){if(hasInvalidScores()){toast('Periksa nilai merah; nilai harus 0 sampai 100.','error');return;}const payload={...currentSelection(),rows:state.students.map(s=>{const scores=sumScores(s.id);return {studentId:s.id,asam:scores.asam,asas:scores.asas};})};secure('saveSummativeScores',[payload],data=>{applyData(data);toast('Nilai sumatif berhasil disimpan.','success');},'Menyimpan nilai sumatif…');}

    // ---------- Rekap, Excel, dan salin wali kelas ----------
    function renderRecap(){if(!state.context)return;if(!isWali()){$('#recapFormula').innerHTML=`<span class="formula-icon">${svg('formula')}</span><div><b>Nilai Rapor (NR)</b><p>Dihitung otomatis dari rata-rata Formatif dan rata-rata Sumatif pada konteks aktif. Konteks: <strong>${escapeHtml(contextDescription())}</strong>.</p></div>`;const body=$('#recapTableBody');body.innerHTML=state.recap.length?state.recap.map(r=>`<tr><td class="center">${r.number}</td><td>${escapeHtml(r.name)}</td><td class="average">${formatScore(r.formativeAverage)}</td><td class="average">${formatScore(r.summativeAverage)}</td><td class="final-score">${formatScore(r.finalScore)}</td></tr>`).join(''):`<tr><td colspan="5"><div class="empty-state">${svg('users')}<b>Belum ada murid untuk direkap</b></div></td></tr>`;}renderWaliCopy();}
    function downloadExcel(result){try{const raw=atob(result.base64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);const blob=new Blob([bytes],{type:result.mimeType||'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=result.fileName||'Buku_Nilai.xlsx';a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);toast('Excel terpadu berhasil diunduh. Browser perangkat menentukan folder Download atau dialog simpan.','success');}catch(error){toast('File Excel tidak dapat diunduh: '+messageOf(error),'error');}}
    function withExportData(result){
      // result: {fileName, mimeType, base64, data?} — hanya dipakai bila adapter mengirim data mentah.
      if(result&&result.data)fillExportRecap(result.data);
      return result;
    }
    function exportExcel(){secure('exportExcel',[currentSelection()],result=>downloadExcel(withExportData(result)),'Menyusun satu file Excel: Formatif, Sumatif, dan Rekap…');}
    function renderWaliCopy(){if(!isWali())return;const classSelect=$('#waliClassName');if(!classSelect)return;renderClassOptions(classSelect,state.user.className||state.context.className,true);classSelect.disabled=Boolean(state.user.className);renderSubjectOptions($('#waliSubject'),state.waliData?state.waliData.context.subject:((state.user.subjects&&state.user.subjects[0])||state.context.subject||''),state.user.subjects);$('#waliSubject').disabled=Boolean(state.user.subjects&&state.user.subjects.length===1);$('#waliSemester').value=state.waliData?state.waliData.context.semester:(state.context.semester||'GANJIL');$('#waliAcademicYear').value=state.waliData?state.waliData.context.academicYear:(state.context.academicYear||'');$('#waliSemester').disabled=true;$('#waliAcademicYear').disabled=true;const status=$('#waliCopyStatus');const materialsWrap=$('#waliMaterialsWrap');if(!state.waliData){status.innerHTML='Pilih mata pelajaran, data langsung ditampilkan otomatis. Tombol <strong>Tampilkan Nilai</strong> tetap tersedia sebagai cadangan. Semester dan tahun pelajaran mengikuti pengaturan Admin. Rekap akhir tidak tersedia pada mode wali kelas.';materialsWrap.innerHTML='';$('#waliFormativeWrap').innerHTML='';$('#waliSummativeWrap').innerHTML='';return;}status.innerHTML=`Data siap disalin: <strong>${escapeHtml(state.waliData.context.className)}</strong> · ${escapeHtml(state.waliData.context.subject)} · ${escapeHtml(state.waliData.context.semester)} ${escapeHtml(state.waliData.context.academicYear)}.`;renderWaliMaterials();renderWaliTables();}
    function waliSelection(){const subject=$('#waliSubject').value.trim();if(!subject)throw new Error('Mata pelajaran wajib diisi.');return {className:$('#waliClassName').value,subject,semester:$('#waliSemester').value,academicYear:$('#waliAcademicYear').value.trim()};}
    function loadWaliCopy(options){
      const opt=options||{};
      let selection;try{selection=waliSelection();}catch(error){if(!opt.silent)toast(error.message,'error');return;}
      if(!opt.silent)setBusy(true,'Memuat nilai untuk wali kelas…');
      apiRequest('getHomeroomCopyData',[state.sessionToken,selection]).then(data=>{
        state.waliData=data;adoptContextDecimals(data.context);renderWaliCopy();
        toast(opt.silent?`Data ${selection.subject} dimuat otomatis.`:'Nilai Formatif dan Sumatif siap disalin.','success');
      }).catch(error=>{if(!opt.silent)toast(messageOf(error),'error');}).then(()=>{setBusy(false);});
    }
    // Wali kelas: begitu mata pelajaran (atau kelas/semester/tahun) dipilih, data langsung dimuat.
    function autoLoadWaliCopy(){
      let selection;try{selection=waliSelection();}catch(error){return;}
      const key=[selection.className,selection.subject,selection.semester,selection.academicYear].join('|');
      if(key===(state.waliAutoKey||''))return;
      state.waliAutoKey=key;
      loadWaliCopy({silent:true});
    }
    function downloadWaliFile(){let selection;try{selection=waliSelection();}catch(error){toast(error.message,'error');return;}secure('exportExcel',[selection,{waliCopy:true,decimals:digitsFor(state.waliData&&state.waliData.context)}],result=>downloadExcel(withExportData(result)),'Menyusun file nilai Formatif, Sumatif, dan Rekap…');}
    function waliFormativeTable(data){const materials=safeMaterials(data.context.materials),scoresCount=data.scoreCounts.formative,decimals=(data.context&&data.context.decimals)??data.decimals;const groups=materials.map((m,i)=>`<th class="group-formative" colspan="${m.objectives.length}">${escapeHtml(shortText(materialTitleLabel(m,i),38))}<span class="group-sub">Lingkup ${i+1}</span></th>`).join('');const heads=materials.map(m=>m.objectives.map((o,i)=>`<th class="objective-head">TP ${i+1}<small>${escapeHtml(shortText(objectiveLabel(o,i),18))}</small></th>`).join('')).join('');const rows=data.students.map((s,i)=>{const scores=vector(data.formative[s.id],scoresCount);return `<tr><td class="sticky-no">${i+1}</td><td class="sticky-name name-cell">${escapeHtml(s.name)}</td>${scores.map(v=>`<td><span class="score-readonly">${formatScore(v,{decimals})}</span></td>`).join('')}<td class="score-average">${formatScore(average(scores),{decimals})}</td></tr>`;}).join('');return `${scoreScrollControls('wali-formative','Formatif')}<div class="table-shell copy-table-wrap" data-score-scroll-body="wali-formative"><table class="score-table formative-table"><thead><tr><th class="sticky-no" rowspan="2">NO</th><th class="sticky-name" rowspan="2">NAMA</th>${groups}<th rowspan="2">RATA-RATA<br>FORMATIF</th></tr><tr>${heads}</tr></thead><tbody>${rows||`<tr><td colspan="${scoresCount+3}"><div class="empty-state">${svg('users')}<b>Belum ada murid</b></div></td></tr>`}</tbody></table></div>`;}
    function waliSummativeTable(data){const materials=safeMaterials(data.context.materials),per=data.scoreCounts.summative,decimals=(data.context&&data.context.decimals)??data.decimals;const asam=materials.map((m,i)=>`<th class="asam-group" colspan="2">ASAM ${i+1}<span class="group-sub">${escapeHtml(shortText(materialTitleLabel(m,i),22))}</span></th>`).join(''),asas=materials.map((m,i)=>`<th class="asas-group" colspan="2">ASAS ${i+1}<span class="group-sub">${escapeHtml(shortText(materialTitleLabel(m,i),22))}</span></th>`).join(''),heads=Array.from({length:materials.length*2},()=>'<th class="objective-head">TES</th><th class="objective-head">NON<br>TES</th>').join('');const rows=data.students.map((s,i)=>{const source=data.summative[s.id]||{},a=vector(source.asam,per),b=vector(source.asas,per);return `<tr><td class="sticky-no">${i+1}</td><td class="sticky-name name-cell">${escapeHtml(s.name)}</td>${a.map(v=>`<td><span class="score-readonly">${formatScore(v,{decimals})}</span></td>`).join('')}${b.map(v=>`<td><span class="score-readonly">${formatScore(v,{decimals})}</span></td>`).join('')}<td class="score-average">${formatScore(average(a.concat(b)),{decimals})}</td></tr>`;}).join('');return `${scoreScrollControls('wali-summative','Sumatif')}<div class="table-shell copy-table-wrap" data-score-scroll-body="wali-summative"><table class="score-table"><thead><tr><th class="sticky-no" rowspan="3">NO</th><th class="sticky-name" rowspan="3">NAMA</th><th class="asam-group" colspan="${per}">ASESMEN SUMATIF AKHIR MATERI</th><th class="asas-group" colspan="${per}">ASESMEN SUMATIF AKHIR SEMESTER</th><th rowspan="3">RATA-RATA<br>SUMATIF</th></tr><tr>${asam}${asas}</tr><tr>${heads}</tr></thead><tbody>${rows||`<tr><td colspan="${per*2+3}"><div class="empty-state">${svg('users')}<b>Belum ada murid</b></div></td></tr>`}</tbody></table></div>`;}
    function renderWaliMaterials(){const data=state.waliData;const wrap=$('#waliMaterialsWrap');if(!data||!wrap)return;const materials=safeMaterials(data.context.materials);wrap.innerHTML=`<div class="wali-materials-heading"><span>Lingkup Materi & Tujuan Pembelajaran</span><span class="tag">${materials.length} Lingkup</span></div><div class="wali-material-list">${materials.map((material,index)=>`<article class="wali-material-card"><b>${index+1}. ${escapeHtml(materialTitleLabel(material,index))}</b><ul>${material.objectives.map((objective,objectiveIndex)=>`<li>TP ${objectiveIndex+1}: ${escapeHtml(objectiveLabel(objective,objectiveIndex))}</li>`).join('')}</ul></article>`).join('')}</div>`;}
    function renderWaliTables(){const data=state.waliData;if(!data)return;const f=$('#waliFormativeWrap'),s=$('#waliSummativeWrap');f.innerHTML=waliFormativeTable(data);s.innerHTML=waliSummativeTable(data);f.hidden=state.waliTab!=='formative';s.hidden=state.waliTab!=='summative';setupScoreScroll('wali-formative',f);setupScoreScroll('wali-summative',s);$$('[data-wali-tab]').forEach(button=>button.classList.toggle('active',button.dataset.waliTab===state.waliTab));}
    // ---------- Revisi 30: salin seluruh nilai (TES & NON TES) ke Excel / Word ----------
    // Satu sumber data untuk Guru Mapel (state) maupun Wali Kelas (state.waliData),
    // sehingga hasil salinan selalu identik dengan tabel yang sedang tampil.
    // Nilai mentah (TES/NON TES) disalin apa adanya; rata-rata dihitung tetap memakai formatScore.
    function copyCellText(value){return value===null||typeof value==='undefined'||Number.isNaN(Number(value))?'':formatScore(value);}
    function copyAverageText(value){
      if(value===null||typeof value==='undefined'||!Number.isFinite(Number(value)))return '';
      // Rata-rata selalu memakai pengaturan desimal agar sama dengan yang tampil di tabel.
      return formatScore(value);
    }
    function contextDescriptionOf(context){
      if(!context)return '—';
      return [context.className,context.subject,context.semester,context.academicYear].filter(Boolean).join(' · ')||'—';
    }
    function scoreSource(data){
      const useWali=Boolean(data);
      const context=useWali?data.context:(state.context||null);
      if(!context)return null;
      const counts=(useWali?data.scoreCounts:state.scoreCounts)||{formative:0,summative:0};
      const readFormative=id=>(useWali?vector(data.formative[id],counts.formative):formattedScores(id));
      const readSummative=id=>{
        const source=(useWali?data.summative:state.summative)[id]||{};
        return {asam:vector(source.asam,counts.summative),asas:vector(source.asas,counts.summative)};
      };
      return {
        context,
        description:contextDescriptionOf(context),
        students:(useWali?data.students:state.students)||[],
        readFormative,
        readSummative,
      };
    }
    function scoreMatrix(kind,data){
      const source=scoreSource(data);
      if(!source)return {title:'',description:'',headers:[],rows:[]};
      const materials=safeMaterials(source.context.materials);
      const columns=[];
      if(kind==='formative'){
        materials.forEach((material,mi)=>{
          const count=Math.max(1,material.objectives.length);
          for(let oi=0;oi<count;oi+=1)columns.push(`Lingkup ${mi+1} - TP ${oi+1}`);
        });
        const headers=['NO','NAMA',...columns,'RATA-RATA FORMATIF'];
        const rows=source.students.map((student,index)=>{
          const scores=source.readFormative(student.id);
          return [String(index+1),student.name||'',...scores.slice(0,columns.length).map(copyCellText),formatScore(average(scores),{decimals})];
        });
        return {title:'NILAI FORMATIF',description:source.description,headers,rows};
      }
      materials.forEach((m,mi)=>columns.push(`ASAM ${mi+1} - TES`,`ASAM ${mi+1} - NON TES`));
      materials.forEach((m,mi)=>columns.push(`ASAS ${mi+1} - TES`,`ASAS ${mi+1} - NON TES`));
      const headers=['NO','NAMA',...columns,'RATA-RATA SUMATIF'];
      const rows=source.students.map((student,index)=>{
        const scores=source.readSummative(student.id);
        const all=scores.asam.concat(scores.asas);
        return [String(index+1),student.name||'',...all.map(copyCellText),formatScore(average(all))];
      });
      return {title:'NILAI SUMATIF',description:source.description,headers,rows};
    }
    // Yang disalin HANYA nilai TES & NON TES (tanpa judul, header, NO/NAMA, dan rata-rata).
    // Tab-separated: setiap nilai jatuh di kolomnya sendiri saat ditempel ke Excel maupun Word.
    function scoreValueGrid(kind,data){
      const source=scoreSource(data);
      if(!source)return [];
      const materials=safeMaterials(source.context.materials);
      if(kind==='formative'){
        const columnCount=materials.reduce((total,material)=>total+Math.max(1,material.objectives.length),0);
        return source.students.map(student=>source.readFormative(student.id).slice(0,columnCount).map(copyCellText));
      }
      return source.students.map(student=>{
        const scores=source.readSummative(student.id);
        return scores.asam.concat(scores.asas).map(copyCellText);
      });
    }
    function scoreCopyText(kind,data){
      return scoreValueGrid(kind,data)
        .map(row=>row.map(cell=>String(cell==null?'':cell).replace(/[\t\r\n]+/g,' ')).join('\t'))
        .join('\r\n');
    }
    function writeClipboard(text){if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(text);return new Promise((resolve,reject)=>{const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();try{const ok=document.execCommand('copy');area.remove();ok?resolve():reject(new Error('Browser menolak clipboard.'));}catch(error){area.remove();reject(error);}});}
    function copyWaliTable(){if(!state.waliData){toast('Tampilkan Nilai terlebih dahulu.','error');return;}copyScoreTable(state.waliTab,state.waliData);}
    function copyScoreTable(kind,data){
      const source=scoreSource(data);
      if(!source){toast('Pilih identitas pembelajaran terlebih dahulu.','error');return;}
      if(!source.students.length){toast('Belum ada data murid untuk disalin.','error');return;}
      const label=kind==='formative'?'formatif':'sumatif';
      writeClipboard(scoreCopyText(kind,data))
        .then(()=>toast(`Nilai ${label} (TES & NON TES saja, tanpa judul/header/nama) berhasil disalin.`,'success'))
        .catch(error=>toast('Nilai tidak dapat disalin: '+messageOf(error),'error'));
    }
    function copyScoreValue(value){return value===null||typeof value==='undefined'||Number.isNaN(Number(value))?'':formatScore(value);}
    function waliCopyText(tab){const data=state.waliData;if(!data)return '';if(tab==='formative'){return data.students.map(student=>vector(data.formative[student.id],data.scoreCounts.formative).map(copyScoreValue).join('\t')).join('\n');}return data.students.map(student=>{const source=data.summative[student.id]||{};return vector(source.asam,data.scoreCounts.summative).concat(vector(source.asas,data.scoreCounts.summative)).map(copyScoreValue).join('\t');}).join('\n');}
    // Revisi 36: salin lingkup materi dan salin TP dipisah menjadi dua tombol.
    function waliMaterialTitles(data){return safeMaterials(data.context.materials).map((material,index)=>materialTitleLabel(material,index));}
    function waliObjectives(data){
      const rows=[];
      safeMaterials(data.context.materials).forEach((material,materialIndex)=>{
        material.objectives.forEach((objective,objectiveIndex)=>{
          rows.push({material:materialTitleLabel(material,materialIndex),label:`TP ${objectiveIndex+1}`,text:objectiveLabel(objective,objectiveIndex)});
        });
      });
      return rows;
    }
    // Satu kolom per baris, tanpa nomor dan tanpa nama materi:
    // teks TP semua lingkup materi digabung urut, berupa kalimat utuh (aman di Excel & Word).
    // Satu TP = satu baris = satu sel saat ditempel ke Excel.
    // Baris baru di dalam teks TP diratakan menjadi spasi agar tidak menambah sel.
    function oneLine(text){return String(text==null?'':text).replace(/[\t\r\n]+/g,' ').replace(/\s{2,}/g,' ').trim();}
    function waliMaterialTitlesText(){const data=state.waliData;if(!data)return '';return waliMaterialTitles(data).map(oneLine).filter(Boolean).join('\r\n');}
    function waliObjectivesText(){const data=state.waliData;if(!data)return '';return waliObjectives(data).map(row=>oneLine(row.text)).filter(Boolean).join('\r\n');}
    function copyWaliMaterialTitles(){
      if(!state.waliData){toast('Tampilkan Nilai terlebih dahulu.','error');return;}
      const total=waliMaterialTitles(state.waliData).length;
      if(!total){toast('Belum ada lingkup materi untuk disalin.','error');return;}
      writeClipboard(waliMaterialTitlesText())
        .then(()=>toast(`${total} lingkup materi berhasil disalin tanpa nomor (satu kolom, siap tempel ke Excel/Word).`,'success'))
        .catch(error=>toast('Lingkup materi tidak dapat disalin: '+messageOf(error),'error'));
    }
    function copyWaliObjectives(){
      if(!state.waliData){toast('Tampilkan Nilai terlebih dahulu.','error');return;}
      const total=waliObjectives(state.waliData).length;
      if(!total){toast('Belum ada tujuan pembelajaran untuk disalin.','error');return;}
      writeClipboard(waliObjectivesText())
        .then(()=>toast(`${total} tujuan pembelajaran berhasil disalin tanpa nomor (satu kolom, siap tempel ke Excel/Word).`,'success'))
        .catch(error=>toast('Tujuan pembelajaran tidak dapat disalin: '+messageOf(error),'error'));
    }

    // ---------- Event ----------
    function toggleSidebar(){const shell=$('#appShell'),collapsed=shell.classList.toggle('sidebar-collapsed');$('#logoToggle').setAttribute('aria-expanded',String(!collapsed));}
    function bindEvents(){
      $('#loginButton').addEventListener('click',login);$('#loginPassword').addEventListener('keydown',event=>{if(event.key==='Enter')login();});$('#toggleLoginPassword').addEventListener('click',toggleLoginPassword);$('#activateButton').addEventListener('click',activate);$('#logoToggle').addEventListener('click',toggleSidebar);$('#logoutButton').addEventListener('click',logout);
      $$('.nav-item[data-view-target]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.viewTarget)));$('#sidebarLogoutButton').addEventListener('click',logout);$('#loadContextButton').addEventListener('click',loadContext);$('#saveContextButton').addEventListener('click',saveContext);$('#className').addEventListener('change',handleIdentityClassChange);$('#addMaterialButton').addEventListener('click',addMaterial);$('#materialsBuilder').addEventListener('click',event=>{const button=event.target.closest('[data-material-action]');if(button)materialAction(button);});
      const decimalField=$('#appDecimals');
      if(decimalField)decimalField.addEventListener('change',()=>{
        // Langsung terapkan ke Formatif/Sumatif/Rekap, lalu simpan preferensi (perangkat + server).
        const decimals=decimalSelection();
        state.appearance={...state.appearance,decimals};rememberDecimals(decimals);syncDecimalBridge();renderAll();
        toast(`Rata-rata kini ditampilkan ${decimals===0?'tanpa desimal (bulat)':`dengan ${decimals} desimal`}.`,'success');
        silentServer('saveAppAppearance',[state.sessionToken,{...state.appearance,decimals}],()=>{});
        persistContextDecimals(decimals);
      });
      $('#saveHomeroomButton').addEventListener('click',saveHomerooms);$('#unlockHomeroomButton').addEventListener('click',unlockHomerooms);$('#saveAdminCredentialsButton').addEventListener('click',saveAdminCredentials);$('#saveAppearanceButton').addEventListener('click',saveAppearance);$('#clearLoginBackgroundButton').addEventListener('click',clearLoginBackground);$('#resetApplicationButton').addEventListener('click',resetApplication);$('#loginBackgroundFile').addEventListener('change',previewLoginBackgroundFile);$('#appTheme').addEventListener('change',()=>applyAppearance({theme:$('#appTheme').value,loginBackgroundDataUri:state.appearance.loginBackgroundDataUri}));$('#saveAboutButton').addEventListener('click',saveAbout);$('#applyAboutTemplateButton').addEventListener('click',applyAboutTemplate);$('#createUserButton').addEventListener('click',createUser);$('#cancelEditUserButton').addEventListener('click',resetUserEditor);$('#usersTableBody').addEventListener('click',event=>{const edit=event.target.closest('[data-edit-user]');if(edit){beginEditUser(edit.dataset.editUser);return;}const remove=event.target.closest('[data-delete-user]');if(remove){deleteUserAccount(remove.dataset.deleteUser);return;}const button=event.target.closest('[data-toggle-user]');if(button)toggleUser(button);});
      $('#saveStudentsButton').addEventListener('click',saveStudents);$('#deleteStudentsButton').addEventListener('click',openBulkDeleteStudentsModal);$('#studentsClassSelect').addEventListener('change',switchStudentsClass);$('#addSingleStudentButton').addEventListener('click',addOneStudent);$('#singleStudentName').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();addOneStudent();}});$('#addBulkStudentsButton').addEventListener('click',addBulkStudents);$('#studentsTableBody').addEventListener('click',event=>{const move=event.target.closest('[data-move-student]');if(move){syncStudentInputs();const index=state.students.findIndex(s=>s.id===move.dataset.moveStudent);const target=move.dataset.moveDirection==='up'?index-1:index+1;if(index>=0&&target>=0&&target<state.students.length){const temporary=state.students[index];state.students[index]=state.students[target];state.students[target]=temporary;studentsDirty=true;renderStudents();toast('Urutan murid diubah. Klik Simpan Data Murid untuk menerapkan.','success');}return;}const button=event.target.closest('[data-remove-student]');if(!button)return;const student=state.students.find(s=>s.id===button.dataset.removeStudent);if(!student)return;confirmRemoveStudent(student);});
      injectScoreStyles();
      document.addEventListener('keydown',handleScoreKeydown);
      document.addEventListener('paste',event=>{const input=event.target;if(!input||!input.matches||!input.matches('input.score-input[data-score-kind]'))return;const clip=event.clipboardData||window.clipboardData||null;const text=clip&&typeof clip.getData==='function'?String(clip.getData('text')):'';if(text==='')return;event.preventDefault();applyScorePaste(input,text);});
      $('#saveFormativeButton').addEventListener('click',saveFormative);$('#saveSummativeButton').addEventListener('click',saveSummative);
      const copyFormativeButton=$('#copyFormativeButton');if(copyFormativeButton)copyFormativeButton.addEventListener('click',()=>copyScoreTable('formative'));
      const copySummativeButton=$('#copySummativeButton');if(copySummativeButton)copySummativeButton.addEventListener('click',()=>copyScoreTable('summative'));['formativeTableWrap','summativeTableWrap','waliFormativeWrap','waliSummativeWrap'].forEach(id=>{$('#'+id).addEventListener('click',event=>{const button=event.target.closest('[data-score-scroll-shift]');if(button)shiftScoreTable(button);});});document.addEventListener('input',event=>{const input=event.target;if(input&&input.matches&&input.matches('input[data-score-kind]'))updateScoreInput(input);});document.addEventListener('input',event=>{const field=event.target;if(field&&field.matches&&field.matches('.student-name-input'))studentsDirty=true;});document.addEventListener('input',event=>{const field=event.target;if(field&&field.matches&&field.matches('#teacherName,#teacherNip,#formativeWeight,#summativeWeight,.material-title,textarea[data-objective-material]'))identityDirty=true;});document.addEventListener('change',event=>{const input=event.target;if(!input||!input.matches||!input.matches('input[data-score-kind]'))return;if(input.value!==''){const n=toNumber(input.value);if(n!==null&&n>=0&&n<=100)input.value=String(round2(n));}updateScoreInput(input);});
      $('#exportExcelButton').addEventListener('click',exportExcel);const __decBox=$('#decimalQuickBox');if(__decBox)__decBox.hidden=isWali();
      $('#loadWaliCopyButton').addEventListener('click',loadWaliCopy);
      ['waliSubject','waliClassName','waliSemester','waliAcademicYear'].forEach(id=>{
        const field=$('#'+id);
        if(!field)return;
        field.addEventListener('change',autoLoadWaliCopy);
        if(id==='waliAcademicYear')field.addEventListener('input',()=>{clearTimeout(field._bnTimer);field._bnTimer=setTimeout(autoLoadWaliCopy,600);});
      });$('#copyWaliTableButton').addEventListener('click',copyWaliTable);$('#copyWaliMaterialTitlesButton').addEventListener('click',copyWaliMaterialTitles);$('#copyWaliObjectivesButton').addEventListener('click',copyWaliObjectives);$('#downloadWaliFileButton').addEventListener('click',downloadWaliFile);$$('[data-wali-tab]').forEach(button=>button.addEventListener('click',()=>{state.waliTab=button.dataset.waliTab;renderWaliTables();}));
    }
    document.addEventListener('DOMContentLoaded',()=>{bindEvents();if(window.innerWidth<=820){$('#appShell').classList.add('sidebar-collapsed');$('#logoToggle').setAttribute('aria-expanded','false');}bootstrap();});
