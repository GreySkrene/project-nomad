#!/usr/bin/env python3
"""Build a self-contained offline Kiwix landing page with spelling correction."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


TEMPLATE = r'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>NOMAD Offline Library Search</title>
  <style>
    :root{color-scheme:dark;--bg:#07100f;--panel:#101b19;--panel2:#172522;--line:#2a3d38;--text:#edf6f2;--muted:#a4b7b0;--green:#66d49a;--amber:#f4ba68}
    *{box-sizing:border-box} body{margin:0;background:radial-gradient(circle at 20% 0,#15352d 0,transparent 38%),var(--bg);color:var(--text);font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;min-height:100vh}
    main{max-width:980px;margin:auto;padding:42px 20px}.eyebrow{color:var(--green);font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase}h1{font-size:clamp(32px,5vw,52px);line-height:1.05;margin:10px 0}p{color:var(--muted)}
    .panel{margin-top:30px;background:rgba(16,27,25,.96);border:1px solid var(--line);border-radius:16px;padding:24px;box-shadow:0 22px 70px #0008}label{display:block;font-weight:700;margin:16px 0 7px}
    select,input{width:100%;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--text);padding:14px;font:inherit}input{font-size:19px}select:focus,input:focus{outline:2px solid var(--green);outline-offset:1px}
    .searchrow{display:grid;grid-template-columns:1fr auto;gap:10px}.primary,.secondary,.result{border:0;border-radius:10px;cursor:pointer;font:inherit}.primary{background:var(--green);color:#04110c;font-weight:800;padding:0 22px}.primary:disabled{opacity:.5;cursor:not-allowed}.secondary{background:none;color:var(--green);padding:8px 0;text-decoration:underline}.status{min-height:25px;margin:18px 0 8px;color:var(--muted)}
    .correction{display:none;border:1px solid #66d49a66;background:#16352b;border-radius:10px;padding:12px 14px;margin-top:18px}.results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:12px}.result{background:var(--panel2);border:1px solid var(--line);color:var(--text);text-align:left;padding:13px 15px}.result:hover,.result:focus{border-color:var(--green)}.result small{display:block;color:var(--muted);margin-top:3px}
    .fallback{border-top:1px solid var(--line);margin-top:22px;padding-top:17px}.note{font-size:13px}.toplinks{display:flex;gap:16px;flex-wrap:wrap;margin-top:20px}.toplinks a{color:var(--green)}
    @media(max-width:650px){main{padding:26px 14px}.panel{padding:18px}.searchrow{grid-template-columns:1fr}.primary{padding:14px}.results{grid-template-columns:1fr}}
  </style>
</head>
<body><main>
  <div class="eyebrow">Project NOMAD · Offline reference library</div>
  <h1>Find the right article</h1>
  <p>Article titles come first. Spelling help and every result on this page work without internet or AI.</p>
  <div class="toplinks"><a id="nomad-home" href="#">← NOMAD Command Center</a></div>
  <section class="panel">
    <form id="form">
      <label for="source">Search within</label>
      <select id="source">
        <option value="wikipedia_en_top_maxi_2026-06">Best of Wikipedia — illustrated (recommended)</option>
        <option value="wikipedia_en_all_mini_2026-06">Complete Wikipedia — compact</option>
        <option value="wikipedia_en_medicine_maxi_2026-10">Wikipedia Medicine</option>
        <option value="gardenology.org_en_all_2026-09">Gardenology — plant and garden encyclopedia</option>
        <option value="">All installed libraries — full text only</option>
      </select>
      <label for="query">Article or topic</label>
      <div class="searchrow"><input id="query" autofocus spellcheck="true" autocomplete="off" placeholder="Try cloud, cumulonimbus, earthquake…"><button id="find" class="primary" type="submit">Find article</button></div>
    </form>
    <div id="correction" class="correction"></div>
    <div id="status" class="status" aria-live="polite">Start typing to find article titles.</div>
    <div id="results" class="results"></div>
    <div class="fallback"><button id="fulltext" class="secondary" type="button">Search inside article text</button><p class="note">Full-text results are broader and may rank a different meaning of the same word first.</p></div>
  </section>
</main>
<script>
const WORDS_TEXT=__WORDS__;
const source=document.querySelector('#source'),query=document.querySelector('#query'),form=document.querySelector('#form'),results=document.querySelector('#results'),statusEl=document.querySelector('#status'),correction=document.querySelector('#correction'),find=document.querySelector('#find'),fulltext=document.querySelector('#fulltext');
document.querySelector('#nomad-home').href=`${location.protocol}//${location.hostname}:8080/home`;
let current=[],timer,index=null,correctedFrom=null;
function esc(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function articleUrl(path){return `/content/${encodeURIComponent(source.value)}/${path.split('/').map(encodeURIComponent).join('/')}`}
async function titles(term){if(!term.trim()||!source.value){current=[];render();return []}const u=new URL('/suggest',location.origin);u.searchParams.set('content',source.value);u.searchParams.set('term',term.trim());u.searchParams.set('count','12');const r=await fetch(u);if(!r.ok)throw Error(r.status);current=(await r.json()).filter(x=>x.kind==='path'&&x.path);render();return current}
function render(){results.innerHTML='';for(const item of current){const b=document.createElement('button');b.type='button';b.className='result';b.innerHTML=`<strong>${esc(item.value)}</strong><small>Open article</small>`;b.onclick=()=>location.href=articleUrl(item.path);results.appendChild(b)}}
function buildIndex(){if(index)return index;index={exact:new Set(),lengths:new Map()};for(const raw of WORDS_TEXT.split('\n')){const w=raw.trim().toLowerCase();if(!/^[a-z]+$/.test(w)||index.exact.has(w))continue;index.exact.add(w);const a=index.lengths.get(w.length)||[];a.push(w);index.lengths.set(w.length,a)}return index}
function distance(a,b){a=a.toLowerCase();b=b.toLowerCase();const d=Array.from({length:a.length+1},()=>Array(b.length+1));for(let i=0;i<=a.length;i++)d[i][0]=i;for(let j=0;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+1)}return d[a.length][b.length]}
function correctWord(raw){const w=raw.toLowerCase(),idx=buildIndex();if(w.length<4||idx.exact.has(w))return null;const max=w.length<=4?1:w.length<=8?2:3;let best=null;for(let l=w.length-max;l<=w.length+max;l++)for(const c of idx.lengths.get(l)||[]){if(c[0]!==w[0])continue;const n=distance(w,c);if(n<=max&&(!best||n<best.n||(n===best.n&&c<best.w)))best={w:c,n}}return best&&1-best.n/Math.max(w.length,best.w.length)>=.7?best.w:null}
function spelling(text){let changed=false;const value=text.replace(/[A-Za-z]+/g,t=>{const c=correctWord(t);if(!c)return t;changed=true;return /^[A-Z]/.test(t)?c[0].toUpperCase()+c.slice(1):c});return changed?value:null}
function openFull(text=query.value){const u=new URL('/search',location.origin);u.searchParams.set('pattern',text.trim());if(source.value)u.searchParams.set('content',source.value);location.href=u}
async function submit(e){e.preventDefault();const original=query.value.trim();if(!original)return;find.disabled=true;correction.style.display='none';correctedFrom=null;try{const list=await titles(original);const exact=list.find(x=>x.value.toLowerCase()===original.toLowerCase());if(exact){location.href=articleUrl(exact.path);return}const fixed=spelling(original);if(fixed){correctedFrom=original;query.value=fixed;correction.style.display='block';correction.innerHTML=`<strong>Spelling corrected:</strong> “${esc(original)}” → “${esc(fixed)}”. <button id="original" class="secondary" type="button">Search original instead</button>`;document.querySelector('#original').onclick=()=>openFull(original);const corrected=await titles(fixed);statusEl.textContent=corrected.length?`Showing title matches for “${fixed}”.`:`No title match for “${fixed}”; try full-text search.`}else statusEl.textContent=list.length?'Choose the intended article, or search inside every article.':'No close title was found. Try full-text search.'}catch{statusEl.textContent='The local Kiwix search service did not respond.'}finally{find.disabled=false}}
query.addEventListener('input',()=>{correction.style.display='none';clearTimeout(timer);timer=setTimeout(()=>titles(query.value).catch(()=>statusEl.textContent='Title suggestions unavailable.'),180)});source.addEventListener('change',()=>titles(query.value));form.addEventListener('submit',submit);fulltext.addEventListener('click',()=>query.value.trim()&&openFull());
</script></body></html>'''


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--word-list", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    words = args.word_list.read_text(encoding="utf-8")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(TEMPLATE.replace("__WORDS__", json.dumps(words)), encoding="utf-8")
    print(f"Wrote {args.output} ({args.output.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
