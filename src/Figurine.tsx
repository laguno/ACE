import { useEffect, useState } from 'react';
import manifest from '../data/manifest.json' with { type: 'json' };
import { supabase } from './supabase';
import { ArrowDown, ArrowLeft, ArrowUp } from '@phosphor-icons/react';
import { useSfondo } from './kit';
import { nomeFigurina } from './lib/copione';

// Figurina di Lani (design/Figurina.html) e Album da 64 (design/Album.html).

type Voto = { materia_id: string; data: string; voto: number; materie: { nome: string } | null };

/** Le 64 pose di famiglia (l'allenatore va nella pagina "La squadra", sprint 2). */
const POSE = manifest.avatar.filter((a) => a.personaggio !== 'allenatore');
const NERA = (tono: string) => tono === 'arrabbiato' || tono === 'dispettoso';
// ponytail: indizi per categoria; se servono indizi posa per posa, metterli nel manifest.
/** Le figurine ancora da prendere stanno in un riquadro per momento (decisione del signore, 9/11). */
const IN_ARRIVO: Record<string, string> = {
  base: 'In arrivo con le prime giornate',
  momento: 'In arrivo in un momento della giornata',
  sport: 'In arrivo con la pallavolo',
  stagione: 'In arrivo con una festa o una stagione',
  negativo: 'In arrivo nei giorni storti',
  extra: 'Rare: escono dai forzieri',
  tifo: 'In arrivo quando mamma o papà fanno il tifo',
  affettuoso: 'In arrivo con Leo',
  scherzoso: 'In arrivo con Leo',
  passioni: 'Rare: escono dai forzieri',
  animale: 'In arrivo con Bart o Lady',
};
const RISCATTO = 'Si riscattano con 7 giorni fatti bene';

export function Figurina({ chiudi }: { chiudi: () => void }) {
  useSfondo('viola');
  const [d, setD] = useState<{ voti: Voto[]; passi: number; chiavi: number; obiettivo: number }>();
  useEffect(() => {
    Promise.all([
      supabase.from('voti').select('materia_id, data, voto, materie(nome)').order('data'),
      supabase.from('saldo_passi').select('passi').maybeSingle(),
      supabase.from('chiavi_totali').select('chiavi').maybeSingle(),
      supabase.from('impostazioni').select('valore').eq('chiave', 'obiettivo_media').maybeSingle(),
    ]).then(([v, s, c, o]) =>
      setD({
        voti: (v.data ?? []) as unknown as Voto[],
        passi: s.data?.passi ?? 0,
        chiavi: c.data?.chiavi ?? 0,
        obiettivo: Number(o.data?.valore ?? 7.35),
      }),
    );
  }, []);
  if (!d) return null;

  const media = (l: number[]) => (l.length ? l.reduce((a, b) => a + Number(b), 0) / l.length : null);
  const generale = media(d.voti.map((v) => v.voto));
  const perMateria = Object.values(
    d.voti.reduce<Record<string, { nome: string; voti: number[] }>>((acc, v) => {
      (acc[v.materia_id] ??= { nome: v.materie?.nome ?? v.materia_id, voti: [] }).voti.push(Number(v.voto));
      return acc;
    }, {}),
  ).sort((a, b) => a.nome.localeCompare(b.nome));
  const fmt = (n: number | null) => (n === null ? '–' : n.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 2 }));

  return (
    <section className="schermo figurina-pagina">
      <Indietro chiudi={chiudi} />
      <div className="carta figurina">
        <div className="fascia">
          <span>R-Evolution U13</span>
          <b aria-hidden>9</b>
          <img src="/assets/avatar/lani/lani-divisa.webp" alt="Lani in divisa, numero 9" width={150} height={150} />
        </div>
        <div className="nome">
          <h1>Lani, n. 9</h1>
          <small>seconda media</small>
        </div>
        <dl className="numeri">
          <div>
            <dt>Media</dt>
            <dd>{fmt(generale)}</dd>
          </div>
          <div>
            <dt>Passi</dt>
            <dd>{d.passi.toLocaleString('it-IT')}</dd>
          </div>
          <div>
            <dt>Chiavi</dt>
            <dd>{d.chiavi}</dd>
          </div>
        </dl>
        <p className="obiettivo">
          <span>Obiettivo liceo: media {fmt(d.obiettivo)}</span>
          {generale !== null && generale < d.obiettivo && <b>mancano {fmt(d.obiettivo - generale)}</b>}
        </p>
        <div className="avanzamento" role="progressbar" aria-valuemin={0} aria-valuemax={10} aria-valuenow={generale ?? 0} aria-label="Media verso l'obiettivo">
          <span style={{ width: `${Math.min(100, ((generale ?? 0) / d.obiettivo) * 100)}%` }} />
        </div>
      </div>

      <div className="carta">
        <h2>Medie per materia</h2>
        {perMateria.length === 0 && <p>Ancora nessun voto su Nuvola.</p>}
        <ul className="medie">
          {perMateria.map((m) => {
            const ultimo = m.voti.at(-1) ?? 0; // per materia c'è sempre almeno un voto
            const prima = media(m.voti.slice(0, -1));
            const tendenza = prima === null || Math.abs(ultimo - prima) < 0.25 ? '=' : ultimo > prima ? '↑' : '↓';
            return (
              <li key={m.nome}>
                <span>{m.nome}</span>
                <b>{fmt(media(m.voti))}</b>
                <span className={`tendenza t${tendenza === '↑' ? 'su' : tendenza === '↓' ? 'giu' : 'pari'}`} aria-label={tendenza === '↑' ? 'in salita' : tendenza === '↓' ? 'in discesa' : 'stabile'}>
                  {tendenza === '↑' ? <ArrowUp size={18} weight="bold" aria-hidden /> : tendenza === '↓' ? <ArrowDown size={18} weight="bold" aria-hidden /> : 'come prima'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** "← Astra" in alto, come nelle bozze; il nome per chi usa il lettore resta "Torna ad Astra". */
function Indietro({ chiudi }: { chiudi: () => void }) {
  return (
    <button className="indietro" onClick={chiudi} aria-label="Torna ad Astra">
      <ArrowLeft size={20} weight="bold" aria-hidden /> Astra
    </button>
  );
}

export function Album({ chiudi }: { chiudi: () => void }) {
  useSfondo('panna');
  const [prese, setPrese] = useState<Set<string>>();
  useEffect(() => {
    supabase
      .from('figurine')
      .select('posa')
      .not('sbloccata_il', 'is', null)
      .then(({ data }) => setPrese(new Set((data ?? []).map((f) => f.posa))));
  }, []);
  if (!prese) return null;

  const normali = POSE.filter((p) => !NERA(p.tono));
  const nere = POSE.filter((p) => NERA(p.tono));
  const prese64 = POSE.filter((p) => prese.has(p.id)).length;
  type Posa = (typeof POSE)[number];
  const presa = (p: Posa) => (
    <li key={p.id} className="presa">
      <img src={`/${p.webp}`} alt={p.descrizione} width={96} height={96} loading="lazy" />
      <b>{nomeFigurina(p.id)}</b>
    </li>
  );
  /** Le figurine da prendere, raccolte per momento: "In arrivo con la pallavolo (6)" con le sagome piccole. */
  const inArrivo = (pose: Posa[], titolo: (p: Posa) => string) => {
    const gruppi = new Map<string, Posa[]>();
    for (const p of pose.filter((x) => !prese.has(x.id))) gruppi.set(titolo(p), [...(gruppi.get(titolo(p)) ?? []), p]);
    return [...gruppi].map(([nome, lista]) => (
      <div key={nome} className="in-arrivo">
        <p>
          {nome} <span>({lista.length})</span>
        </p>
        <div className="sagome" aria-hidden>
          {lista.map((p) => (
            <img key={p.id} src={`/${p.webp}`} alt="" width={44} height={44} loading="lazy" />
          ))}
        </div>
      </div>
    ));
  };

  return (
    <section className="schermo album-pagina">
      <Indietro chiudi={chiudi} />
      <h1>Album delle figurine</h1>
      <div className="album-conto">
        <div className="avanzamento" aria-hidden>
          <span style={{ width: `${(prese64 / POSE.length) * 100}%` }} />
        </div>
        <p>
          {prese64} di {POSE.length}
        </p>
      </div>
      <ul className="album">{normali.filter((p) => prese.has(p.id)).map(presa)}</ul>
      {inArrivo(normali, (p) => IN_ARRIVO[p.categoria] ?? 'Da scoprire')}
      <h2>Serie nera</h2>
      <p className="nota">Non danno passi: si sbloccano con il riscatto. L'album si completa anche senza.</p>
      {nere.some((p) => prese.has(p.id)) && <ul className="album">{nere.filter((p) => prese.has(p.id)).map(presa)}</ul>}
      {inArrivo(nere, () => RISCATTO)}
    </section>
  );
}
