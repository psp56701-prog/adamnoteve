// Generates 3 slogan throw-blanket mockups (one per color) as HTML files.
// Render each to PNG with headless Chrome (see the chrome commands run after).
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const mascot = fs.readFileSync(path.join(ROOT, 'designs', 'mascot-eve.png')).toString('base64');
const mascotURI = 'data:image/png;base64,' + mascot;
const OUT = path.join(ROOT, 'scratchpad-blankets');
fs.mkdirSync(OUT, { recursive: true });

const CFG = [
  { id: 'p50',
    slogan: '<span class="hi">Healing</span> in progress under this cover.',
    bg1: '#aac7a2', bg2: '#84a97c', ink: '#14311b', acc: '#ff2d78', fringe: '#6f9068' },
  { id: 'p51',
    slogan: '<span class="hi">No exes</span> allowed under here.',
    bg1: '#eeaab8', bg2: '#dc8296', ink: '#46132b', acc: '#fffafc', fringe: '#c96c81' },
  { id: 'p85',
    slogan: 'My only <span class="hi">healthy</span> relationship is with this blanket.',
    bg1: '#d18661', bg2: '#af5330', ink: '#fff2e9', acc: '#ffe08a', fringe: '#94421f' },
];

const html = (c) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:900px;height:900px;overflow:hidden}
  .stage{width:1200px;height:1200px;transform:scale(.75);transform-origin:top left;
    display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 50% 38%, #fbf7f2 0%, #efe7dd 100%);
    font-family:'Arial Black','Segoe UI',Arial,sans-serif;}
  .wrap{position:relative;width:920px;height:1010px;}
  .blanket{position:absolute;inset:0;border-radius:34px;
    background:linear-gradient(150deg, ${c.bg1} 0%, ${c.bg2} 100%);
    box-shadow:0 40px 80px rgba(0,0,0,.22), inset 0 2px 0 rgba(255,255,255,.18);
    overflow:hidden;}
  /* soft fabric folds (smooth gradients — compress well) */
  .blanket:before{content:"";position:absolute;inset:0;
    background:linear-gradient(118deg, rgba(255,255,255,.06) 0 46%, rgba(0,0,0,.05) 54% 100%);}
  .blanket:after{content:"";position:absolute;inset:0;
    background:linear-gradient(105deg, rgba(255,255,255,.13) 0%, transparent 34%, transparent 66%, rgba(0,0,0,.09) 100%);}
  .inner{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;
    align-items:center;justify-content:center;text-align:center;padding:70px 78px;}
  .mascot{width:132px;height:auto;margin-bottom:34px;filter:drop-shadow(0 8px 14px rgba(0,0,0,.18));}
  .slogan{color:${c.ink};font-weight:900;font-size:78px;line-height:1.08;letter-spacing:.5px;
    text-shadow:0 2px 3px rgba(0,0,0,.10);}
  .hi{color:${c.acc};}
  .url{position:absolute;bottom:70px;left:0;right:0;text-align:center;z-index:2;
    color:${c.ink};opacity:.72;font-size:22px;font-weight:800;letter-spacing:3px;}
  /* fringe tassels */
  .fringe{position:absolute;left:34px;right:34px;bottom:-1px;height:30px;z-index:1;display:flex;gap:6px;justify-content:center;overflow:hidden;}
  .fringe i{flex:0 0 10px;height:30px;background:${c.fringe};border-radius:0 0 4px 4px;}
</style></head><body>
  <div class="stage">
  <div class="wrap">
    <div class="blanket"></div>
    <div class="fringe">${'<i></i>'.repeat(64)}</div>
    <div class="inner"><img class="mascot" src="${mascotURI}"><div class="slogan">${c.slogan}</div></div>
    <div class="url">ADAMNOTEVE.COM</div>
  </div>
  </div>
</body></html>`;

for (const c of CFG) {
  fs.writeFileSync(path.join(OUT, c.id + '.html'), html(c));
  console.log('wrote', c.id + '.html');
}
console.log('OUT_DIR:' + OUT);
