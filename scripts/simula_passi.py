"""Modello dei passi di ACE (regole del 7 novembre 2026): simulazione Monte Carlo 23/11/2026 - 4/6/2027.
Uso: python3 scripts/simula_passi.py <totale_passi> <costo_prima_tappa>   es. 7200 125
I numeri devono restare allineati a data/config-gioco.json."""
import random, datetime as dt, statistics as st, bisect, sys, json
D0=dt.date(2026,11,23); DFINE=dt.date(2027,6,4); S2=dt.date(2027,1,7)
FESTE={dt.date(2026,12,8)}|{dt.date(2026,12,24)+dt.timedelta(i) for i in range(14)}|{dt.date(2027,3,25)+dt.timedelta(i) for i in range(6)}|{dt.date(2027,6,2)}
def scuola(d): return d.weekday()<5 and d not in FESTE
ALLEN={0,1,2,4}
CHIAVI_FORZ=[2,4,7,14,17,21,26,31,36]  # soglie approvate il 7 novembre 2026 (vedi data/config-gioco.json)
V=dict(cartella=5,compiti=10,anticipo=1.3,borsa=2,fogli=2,ripasso=10,dieci=10,foto=2,flash=3,video=3,
       quiz={1:(10,6),2:(6,4),3:(3,2),4:(1,1)},gen_voce=2,gen_tetto=6,partita=10,vinta=15,
       note_did=-10,disc=-20,merito=50,bagno=-1,antisport=-7,imbroglio=-10,pagella_suff=25)
def giorni():
    d=D0
    while d<=DFINE: yield d; d+=dt.timedelta(1)
def simula(p,seed=0,flag=None,tot=None,rimonta=1.25,bagno_sett=None):
    R=random.Random(seed); G=list(giorni())
    verifiche=[d for d in G if scuola(d) and R.random()<0.3]
    sett={}
    for d in G: sett.setdefault(d.isocalendar()[:2],[]).append(d)
    tot_p=0; chiavi=0; storia=[]; prec={}; insuff={}
    for wi,k in enumerate(sett):
        u=min(0.98,max(0.25,R.gauss(p,0.12)))
        molt=1.0
        if flag and tot_p < flag[wi]-1.5*(tot/27): molt=rimonta
        guad=0; obb_poss=0; obb_fatto=0; n_obb=0; n_fatti=0; note=0
        for d in sett[k]:
            dom=d+dt.timedelta(1)
            def obb(v):
                nonlocal obb_poss,obb_fatto,n_obb,n_fatti,guad
                obb_poss+=v; n_obb+=1
                if R.random()<u: obb_fatto+=v; n_fatti+=1; guad_add=v; return True
                return False
            compiti_ok=True
            if scuola(dom) or (d.weekday()==6 and scuola(dom)):
                if obb(V['cartella']): guad+=V['cartella']
                compiti_ok=obb(V['compiti'])
                if compiti_ok: guad+=V['compiti']*(V['anticipo'] if R.random()<0.4*u else 1)
            if (dom.weekday() in ALLEN and dom not in FESTE) or (dom.weekday() in (3,5) and dom>=S2 and R.random()<0.5):
                if obb(V['borsa']): guad+=V['borsa']
            if scuola(d) and R.random()<0.06:
                if obb(V['fogli']): guad+=V['fogli']
            vicina=[x for x in verifiche if 0<(x-d).days<=4]
            if vicina and (scuola(d) or d.weekday()>=5):
                if obb(V['ripasso']): guad+=V['ripasso']
            if d>=S2:
                if obb(V['dieci']): guad+=V['dieci']
            # gesti di casa
            guad+=min(V['gen_tetto'],sum(V['gen_voce'] for _ in range(4) if R.random()<0.45*u))
            # foto dei compiti richieste (circa 2 a settimana)
            if scuola(d) and R.random()<0.4 and R.random()<u: guad+=V['foto']
            # studio facoltativo: solo con i compiti del giorno fatti
            if compiti_ok:
                guad+=V['flash']*sum(R.random()<0.45*u for _ in range(4))
                guad+=V['video']*sum(R.random()<0.30*u for _ in range(4))
                nq=sum(R.random()<(0.5*u if vicina else 0.2*u) for _ in range(4 if vicina else 2))
                for a in range(1,nq+1):
                    ok=R.random()<0.25+0.5*u
                    guad+=V['quiz'][min(a,4)][0 if ok else 1]
            # partite (sprint 2)
            if d>=S2 and d.weekday() in (3,5) and d not in FESTE and R.random()<0.5:
                guad+=V['partita']+(V['vinta'] if R.random()<0.5 else 0)
            # voti
            if d in verifiche:
                mat=R.randint(1,8); voto=round(min(10,max(4,R.gauss(5.2+2.2*u,1.1))))
                b=30 if voto>=9 else 20 if voto==8 else 10 if voto==7 else 0
                if mat in prec and voto>prec[mat] and voto>=6: b+=15
                if insuff.get(mat) and voto>=6: b+=20
                insuff[mat]=voto<6; prec[mat]=voto; guad+=b
        # note e malus settimanali
        if R.random()<(1-u)*0.6: note+=1   # nota didattica; il -10 ogni tre lo approssimo
        if note: guad+=V['note_did']/3
        if R.random()<0.02: note+=1; guad+=V['disc']
        if R.random()<0.03: guad+=V['merito']
        nb=bagno_sett if bagno_sett is not None else sum(R.random()<(1-u)*0.5 for _ in range(5))
        guad+=V['bagno']*nb
        if d>=S2 and R.random()<0.01: guad+=V['antisport']
        if R.random()<0.01: guad+=V['imbroglio']
        if sett[k][0]<=dt.date(2027,2,1)<=sett[k][-1]:
            media=5.2+2.2*p; guad+=200 if media>=7.5 else 100 if media>=7 else 0
            guad+=V['pagella_suff']*(R.random()<0.3)
        quota= obb_poss>0 and obb_fatto>=0.7*obb_poss
        tot_p+=max(0,guad*(molt if quota else 1))
        c=0
        if quota: c=1
        if c and note==0: c=2
        if c==2 and n_fatti>=0.95*n_obb: c=3
        chiavi+=c
        storia.append(dict(sett=str(sett[k][0]),passi=round(tot_p),chiavi=chiavi,guad=guad,rimonta=molt>1 and quota))
    return storia
def costi(tot,a):
    b=(tot-27*a)/351; c=[5*round((a+b*i)/5) for i in range(27)]; c[-1]+=tot-sum(c); return c
def soglie(c):
    s=[];t=0
    for x in c: t+=x; s.append(t)
    return s
def curva_bandierina(tot,n=200,pref=0.8):
    hs=[simula(pref,seed=10000+s) for s in range(n)]
    W=len(hs[0]); media=[st.mean(h[w]['passi'] for h in hs) for w in range(W)]
    return [m/media[-1]*tot for m in media]
FORZ=[3,6,9,12,15,18,21,24,27]
def analisi(p,tot,a,n=300,**kw):
    S=soglie(costi(tot,a)); flag=[0]+curva_bandierina(tot)[:-1]
    cima=0; date={t:[] for t in FORZ}; chiavi_fin=[]; passi_fin=[]; giorn=[]
    for s in range(n):
        h=simula(p,seed=s,flag=flag,tot=tot,**kw); aperti=set()
        for x in h:
            tappa=bisect.bisect_right(S,x['passi'])
            for i,t in enumerate(FORZ):
                if t not in aperti and tappa>=t and x['chiavi']>=CHIAVI_FORZ[i]:
                    aperti.add(t); date[t].append(x['sett'])
        cima+=27 in aperti; chiavi_fin.append(h[-1]['chiavi']); passi_fin.append(h[-1]['passi'])
    med=lambda l: sorted(l)[len(l)//2][5:] if len(l)>n*0.5 else f"{round(100*len(l)/n)}%"
    return dict(p=p,cima=round(100*cima/n),passi_med=round(st.median(passi_fin)),chiavi_med=st.median(chiavi_fin),forzieri={t:med(date[t]) for t in FORZ})
if __name__=='__main__':
    tot=int(sys.argv[1]); a=int(sys.argv[2])
    print(costi(tot,a)); print([soglie(costi(tot,a))[t-1] for t in FORZ])
    for p in (0.6,0.7,0.8,0.9): print(analisi(p,tot,a))
