-- Da fotografare (debito prima dell'avvio): la sincronizzazione di Nuvola crea una richiesta per ogni
-- compito o verifica con pagine mai fotografate. Una sola richiesta per compito e per verifica, così
-- ogni giro di sincronizzazione può riprovare senza doppioni.
create unique index richieste_foto_compito on richieste_foto (compito_id) where compito_id is not null;
create unique index richieste_foto_verifica on richieste_foto (verifica_id) where verifica_id is not null;
create index foto_pagine_richiesta on foto_pagine (richiesta_id);
