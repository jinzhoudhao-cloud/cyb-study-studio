const fs=require('node:fs');
require('./build-practice.cjs');
let html=fs.readFileSync('.sites-runtime/practice-test.html','utf8');
html=html.replace('<script src="/sync-merge.js"></script><script src="/cloud-sync.js"></script>','');
html=html.replace("const STORAGE='cyb-study-studio-v1'","const STORAGE='cyb-offline-v1'");
fs.writeFileSync('.sites-runtime/offline.html',html);
console.log('Offline file: .sites-runtime/offline.html (local only; no cloud sync or online nicknames)');
