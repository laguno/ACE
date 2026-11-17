# Avvia Supabase locale (Docker) e scrive .env.locale.local per `npm run dev:locale`.
# Le chiavi non vengono stampate.
npx supabase start
if ($LASTEXITCODE -ne 0) { exit 1 }
$env_ = @{}
npx supabase status -o env | ForEach-Object {
  if ($_ -match '^([A-Z_]+)="?(.*?)"?$') { $env_[$Matches[1]] = $Matches[2] }
}
$chiave = if ($env_['PUBLISHABLE_KEY']) { $env_['PUBLISHABLE_KEY'] } else { $env_['ANON_KEY'] }
# Con Tailscale acceso Supabase passa dall'indirizzo https del PC (proxy di vite.config.ts): così
# funziona anche da ACE Prova sul telefono. Senza Tailscale, l'indirizzo locale come prima.
$nome = try { ((tailscale status --json | ConvertFrom-Json).Self.DNSName).TrimEnd('.') } catch { '' }
$url = if ($nome) { "https://$nome" } else { $env_['API_URL'] }
@("VITE_SUPABASE_URL=$url","VITE_SUPABASE_PUBLISHABLE_KEY=$chiave") | Set-Content .env.locale.local
Write-Host "Scritto .env.locale.local. Ora: npm run dev:locale"
