import { describe, expect, it } from 'vitest';
import { leggiClassifica, stessaSquadra } from './index';

// pezzo della pagina vera (classifica.aspx?CId=93399, 13/11/2026), con la tendina e due righe
const riga = (pos: number, squadra: string, numeri: (number | string)[]) =>
  `<tr>\n<td style="text-align:center">${pos}</td>\n<td style="padding: 2px 4px;"><img src="/logo.jpg" alt="">${squadra}</td>\n` +
  numeri.map((x) => `<td style="text-align:center;font-weight: bold;">${x}</td>\n`).join('') +
  `<td style="text-align:center">0</td>\n</tr>`;
const PAGINA = `<html><body><table class="tbl tbl-classifica">
  <caption><select><option value="1">Classifica alla giornata n&deg; 1</option></select></caption>
  <thead><tr><th>Pos.</th><th>Squadra</th><th>Punti</th><th>PG</th><th title="Penalit&agrave;">Penal.</th></tr></thead>
  ${riga(1, 'U14R-EVOLUTION', [6, 2, 2, 0, 6, 1, '6,00', 174, 137, '1,27'])}
  ${riga(2, 'POL. L&rsquo;ARENA &amp; CO ', [2, 1, 1, 0, 3, 2, '1,50', 100, 98, '1,02'])}
</table></body></html>`;

describe('classifiche dal portale FIPAV', () => {
  it('legge posizione, squadra, punti, partite e set', () => {
    expect(leggiClassifica(PAGINA)).toEqual([
      { pos: 1, squadra: 'U14R-EVOLUTION', punti: 6, giocate: 2, vinte: 2, perse: 0, set_fatti: 6, set_subiti: 1 },
      { pos: 2, squadra: 'POL. L’ARENA & CO', punti: 2, giocate: 1, vinte: 1, perse: 0, set_fatti: 3, set_subiti: 2 },
    ]);
  });
  it('pagina senza classifica: nessuna riga', () => {
    expect(leggiClassifica('<html><table class="altro"><tr><td>1</td></tr></table></html>')).toEqual([]);
  });
  it('riconosce la squadra anche con spazi e maiuscole diversi', () => {
    expect(stessaSquadra('VOLLEY SCANDIANO  ROSSA', 'Volley Scandiano Rossa ')).toBe(true);
    expect(stessaSquadra('U14R-EVOLUTION', '13R-EVOLUT. POLO DIGITALE')).toBe(false);
  });
});
