# Creates all 6 apparel products in Printful with full color ranges.
# Each color gets the design variant that reads on it (light/dark/pink-shirt).
$ErrorActionPreference = 'Stop'
$key = (Get-Content C:\Users\psp56\adamnoteve\.env | Where-Object { $_ -match '^PRINTFUL_API_KEY=' }) -replace '^PRINTFUL_API_KEY=',''
$base = 'https://6a24d567ef97b40291304f2e--adamnoteve-pa218c.netlify.app'
$sizes = @('S','M','L','XL','2XL')

# Color classification per blank
$bc3001Light = @('White','Aqua','Ash','Athletic Heather','Baby Blue','Charity Pink','Gold','Heather Aqua','Heather Carolina Blue','Heather Columbia Blue','Heather Dust','Heather Ice Blue','Heather Mauve','Heather Mint','Heather Natural','Heather Orange','Heather Orchid','Heather Prism Dusty Blue','Heather Prism Ice Blue','Heather Prism Lilac','Heather Prism Mint','Heather Yellow Gold','Light Blue','Lilac','Mauve','Mint','Mustard','Natural','Orange','Pebble','Pink','Sage','Silver','Soft Cream','Soft Pink','Solid White Blend','Tan','Turquoise','Vintage White','Yellow')
$bc3001Dark = @('Army','Asphalt','Autumn','Berry','Black','Black Heather','Brown','Burnt Orange','Cardinal','Dark Grey','Dark Grey Heather','Forest','Heather Autumn','Heather Brown','Heather Clay','Heather Deep Teal','Heather Emerald','Heather Forest','Heather Grass Green','Heather Kelly','Heather Midnight Navy','Heather Navy','Heather Olive','Heather Raspberry','Heather Red','Heather Slate','Heather Team Purple','Heather True Royal','Kelly','Leaf','Maroon','Military Green','Navy','Ocean Blue','Olive','Oxblood Black','Red','Steel Blue','Teal','Team Purple','Toast','True Royal','Vintage Black')
$gildanLight = @('Ash','Carolina Blue','Gold','Light Blue','Light Pink','Orange','Sand','Sport Grey','White')
$g18500Dark = @('Black','Charcoal','Dark Chocolate','Dark Heather','Forest Green','Graphite Heather','Heather Sport Dark Navy','Indigo Blue','Irish Green','Maroon','Military Green','Navy','Purple','Red','Royal')
$g18000Dark = @('Black','Charcoal','Dark Chocolate','Dark Heather','Forest Green','Graphite Heather','Heather Deep Royal','Indigo Blue','Irish Green','Maroon','Military Green','Navy','Purple','Red','Royal')

$products = @(
  @{ pid='p2';  name='Thanks for the Trauma Hoodie';     blank=146; retail='55.00'; stem='p2-trauma';    light=$gildanLight; dark=$g18500Dark; pink=@('Azalea','Heliconia') },
  @{ pid='p14'; name='Allergic to Mixed Signals Hoodie'; blank=146; retail='54.00'; stem='p14-allergic'; light=$gildanLight; dark=$g18500Dark; pink=@('Azalea','Heliconia') },
  @{ pid='p9';  name='Petty in Pink Crewneck';           blank=145; retail='58.00'; stem='p9-petty';     light=$gildanLight; dark=$g18000Dark; pink=@('Heliconia') },
  @{ pid='p12'; name='Cried in the Uber Crewneck';       blank=145; retail='48.00'; stem='p12-uber';     light=$gildanLight; dark=$g18000Dark; pink=@('Heliconia') },
  @{ pid='p3';  name='Emotionally Unavailable Club Tee'; blank=71;  retail='28.00'; stem='p3-club';      light=$bc3001Light; dark=$bc3001Dark; pink=@() },
  @{ pid='p13'; name='Self-Care Era Tee';                blank=71;  retail='26.00'; stem='p13-era';      light=$bc3001Light; dark=$bc3001Dark; pink=@() }
)

$result = [ordered]@{}
foreach ($p in $products) {
  $cat = Invoke-RestMethod -Uri "https://api.printful.com/products/$($p.blank)" -Headers @{ Authorization = "Bearer $key" }
  $byColor = @{}
  foreach ($v in ($cat.result.variants | Where-Object { $_.in_stock -and $_.size -in $sizes })) {
    if (-not $byColor[$v.color]) { $byColor[$v.color] = @{} }
    $byColor[$v.color][$v.size] = $v.id
  }
  # color -> design file
  $fileFor = @{}
  foreach ($c in $p.light) { $fileFor[$c] = "$base/$($p.stem)-light.png" }
  foreach ($c in $p.dark)  { $fileFor[$c] = "$base/$($p.stem)-dark.png" }
  foreach ($c in $p.pink)  { $fileFor[$c] = "$base/$($p.stem)-pink.png" }
  $colors = @($p.light + $p.pink + $p.dark | Where-Object { $byColor[$_] -and $byColor[$_].Keys.Count -eq 5 })
  $skipped = @($p.light + $p.pink + $p.dark | Where-Object { $_ -notin $colors })
  if ($skipped) { Write-Output "  [$($p.pid)] skipped (not full stock): $($skipped -join ', ')" }

  # chunk into <=20 colors per sync product
  $chunks = @(); for ($i = 0; $i -lt $colors.Count; $i += 20) { $chunks += ,@($colors[$i..([Math]::Min($i+19, $colors.Count-1))]) }
  $syncIds = @()
  $n = 1
  foreach ($chunk in $chunks) {
    $variants = @()
    foreach ($c in $chunk) { foreach ($s in $sizes) {
      $variants += @{ variant_id = $byColor[$c][$s]; retail_price = $p.retail; files = @(@{ url = $fileFor[$c] }) }
    } }
    $suffix = $chunks.Count -gt 1 ? " ($n/$($chunks.Count))" : ''
    $body = @{ sync_product = @{ name = "$($p.name)$suffix"; thumbnail = $fileFor[$colors[0]] }; sync_variants = $variants } | ConvertTo-Json -Depth 6
    $r = Invoke-RestMethod -Uri 'https://api.printful.com/store/products' -Method Post -Headers @{ Authorization = "Bearer $key" } -ContentType 'application/json' -Body $body
    $syncIds += $r.result.id
    Write-Output "[$($p.pid)] $($p.name)$suffix -> $($r.result.id) ($($variants.Count) variants)"
    $n++; Start-Sleep -Seconds 2
  }
  $result[$p.pid] = @{ syncProducts = $syncIds; colors = $colors }
}
$result | ConvertTo-Json -Depth 4 | Set-Content C:\Users\psp56\adamnoteve\.verify-tmp\apparel-created.json
Write-Output 'APPAREL CREATION COMPLETE'
