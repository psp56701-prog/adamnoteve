# Resume: p3 chunks 3-5 and all of p13 (rate-limit killed the first run).
$ErrorActionPreference = 'Stop'
$key = (Get-Content C:\Users\psp56\adamnoteve\.env | Where-Object { $_ -match '^PRINTFUL_API_KEY=' }) -replace '^PRINTFUL_API_KEY=',''
$base = 'https://6a24d567ef97b40291304f2e--adamnoteve-pa218c.netlify.app'
$sizes = @('S','M','L','XL','2XL')

function Invoke-PrintfulWithRetry {
  param($Uri, $Method = 'Get', $Body = $null)
  for ($try = 0; $try -lt 5; $try++) {
    try {
      if ($Body) { return Invoke-RestMethod -Uri $Uri -Method $Method -Headers @{ Authorization = "Bearer $key" } -ContentType 'application/json' -Body $Body }
      return Invoke-RestMethod -Uri $Uri -Method $Method -Headers @{ Authorization = "Bearer $key" }
    } catch {
      if ($_.ErrorDetails.Message -match '"code":\s*429') { Write-Output '  (429 - waiting 65s)'; Start-Sleep -Seconds 65 }
      else { throw }
    }
  }
  throw 'still rate-limited after 5 tries'
}

$bc3001Light = @('White','Aqua','Ash','Athletic Heather','Baby Blue','Charity Pink','Gold','Heather Aqua','Heather Carolina Blue','Heather Columbia Blue','Heather Dust','Heather Ice Blue','Heather Mauve','Heather Mint','Heather Natural','Heather Orange','Heather Orchid','Heather Prism Dusty Blue','Heather Prism Ice Blue','Heather Prism Lilac','Heather Prism Mint','Heather Yellow Gold','Light Blue','Lilac','Mauve','Mint','Mustard','Natural','Orange','Pebble','Pink','Sage','Silver','Soft Cream','Soft Pink','Solid White Blend','Tan','Turquoise','Vintage White','Yellow')
$bc3001Dark = @('Army','Asphalt','Autumn','Berry','Black','Black Heather','Brown','Burnt Orange','Cardinal','Dark Grey','Dark Grey Heather','Forest','Heather Autumn','Heather Brown','Heather Clay','Heather Deep Teal','Heather Emerald','Heather Forest','Heather Grass Green','Heather Kelly','Heather Midnight Navy','Heather Navy','Heather Olive','Heather Raspberry','Heather Red','Heather Slate','Heather Team Purple','Heather True Royal','Kelly','Leaf','Maroon','Military Green','Navy','Ocean Blue','Olive','Oxblood Black','Red','Steel Blue','Teal','Team Purple','Toast','True Royal','Vintage Black')

$cat = Invoke-PrintfulWithRetry -Uri 'https://api.printful.com/products/71'
$byColor = @{}
foreach ($v in ($cat.result.variants | Where-Object { $_.in_stock -and $_.size -in $sizes })) {
  if (-not $byColor[$v.color]) { $byColor[$v.color] = @{} }
  $byColor[$v.color][$v.size] = $v.id
}
$colors = @($bc3001Light + $bc3001Dark | Where-Object { $byColor[$_] -and $byColor[$_].Keys.Count -eq 5 })
$chunks = @(); for ($i = 0; $i -lt $colors.Count; $i += 20) { $chunks += ,@($colors[$i..([Math]::Min($i+19, $colors.Count-1))]) }
"colors: $($colors.Count), chunks: $($chunks.Count)"

$jobs = @(
  @{ pid='p3';  name='Emotionally Unavailable Club Tee'; stem='p3-club';  retail='28.00'; startChunk=2 },  # chunks 3..5 (0-indexed 2..4)
  @{ pid='p13'; name='Self-Care Era Tee';                stem='p13-era';  retail='26.00'; startChunk=0 }
)
foreach ($j in $jobs) {
  for ($ci = $j.startChunk; $ci -lt $chunks.Count; $ci++) {
    $chunk = $chunks[$ci]
    $variants = @()
    foreach ($c in $chunk) {
      $file = ($c -in $bc3001Light) ? "$base/$($j.stem)-light.png" : "$base/$($j.stem)-dark.png"
      foreach ($s in $sizes) { $variants += @{ variant_id = $byColor[$c][$s]; retail_price = $j.retail; files = @(@{ url = $file }) } }
    }
    $body = @{ sync_product = @{ name = "$($j.name) ($($ci+1)/$($chunks.Count))"; thumbnail = "$base/$($j.stem)-light.png" }; sync_variants = $variants } | ConvertTo-Json -Depth 6
    $r = Invoke-PrintfulWithRetry -Uri 'https://api.printful.com/store/products' -Method Post -Body $body
    Write-Output "[$($j.pid)] chunk $($ci+1)/$($chunks.Count) -> $($r.result.id) ($($variants.Count) variants)"
    Start-Sleep -Seconds 8
  }
}
Write-Output 'RESUME COMPLETE'
