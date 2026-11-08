-- Obiettivo del liceo sulla figurina di Lani: media sopra il taglio recente del Bertolucci
-- (esclusi a 7,33 nel 2025, ultimo dentro a 7,23 nel 2026: docs/01). Lo cambiano i genitori.
insert into impostazioni (chiave, valore) values ('obiettivo_media', '7.35') on conflict (chiave) do nothing;
