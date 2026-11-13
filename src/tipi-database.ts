
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "compiti": {
                  Row: {
                    "assegnato_il": string | null,"corretto_da": string | null,"corretto_il": string | null,"creato_il": string,"fatto_il": string | null,"id": string,"materia_id": string | null,"nuvola_id": string | null,"pagine": string | null,"scadenza": string,"spiegazione": Json | null,"testo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assegnato_il"?: string | null,"corretto_da"?: string | null,"corretto_il"?: string | null,"creato_il"?: string,"fatto_il"?: string | null,"id"?: string,"materia_id"?: string | null,"nuvola_id"?: string | null,"pagine"?: string | null,"scadenza": string,"spiegazione"?: Json | null,"testo": string
                  }
                  Update: {
                    "assegnato_il"?: string | null,"corretto_da"?: string | null,"corretto_il"?: string | null,"creato_il"?: string,"fatto_il"?: string | null,"id"?: string,"materia_id"?: string | null,"nuvola_id"?: string | null,"pagine"?: string | null,"scadenza"?: string,"spiegazione"?: Json | null,"testo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "compiti_corretto_da_fkey"
      columns: ["corretto_da"]
isOneToOne: false
      referencedRelation: "profili"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "compiti_materia_id_fkey"
      columns: ["materia_id"]
isOneToOne: false
      referencedRelation: "materie"
      referencedColumns: ["id"]
    }
                  ]
                },"errori_client": {
                  Row: {
                    "creato_il": string,"dettagli": string | null,"dove": string | null,"id": number,"messaggio": string,"origine": string,"profilo_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "creato_il"?: string,"dettagli"?: string | null,"dove"?: string | null,"id"?: never,"messaggio": string,"origine"?: string,"profilo_id"?: string | null
                  }
                  Update: {
                    "creato_il"?: string,"dettagli"?: string | null,"dove"?: string | null,"id"?: never,"messaggio"?: string,"origine"?: string,"profilo_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "errori_client_profilo_id_fkey"
      columns: ["profilo_id"]
isOneToOne: false
      referencedRelation: "profili"
      referencedColumns: ["id"]
    }
                  ]
                },"figurine": {
                  Row: {
                    "in_attesa_di_riscatto_dal": string | null,"pagina": string,"posa": string,"sbloccata_il": string | null,"serie_nera": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "in_attesa_di_riscatto_dal"?: string | null,"pagina"?: string,"posa": string,"sbloccata_il"?: string | null,"serie_nera"?: boolean
                  }
                  Update: {
                    "in_attesa_di_riscatto_dal"?: string | null,"pagina"?: string,"posa"?: string,"sbloccata_il"?: string | null,"serie_nera"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"flashcard": {
                  Row: {
                    "argomento": string,"creato_il": string,"fonte": string | null,"fronte": string,"id": string,"intervallo_giorni": number,"materia_id": string | null,"prossima_revisione": string,"retro": string,"segnalata_sbagliata": boolean,"tipo": string,"verifica_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "argomento": string,"creato_il"?: string,"fonte"?: string | null,"fronte": string,"id"?: string,"intervallo_giorni"?: number,"materia_id"?: string | null,"prossima_revisione"?: string,"retro": string,"segnalata_sbagliata"?: boolean,"tipo"?: string,"verifica_id"?: string | null
                  }
                  Update: {
                    "argomento"?: string,"creato_il"?: string,"fonte"?: string | null,"fronte"?: string,"id"?: string,"intervallo_giorni"?: number,"materia_id"?: string | null,"prossima_revisione"?: string,"retro"?: string,"segnalata_sbagliata"?: boolean,"tipo"?: string,"verifica_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "flashcard_materia_id_fkey"
      columns: ["materia_id"]
isOneToOne: false
      referencedRelation: "materie"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "flashcard_verifica_id_fkey"
      columns: ["verifica_id"]
isOneToOne: false
      referencedRelation: "verifiche"
      referencedColumns: ["id"]
    }
                  ]
                },"flashcard_giri": {
                  Row: {
                    "carte": number,"fatto_il": string,"id": string,"iniziato_il": string,"materia_id": string | null,"non_sapevo": number,"quasi": number,"sapevo": number
                  }
                  ComputedFields: never
                  Insert: {
                    "carte": number,"fatto_il"?: string,"id"?: string,"iniziato_il": string,"materia_id"?: string | null,"non_sapevo": number,"quasi": number,"sapevo": number
                  }
                  Update: {
                    "carte"?: number,"fatto_il"?: string,"id"?: string,"iniziato_il"?: string,"materia_id"?: string | null,"non_sapevo"?: number,"quasi"?: number,"sapevo"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "flashcard_giri_materia_id_fkey"
      columns: ["materia_id"]
isOneToOne: false
      referencedRelation: "materie"
      referencedColumns: ["id"]
    }
                  ]
                },"fogli_firma": {
                  Row: {
                    "consegnato_il": string | null,"creato_il": string,"dato_il": string | null,"id": string,"scadenza": string | null,"titolo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consegnato_il"?: string | null,"creato_il"?: string,"dato_il"?: string | null,"id"?: string,"scadenza"?: string | null,"titolo": string
                  }
                  Update: {
                    "consegnato_il"?: string | null,"creato_il"?: string,"dato_il"?: string | null,"id"?: string,"scadenza"?: string | null,"titolo"?: string
                  }
                  Relationships: [
                    
                  ]
                },"forzieri": {
                  Row: {
                    "aiutino": string | null,"aperto_il": string | null,"consegnato_il": string | null,"enigma": string | null,"enigma_risolto_il": string | null,"immagine_per": string | null,"n": number,"parola": string | null,"premio": string | null,"soluzione": string | null,"stato": Database["public"]['Enums']["stato_forziere"],"tentativi_enigma": number
                  }
                  ComputedFields: never
                  Insert: {
                    "aiutino"?: string | null,"aperto_il"?: string | null,"consegnato_il"?: string | null,"enigma"?: string | null,"enigma_risolto_il"?: string | null,"immagine_per"?: string | null,"n": number,"parola"?: string | null,"premio"?: string | null,"soluzione"?: string | null,"stato"?: Database["public"]['Enums']["stato_forziere"],"tentativi_enigma"?: number
                  }
                  Update: {
                    "aiutino"?: string | null,"aperto_il"?: string | null,"consegnato_il"?: string | null,"enigma"?: string | null,"enigma_risolto_il"?: string | null,"immagine_per"?: string | null,"n"?: number,"parola"?: string | null,"premio"?: string | null,"soluzione"?: string | null,"stato"?: Database["public"]['Enums']["stato_forziere"],"tentativi_enigma"?: number
                  }
                  Relationships: [
                    
                  ]
                },"foto_pagine": {
                  Row: {
                    "caricata_da": string,"caricata_il": string,"id": string,"materia_id": string | null,"pagine": string | null,"percorso_storage": string,"richiesta_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "caricata_da"?: string,"caricata_il"?: string,"id"?: string,"materia_id"?: string | null,"pagine"?: string | null,"percorso_storage": string,"richiesta_id"?: string | null
                  }
                  Update: {
                    "caricata_da"?: string,"caricata_il"?: string,"id"?: string,"materia_id"?: string | null,"pagine"?: string | null,"percorso_storage"?: string,"richiesta_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "foto_pagine_caricata_da_fkey"
      columns: ["caricata_da"]
isOneToOne: false
      referencedRelation: "profili"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "foto_pagine_materia_id_fkey"
      columns: ["materia_id"]
isOneToOne: false
      referencedRelation: "materie"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "foto_pagine_richiesta_id_fkey"
      columns: ["richiesta_id"]
isOneToOne: false
      referencedRelation: "richieste_foto"
      referencedColumns: ["id"]
    }
                  ]
                },"frasi": {
                  Row: {
                    "autore": string | null,"di_famiglia": boolean,"fonte": string | null,"id": string,"momento": string | null,"testo": string,"ultima_volta": string | null,"ultimo_momento": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "autore"?: string | null,"di_famiglia"?: boolean,"fonte"?: string | null,"id"?: string,"momento"?: string | null,"testo": string,"ultima_volta"?: string | null,"ultimo_momento"?: string | null
                  }
                  Update: {
                    "autore"?: string | null,"di_famiglia"?: boolean,"fonte"?: string | null,"id"?: string,"momento"?: string | null,"testo"?: string,"ultima_volta"?: string | null,"ultimo_momento"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"gesti_casa": {
                  Row: {
                    "creato_il": string,"data": string,"dato_da": string,"id": string,"voce": string
                  }
                  ComputedFields: never
                  Insert: {
                    "creato_il"?: string,"data"?: string,"dato_da"?: string,"id"?: string,"voce": string
                  }
                  Update: {
                    "creato_il"?: string,"data"?: string,"dato_da"?: string,"id"?: string,"voce"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gesti_casa_dato_da_fkey"
      columns: ["dato_da"]
isOneToOne: false
      referencedRelation: "profili"
      referencedColumns: ["id"]
    }
                  ]
                },"impegni_famiglia": {
                  Row: {
                    "aggiornato_il": string,"chi": string | null,"fine": string | null,"id": string,"inizio": string,"titolo": string,"tutto_il_giorno": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "aggiornato_il"?: string,"chi"?: string | null,"fine"?: string | null,"id": string,"inizio": string,"titolo": string,"tutto_il_giorno"?: boolean
                  }
                  Update: {
                    "aggiornato_il"?: string,"chi"?: string | null,"fine"?: string | null,"id"?: string,"inizio"?: string,"titolo"?: string,"tutto_il_giorno"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"impostazioni": {
                  Row: {
                    "chiave": string,"valore": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "chiave": string,"valore": NonNullable<Json>
                  }
                  Update: {
                    "chiave"?: string,"valore"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"lezioni": {
                  Row: {
                    "argomento": string | null,"creato_il": string,"data": string,"id": string,"materia_id": string | null,"nuvola_id": string,"ora": number
                  }
                  ComputedFields: never
                  Insert: {
                    "argomento"?: string | null,"creato_il"?: string,"data": string,"id"?: string,"materia_id"?: string | null,"nuvola_id": string,"ora": number
                  }
                  Update: {
                    "argomento"?: string | null,"creato_il"?: string,"data"?: string,"id"?: string,"materia_id"?: string | null,"nuvola_id"?: string,"ora"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lezioni_materia_id_fkey"
      columns: ["materia_id"]
isOneToOne: false
      referencedRelation: "materie"
      referencedColumns: ["id"]
    }
                  ]
                },"materie": {
                  Row: {
                    "abbreviazione": string,"id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "abbreviazione": string,"id": string,"nome": string
                  }
                  Update: {
                    "abbreviazione"?: string,"id"?: string,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                },"movimenti_passi": {
                  Row: {
                    "creato_il": string,"dato_da": string | null,"giorno": string,"id": string,"moltiplicatore": number,"motivo": string,"passi": number,"riferimento": string
                  }
                  ComputedFields: never
                  Insert: {
                    "creato_il"?: string,"dato_da"?: string | null,"giorno"?: string,"id"?: string,"moltiplicatore"?: number,"motivo": string,"passi": number,"riferimento": string
                  }
                  Update: {
                    "creato_il"?: string,"dato_da"?: string | null,"giorno"?: string,"id"?: string,"moltiplicatore"?: number,"motivo"?: string,"passi"?: number,"riferimento"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "movimenti_passi_dato_da_fkey"
      columns: ["dato_da"]
isOneToOne: false
      referencedRelation: "profili"
      referencedColumns: ["id"]
    }
                  ]
                },"note": {
                  Row: {
                    "creato_il": string,"data": string,"id": string,"materia_id": string | null,"nuvola_id": string | null,"testo": string | null,"tipo": Database["public"]['Enums']["tipo_nota"]
                  }
                  ComputedFields: never
                  Insert: {
                    "creato_il"?: string,"data": string,"id"?: string,"materia_id"?: string | null,"nuvola_id"?: string | null,"testo"?: string | null,"tipo": Database["public"]['Enums']["tipo_nota"]
                  }
                  Update: {
                    "creato_il"?: string,"data"?: string,"id"?: string,"materia_id"?: string | null,"nuvola_id"?: string | null,"testo"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_nota"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "note_materia_id_fkey"
      columns: ["materia_id"]
isOneToOne: false
      referencedRelation: "materie"
      referencedColumns: ["id"]
    }
                  ]
                },"notifiche_inviate": {
                  Row: {
                    "giorno": string,"inviata_il": string,"testo": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "giorno": string,"inviata_il"?: string,"testo": string,"tipo": string
                  }
                  Update: {
                    "giorno"?: string,"inviata_il"?: string,"testo"?: string,"tipo"?: string
                  }
                  Relationships: [
                    
                  ]
                },"pin_genitori": {
                  Row: {
                    "bloccato_fino": string | null,"errori": number,"hash": string,"id": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "bloccato_fino"?: string | null,"errori"?: number,"hash": string,"id"?: boolean
                  }
                  Update: {
                    "bloccato_fino"?: string | null,"errori"?: number,"hash"?: string,"id"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"popup_coda": {
                  Row: {
                    "chiave": string | null,"creato_il": string,"figurina": string | null,"id": string,"mostrato_il": string | null,"posa": string,"priorita": number,"situazione": string,"testo": string,"titolo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chiave"?: string | null,"creato_il"?: string,"figurina"?: string | null,"id"?: string,"mostrato_il"?: string | null,"posa": string,"priorita": number,"situazione": string,"testo": string,"titolo": string
                  }
                  Update: {
                    "chiave"?: string | null,"creato_il"?: string,"figurina"?: string | null,"id"?: string,"mostrato_il"?: string | null,"posa"?: string,"priorita"?: number,"situazione"?: string,"testo"?: string,"titolo"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profili": {
                  Row: {
                    "avatar": string | null,"creato_il": string,"id": string,"nome": string,"ruolo": Database["public"]['Enums']["ruolo"]
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar"?: string | null,"creato_il"?: string,"id": string,"nome": string,"ruolo": Database["public"]['Enums']["ruolo"]
                  }
                  Update: {
                    "avatar"?: string | null,"creato_il"?: string,"id"?: string,"nome"?: string,"ruolo"?: Database["public"]['Enums']["ruolo"]
                  }
                  Relationships: [
                    
                  ]
                },"push_iscrizioni": {
                  Row: {
                    "chiavi": NonNullable<Json>,"creato_il": string,"endpoint": string,"id": string,"profilo_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chiavi": NonNullable<Json>,"creato_il"?: string,"endpoint": string,"id"?: string,"profilo_id"?: string
                  }
                  Update: {
                    "chiavi"?: NonNullable<Json>,"creato_il"?: string,"endpoint"?: string,"id"?: string,"profilo_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_iscrizioni_profilo_id_fkey"
      columns: ["profilo_id"]
isOneToOne: false
      referencedRelation: "profili"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz": {
                  Row: {
                    "argomento": string,"creato_il": string,"domande": NonNullable<Json>,"id": string,"materia_id": string | null,"verifica_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "argomento": string,"creato_il"?: string,"domande": NonNullable<Json>,"id"?: string,"materia_id"?: string | null,"verifica_id"?: string | null
                  }
                  Update: {
                    "argomento"?: string,"creato_il"?: string,"domande"?: NonNullable<Json>,"id"?: string,"materia_id"?: string | null,"verifica_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_materia_id_fkey"
      columns: ["materia_id"]
isOneToOne: false
      referencedRelation: "materie"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "quiz_verifica_id_fkey"
      columns: ["verifica_id"]
isOneToOne: false
      referencedRelation: "verifiche"
      referencedColumns: ["id"]
    }
                  ]
                },"quiz_tentativi": {
                  Row: {
                    "fatto_il": string,"giuste": number,"id": string,"numero": number,"quiz_id": string,"sbagliate": (number)[],"totale": number
                  }
                  ComputedFields: never
                  Insert: {
                    "fatto_il"?: string,"giuste": number,"id"?: string,"numero": number,"quiz_id": string,"sbagliate"?: (number)[],"totale": number
                  }
                  Update: {
                    "fatto_il"?: string,"giuste"?: number,"id"?: string,"numero"?: number,"quiz_id"?: string,"sbagliate"?: (number)[],"totale"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "quiz_tentativi_quiz_id_fkey"
      columns: ["quiz_id"]
isOneToOne: false
      referencedRelation: "quiz"
      referencedColumns: ["id"]
    }
                  ]
                },"richieste_foto": {
                  Row: {
                    "compito_id": string | null,"creato_il": string,"id": string,"materia_id": string | null,"motivo": string,"pagine": string,"stato": string,"verifica_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "compito_id"?: string | null,"creato_il"?: string,"id"?: string,"materia_id"?: string | null,"motivo": string,"pagine": string,"stato"?: string,"verifica_id"?: string | null
                  }
                  Update: {
                    "compito_id"?: string | null,"creato_il"?: string,"id"?: string,"materia_id"?: string | null,"motivo"?: string,"pagine"?: string,"stato"?: string,"verifica_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "richieste_foto_compito_id_fkey"
      columns: ["compito_id"]
isOneToOne: false
      referencedRelation: "compiti"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "richieste_foto_materia_id_fkey"
      columns: ["materia_id"]
isOneToOne: false
      referencedRelation: "materie"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "richieste_foto_verifica_id_fkey"
      columns: ["verifica_id"]
isOneToOne: false
      referencedRelation: "verifiche"
      referencedColumns: ["id"]
    }
                  ]
                },"saldo_visto": {
                  Row: {
                    "passi": number,"profilo_id": string,"visto_il": string
                  }
                  ComputedFields: never
                  Insert: {
                    "passi": number,"profilo_id": string,"visto_il"?: string
                  }
                  Update: {
                    "passi"?: number,"profilo_id"?: string,"visto_il"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saldo_visto_profilo_id_fkey"
      columns: ["profilo_id"]
isOneToOne: true
      referencedRelation: "profili"
      referencedColumns: ["id"]
    }
                  ]
                },"serate": {
                  Row: {
                    "borsa_il": string | null,"cartella_il": string | null,"chiusa_il": string | null,"data": string,"dieci_minuti_da": string | null,"dieci_minuti_esercizio": string | null,"dieci_minuti_il": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "borsa_il"?: string | null,"cartella_il"?: string | null,"chiusa_il"?: string | null,"data": string,"dieci_minuti_da"?: string | null,"dieci_minuti_esercizio"?: string | null,"dieci_minuti_il"?: string | null
                  }
                  Update: {
                    "borsa_il"?: string | null,"cartella_il"?: string | null,"chiusa_il"?: string | null,"data"?: string,"dieci_minuti_da"?: string | null,"dieci_minuti_esercizio"?: string | null,"dieci_minuti_il"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"sessioni_ripasso": {
                  Row: {
                    "data_prevista": string,"fatta_il": string | null,"id": string,"numero": number,"tipo": string,"verifica_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "data_prevista": string,"fatta_il"?: string | null,"id"?: string,"numero": number,"tipo": string,"verifica_id": string
                  }
                  Update: {
                    "data_prevista"?: string,"fatta_il"?: string | null,"id"?: string,"numero"?: number,"tipo"?: string,"verifica_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessioni_ripasso_verifica_id_fkey"
      columns: ["verifica_id"]
isOneToOne: false
      referencedRelation: "verifiche"
      referencedColumns: ["id"]
    }
                  ]
                },"settimane": {
                  Row: {
                    "chiavi": number | null,"cose_fatte": number,"cose_possibili": number,"inizio": string,"note": number,"passi_obbligatori_fatti": number,"passi_obbligatori_possibili": number,"rimonta": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "chiavi"?: number | null,"cose_fatte"?: number,"cose_possibili"?: number,"inizio": string,"note"?: number,"passi_obbligatori_fatti"?: number,"passi_obbligatori_possibili"?: number,"rimonta"?: boolean
                  }
                  Update: {
                    "chiavi"?: number | null,"cose_fatte"?: number,"cose_possibili"?: number,"inizio"?: string,"note"?: number,"passi_obbligatori_fatti"?: number,"passi_obbligatori_possibili"?: number,"rimonta"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"sgridate": {
                  Row: {
                    "creato_il": string,"data": string,"dato_da": string,"id": string,"nota": string | null,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "creato_il"?: string,"data"?: string,"dato_da"?: string,"id"?: string,"nota"?: string | null,"tipo": string
                  }
                  Update: {
                    "creato_il"?: string,"data"?: string,"dato_da"?: string,"id"?: string,"nota"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sgridate_dato_da_fkey"
      columns: ["dato_da"]
isOneToOne: false
      referencedRelation: "profili"
      referencedColumns: ["id"]
    }
                  ]
                },"sync_log": {
                  Row: {
                    "dettagli": Json | null,"esito": string | null,"finito_il": string | null,"fonte": string,"id": string,"iniziato_il": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dettagli"?: Json | null,"esito"?: string | null,"finito_il"?: string | null,"fonte": string,"id"?: string,"iniziato_il"?: string
                  }
                  Update: {
                    "dettagli"?: Json | null,"esito"?: string | null,"finito_il"?: string | null,"fonte"?: string,"id"?: string,"iniziato_il"?: string
                  }
                  Relationships: [
                    
                  ]
                },"umore": {
                  Row: {
                    "data": string,"faccia": string
                  }
                  ComputedFields: never
                  Insert: {
                    "data"?: string,"faccia": string
                  }
                  Update: {
                    "data"?: string,"faccia"?: string
                  }
                  Relationships: [
                    
                  ]
                },"verifiche": {
                  Row: {
                    "argomento": string | null,"creato_il": string,"data": string,"id": string,"materia_id": string | null,"nuvola_id": string | null,"pagine_probabili": string | null,"tipo": Database["public"]['Enums']["tipo_verifica"]
                  }
                  ComputedFields: never
                  Insert: {
                    "argomento"?: string | null,"creato_il"?: string,"data": string,"id"?: string,"materia_id"?: string | null,"nuvola_id"?: string | null,"pagine_probabili"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_verifica"]
                  }
                  Update: {
                    "argomento"?: string | null,"creato_il"?: string,"data"?: string,"id"?: string,"materia_id"?: string | null,"nuvola_id"?: string | null,"pagine_probabili"?: string | null,"tipo"?: Database["public"]['Enums']["tipo_verifica"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "verifiche_materia_id_fkey"
      columns: ["materia_id"]
isOneToOne: false
      referencedRelation: "materie"
      referencedColumns: ["id"]
    }
                  ]
                },"video": {
                  Row: {
                    "argomento": string,"creato_il": string,"durata_secondi": number | null,"id": string,"materia_id": string | null,"scelto_da": string | null,"youtube_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "argomento": string,"creato_il"?: string,"durata_secondi"?: number | null,"id"?: string,"materia_id"?: string | null,"scelto_da"?: string | null,"youtube_id": string
                  }
                  Update: {
                    "argomento"?: string,"creato_il"?: string,"durata_secondi"?: number | null,"id"?: string,"materia_id"?: string | null,"scelto_da"?: string | null,"youtube_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "video_materia_id_fkey"
      columns: ["materia_id"]
isOneToOne: false
      referencedRelation: "materie"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "video_scelto_da_fkey"
      columns: ["scelto_da"]
isOneToOne: false
      referencedRelation: "profili"
      referencedColumns: ["id"]
    }
                  ]
                },"video_visti": {
                  Row: {
                    "completo": boolean,"id": string,"secondi_visti": number | null,"video_id": string,"visto_il": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completo": boolean,"id"?: string,"secondi_visti"?: number | null,"video_id": string,"visto_il"?: string
                  }
                  Update: {
                    "completo"?: boolean,"id"?: string,"secondi_visti"?: number | null,"video_id"?: string,"visto_il"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "video_visti_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "video"
      referencedColumns: ["id"]
    }
                  ]
                },"voti": {
                  Row: {
                    "creato_il": string,"data": string,"id": string,"materia_id": string | null,"nuvola_id": string | null,"tipo": string | null,"voto": number
                  }
                  ComputedFields: never
                  Insert: {
                    "creato_il"?: string,"data": string,"id"?: string,"materia_id"?: string | null,"nuvola_id"?: string | null,"tipo"?: string | null,"voto": number
                  }
                  Update: {
                    "creato_il"?: string,"data"?: string,"id"?: string,"materia_id"?: string | null,"nuvola_id"?: string | null,"tipo"?: string | null,"voto"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "voti_materia_id_fkey"
      columns: ["materia_id"]
isOneToOne: false
      referencedRelation: "materie"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "chiavi_totali": {
                  Row: {
                    "chiavi": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"forzieri_lani": {
                  Row: {
                    "aiutino": string | null,"aperto_il": string | null,"consegnato_il": string | null,"enigma": string | null,"enigma_risolto_il": string | null,"n": number,"premio": string | null,"stato": Database["public"]['Enums']["stato_forziere"],"tentativi_enigma": number
                  }
                  ComputedFields: never
                  Insert: {
                           "aiutino"?: never,"aperto_il"?: string | null,"consegnato_il"?: string | null,"enigma"?: never,"enigma_risolto_il"?: string | null,"n"?: number | null,"premio"?: never,"stato"?: Database["public"]['Enums']["stato_forziere"] | null,"tentativi_enigma"?: number | null
                         }
                        Update: {
                           "aiutino"?: never,"aperto_il"?: string | null,"consegnato_il"?: string | null,"enigma"?: never,"enigma_risolto_il"?: string | null,"n"?: number | null,"premio"?: never,"stato"?: Database["public"]['Enums']["stato_forziere"] | null,"tentativi_enigma"?: number | null
                         }
                        Relationships: [
                    
                  ]
                },"saldo_passi": {
                  Row: {
                    "passi": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "controlla_pin":
{ Args: { "p_pin": string }; Returns: string
                           },
"e_famiglia":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"e_genitore":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"frase_del_giorno":
{ Args: { "p_momento": string }; Returns: {
              "autore": string,"testo": string
            }[]
                           },
"imposta_pin":
{ Args: { "p_pin": string }; Returns: undefined
                           },
"lancia_chiavi":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"lancia_notifiche":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"lancia_sync_calendario":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"lancia_sync_nuvola":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"oggi":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"registra_passi":
{ Args: { "p_dato_da"?: string,"p_giorno"?: string,"p_moltiplicatore"?: number,"p_motivo": string,"p_passi": number,"p_riferimento": string }; Returns: string
                           },
"storna_spunta":
{ Args: { "p_motivo": string,"p_riferimento": string }; Returns: boolean
                           },
"tenta_enigma":
{ Args: { "p_massimo": number,"p_n": number }; Returns: number
                           },
"vedi_saldo":
{ Args: Record<PropertyKey, never>; Returns: {
              "adesso": number,"prima": number
            }[]
                           },
"verifica_pin":
{ Args: { "p_pin": string }; Returns: boolean
                           }
          }
          Enums: {
            "ruolo": "lani"|"genitore","stato_forziere": "chiuso"|"enigma"|"aperto"|"consegnato","tipo_nota": "disciplinare"|"didattica"|"merito"|"altro","tipo_verifica": "verifica"|"interrogazione"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "ruolo": ["lani", "genitore"],"stato_forziere": ["chiuso", "enigma", "aperto", "consegnato"],"tipo_nota": ["disciplinare", "didattica", "merito", "altro"],"tipo_verifica": ["verifica", "interrogazione"]
          }
        }
} as const
