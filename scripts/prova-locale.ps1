# Avvia Supabase locale (Docker) e scrive .env.locale.local per `npm run dev:locale`.
# Le chiavi non vengono stampate.
npx supabase start
if ($LASTEXITCODE -ne 0) { exit 1 }
$env_ = @{}
npx supabase status -o env | ForEach-Object {
  if ($_ -match '^([A-Z_]+)="?(.*?)"?$') { $env_[$Matches[1]] = $Matches[2] }
}
$chiave = if ($env_['PUBLISHABLE_KEY']) { $env_['PUBLISHABLE_KEY'] } else { $env_['ANON_KEY'] }
@("VITE_SUPABASE_URL=$($env_['API_URL'])", "VITE_SUPABASE_PUBLISHABLE_KEY=$chiave") | Set-Content .env.locale.local
Write-Host "Scritto .env.locale.local. Ora: npm run dev:locale"
