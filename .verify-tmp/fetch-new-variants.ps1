$ErrorActionPreference = 'Stop'
$key = (Get-Content C:\Users\psp56\adamnoteve\.env | Where-Object { $_ -match '^PRINTFUL_API_KEY=' }) -replace '^PRINTFUL_API_KEY=',''
function Invoke-Pf($Uri) {
  for ($t = 0; $t -lt 6; $t++) {
    try { return Invoke-RestMethod -Uri $Uri -Headers @{ Authorization = "Bearer $key" } }
    catch { if ($_.ErrorDetails.Message -match '429') { Start-Sleep -Seconds 65 } else { throw } }
  }
  throw 'rate-limited'
}
$groups = [ordered]@{
  p2  = @(436912426, 436912432)
  p14 = @(436912433, 436912436)
  p9  = @(436912437, 436912446)
  p12 = @(436912448, 436912451)
  p3  = @(436912458, 436912462, 436912537, 436912540, 436912543)
  p13 = @(436912545, 436912554, 436912555, 436912566, 436912578)
  p5  = @(436912822)
  p6  = @(436912830)
  p8  = @(436912833, 436912838)
  p11 = @(436912840)
  p17 = @(436912842)
  p18 = @(436912844)
  p23 = @(436912851)
}
$out = [ordered]@{}
$total = 0
foreach ($prodKey in $groups.Keys) {
  $rows = @()
  foreach ($syncId in $groups[$prodKey]) {
    $r = Invoke-Pf "https://api.printful.com/store/products/$syncId"
    foreach ($v in $r.result.sync_variants) {
      $pf = $v.files | Where-Object { $_.type -eq 'preview' -and $_.preview_url } | Select-Object -First 1
      $rows += [ordered]@{ id = $v.id; size = $v.size; color = $v.color; synced = $v.synced; preview = $pf.preview_url }
      $total++
    }
    Start-Sleep -Seconds 3
  }
  $out[$prodKey] = $rows
  Write-Output "$prodKey -> $($rows.Count) variants ($((@($rows | Where-Object { -not $_.synced })).Count) unsynced)"
}
$out | ConvertTo-Json -Depth 4 | Set-Content C:\Users\psp56\adamnoteve\.verify-tmp\new-variants.json
Write-Output "TOTAL: $total variants"

