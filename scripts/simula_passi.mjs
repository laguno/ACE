// Porting in Node di scripts/simula_passi.py (sul PC del 13/11 Python non c'è). PRNG diverso: risultati statisticamente uguali, non identici.
// Quarto argomento: probabilità di una partita tutta in panchina (5 passi, +5 se vinta), che lo script Python non ha.
// uso: node scripts/simula_passi.mjs <S2 aaaa-mm-gg> <tot> <prima_tappa> [prob_panchina]
const [S2s, totS, aS, pancS='0'] = process.argv.slice(2);
const DAY=864e5, dd=s=>Date.parse(s+'T00:00:00Z'), wd=t=>(new Date(t).getUTCDay()+6)%7; // lun=0
const D0=dd('2026-11-23'), DFINE=dd('2027-06-04'), S2=dd(S2s), PANC=+pancS;
const FESTE=new Set([dd('2026-12-08'),dd('2027-06-02')]);
for(let i=0;i<14;i++)FESTE.add(dd('2026-12-24')+i*DAY); for(let i=0;i<6;i++)FESTE.add(dd('2027-03-25')+i*DAY);
const scuola=d=>wd(d)<5&&!FESTE.has(d), ALLEN=new Set([0,1,2,4]);
const CHIAVI_FORZ=[2,4,7,14,17,21,26,31,36], FORZ=[3,6,9,12,15,18,21,24,27];
const V={cartella:5,compiti:10,anticipo:1.3,borsa:2,fogli:2,ripasso:10,dieci:10,foto:2,flash:3,video:3,quiz:{1:[10,6],2:[6,4],3:[3,2],4:[1,1]},gen_voce:2,gen_tetto:6,partita:10,vinta:15,note_did:-10,disc:-20,merito:50,bagno:-1,antisport:-7,imbroglio:-10,pagella_suff:25};
function rng(seed){let a=(seed*2654435761+12345)>>>0;const r=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
  r.gauss=(m,s)=>m+s*Math.sqrt(-2*Math.log(1-r()))*Math.cos(2*Math.PI*r()); r.randint=(x,y)=>x+Math.floor(r()*(y-x+1)); return r;}
const G=[];for(let d=D0;d<=DFINE;d+=DAY)G.push(d);
const sett=[];for(const d of G){if(!sett.length||wd(d)===0)sett.push([]);sett.at(-1).push(d);} // D0 è lunedì
const sum=(n,f)=>{let s=0;for(let i=0;i<n;i++)s+=f();return s};
function simula(p,seed,flag,tot,rimonta=1.25){
  const R=rng(seed); const verifiche=G.filter(d=>scuola(d)&&R()<0.3);
  let tot_p=0,chiavi=0;const storia=[],prec={},insuff={};
  sett.forEach((wk,wi)=>{
    const u=Math.min(0.98,Math.max(0.25,R.gauss(p,0.12)));
    let molt=1; if(flag&&tot_p<flag[wi]-1.5*(tot/27))molt=rimonta;
    let guad=0,obb_poss=0,obb_fatto=0,n_obb=0,n_fatti=0,note=0,d;
    const obb=v=>{obb_poss+=v;n_obb++;if(R()<u){obb_fatto+=v;n_fatti++;return true}return false};
    for(d of wk){
      const dom=d+DAY; let compiti_ok=true;
      if(scuola(dom)){ if(obb(V.cartella))guad+=V.cartella; compiti_ok=obb(V.compiti); if(compiti_ok)guad+=V.compiti*(R()<0.4*u?V.anticipo:1); }
      if((ALLEN.has(wd(dom))&&!FESTE.has(dom))||((wd(dom)===3||wd(dom)===5)&&dom>=S2&&R()<0.5)){ if(obb(V.borsa))guad+=V.borsa; }
      if(scuola(d)&&R()<0.06){ if(obb(V.fogli))guad+=V.fogli; }
      const vicina=verifiche.some(x=>x-d>0&&x-d<=4*DAY);
      if(vicina&&(scuola(d)||wd(d)>=5)){ if(obb(V.ripasso))guad+=V.ripasso; }
      if(d>=S2){ if(obb(V.dieci))guad+=V.dieci; }
      guad+=Math.min(V.gen_tetto,V.gen_voce*sum(4,()=>R()<0.45*u));
      if(scuola(d)&&R()<0.4&&R()<u)guad+=V.foto;
      if(compiti_ok){
        guad+=V.flash*sum(4,()=>R()<0.45*u); guad+=V.video*sum(4,()=>R()<0.30*u);
        const nq=sum(vicina?4:2,()=>R()<(vicina?0.5*u:0.2*u));
        for(let a=1;a<=nq;a++){const ok=R()<0.25+0.5*u;guad+=V.quiz[Math.min(a,4)][ok?0:1];}
      }
      if(d>=S2&&(wd(d)===3||wd(d)===5)&&!FESTE.has(d)&&R()<0.5){
        const panchina=R()<PANC; const vinta=R()<0.5;
        guad+=panchina?5+(vinta?5:0):V.partita+(vinta?V.vinta:0);
      }
      if(verifiche.includes(d)){
        const mat=R.randint(1,8),voto=Math.round(Math.min(10,Math.max(4,R.gauss(5.2+2.2*u,1.1))));
        let b=voto>=9?30:voto===8?20:voto===7?10:0;
        if(mat in prec&&voto>prec[mat]&&voto>=6)b+=15; if(insuff[mat]&&voto>=6)b+=20;
        insuff[mat]=voto<6;prec[mat]=voto;guad+=b;
      }
    }
    if(R()<(1-u)*0.6)note++; if(note)guad+=V.note_did/3;
    if(R()<0.02){note++;guad+=V.disc} if(R()<0.03)guad+=V.merito;
    guad+=V.bagno*sum(5,()=>R()<(1-u)*0.5);
    if(d>=S2&&R()<0.01)guad+=V.antisport; if(R()<0.01)guad+=V.imbroglio;
    const pg=dd('2027-02-01'); if(wk[0]<=pg&&pg<=wk.at(-1)){const media=5.2+2.2*p;guad+=media>=7.5?200:media>=7?100:0;guad+=V.pagella_suff*(R()<0.3);}
    const quota=obb_poss>0&&obb_fatto>=0.7*obb_poss;
    tot_p+=Math.max(0,guad*(quota?molt:1));
    let c=quota?1:0; if(c&&note===0)c=2; if(c===2&&n_fatti>=0.95*n_obb)c=3; chiavi+=c;
    storia.push({sett:new Date(wk[0]).toISOString().slice(5,10),passi:tot_p,chiavi});
  });
  return storia;
}
const pyround=x=>{const f=Math.floor(x),r=x-f;return r>0.5?f+1:r<0.5?f:(f%2?f+1:f)};
function costi(tot,a){const b=(tot-27*a)/351;const c=[...Array(27)].map((_,i)=>5*pyround((a+b*i)/5));c[26]+=tot-c.reduce((x,y)=>x+y);return c}
const soglie=c=>{let t=0;return c.map(x=>t+=x)};
function curva(tot,n=200,pref=0.8){const hs=[...Array(n)].map((_,s)=>simula(pref,10000+s));const W=hs[0].length;
  const m=[...Array(W)].map((_,w)=>hs.reduce((s,h)=>s+h[w].passi,0)/n);return m.map(x=>x/m.at(-1)*tot)}
function analisi(p,tot,a,n=Number(process.env.N||300)){
  const S=soglie(costi(tot,a)),flag=[0,...curva(tot).slice(0,-1)];let cima=0;const d27=[],pf=[];
  for(let s=0;s<n;s++){const h=simula(p,s,flag,tot);const aperti=new Set();
    for(const x of h){const tappa=S.filter(v=>v<=x.passi).length;FORZ.forEach((t,i)=>{if(!aperti.has(t)&&tappa>=t&&x.chiavi>=CHIAVI_FORZ[i]){aperti.add(t);if(t===27)d27.push(x.sett)}})}
    if(aperti.has(27))cima++;pf.push(h.at(-1).passi)}
  pf.sort((x,y)=>x-y);d27.sort();
  return `p=${p} cima=${Math.round(100*cima/n)}% passi_med=${Math.round(pf[n>>1])} data_cima_med=${d27.length>n/2?d27[d27.length>>1]:'-'}`}
const tot=+totS,a=+aS;const c=costi(tot,a);console.log(`S2=${S2s} tot=${tot} a=${a} panc=${PANC} somma=${c.reduce((x,y)=>x+y)} costi=${c}`);
for(const p of [0.7,0.75,0.8,0.9])console.log(' ',analisi(p,tot,a));
