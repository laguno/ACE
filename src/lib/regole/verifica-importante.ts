import { mediaPesata, type VotoPesato } from '../media';
import { CONFIG, iso } from './index';

/**
 * Verifica importante (regola del 23/11, approvata dal signore): ACE decide da sola quale
 * verifica merita il riquadro in Oggi. Solo una, la più vicina tra quelle importanti, entro
 * `giorni_prima` giorni. Mai le materie pratiche. Importante se la materia è sotto la sufficienza
 * (media pesata o ultimo voto sotto `soglia_voto`) o se è una prova comune. Il recupero da solo non
 * basta (Nuvola lo assegna a tutti): conta solo se la materia è sotto la sufficienza.
 */

export type VerificaCandidata = {
  id: string;
  data: string;
  tipo: string;
  argomento: string | null;
  materia_id: string | null;
  materia: string | null;
};
export type VotoDellaMateria = VotoPesato & { materia_id: string; data: string };

const norma = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
// "Scienze motorie e sportive" è la stessa materia di "Educazione fisica"
const ALIAS_PRATICHE = ['scienze motorie'];

/** Musica, Arte e immagine, Educazione fisica: mai importanti. */
export function materiaEsclusa(nome: string | null | undefined): boolean {
  if (!nome) return false;
  const n = norma(nome);
  const escluse = [...CONFIG.verifica_importante.materie_escluse.map(norma), ...ALIAS_PRATICHE];
  return escluse.some((e) => n === e || n.startsWith(`${e} `) || n.startsWith(e));
}

const èProvaComune = (argomento: string | null) => /prov[ae]\s+comun[ei]/i.test(argomento ?? '');

/** Sotto la sufficienza: media pesata < soglia oppure ultimo voto < soglia. Senza voti non si sa. */
function sottoLaSufficienza(voti: VotoDellaMateria[]): boolean {
  if (voti.length === 0) return false;
  const soglia = CONFIG.verifica_importante.soglia_voto;
  const media = mediaPesata(voti);
  const ultimo = [...voti].sort((a, b) => a.data.localeCompare(b.data)).at(-1);
  return (media !== null && media < soglia) || (!!ultimo && Number(ultimo.voto) < soglia);
}

export function verificaImportante(verifiche: VerificaCandidata[], voti: VotoDellaMateria[], oggi: Date): VerificaCandidata | null {
  const da = iso(oggi);
  const a = iso(new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate() + CONFIG.verifica_importante.giorni_prima));
  const candidate = verifiche
    .filter((v) => v.data >= da && v.data <= a && !materiaEsclusa(v.materia))
    .filter((v) => {
      const sotto = v.materia_id ? sottoLaSufficienza(voti.filter((x) => x.materia_id === v.materia_id)) : false;
      if (èProvaComune(v.argomento)) return true;
      // il recupero da solo non basta: come ogni altra verifica, conta solo con la materia sotto la sufficienza
      return sotto;
    })
    .sort((x, y) => x.data.localeCompare(y.data));
  return candidate[0] ?? null;
}
