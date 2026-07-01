# Creates accessory/home sync products in Printful.
$ErrorActionPreference = 'Stop'
$key = (Get-Content C:\Users\psp56\adamnoteve\.env | Where-Object { $_ -match '^PRINTFUL_API_KEY=' }) -replace '^PRINTFUL_API_KEY=',''
$base = 'https://6a24d8a70950aa09b0f1f0f7--adamnoteve-pa218c.netlify.app'

function Invoke-Pf($Uri, $Method = 'Get', $Body = $null) {
  for ($t = 0; $t -lt 5; $t++) {
    try {
      if ($Body) { return Invoke-RestMethod -Uri $Uri -Method $Method -Headers @{ Authorization = "Bearer $key" } -ContentType 'application/json' -Body $Body }
      return Invoke-RestMethod -Uri $Uri -Method $Method -Headers @{ Authorization = "Bearer $key" }
    } catch { if ($_.ErrorDetails.Message -match '429') { Write-Output '  (429 - waiting 65s)'; Start-Sleep -Seconds 65 } else { throw } }
  }
  throw 'rate-limited after 5 tries'
}

# Pull matte case variant ids keyed by model
$matte = @{}
foreach ($catId in @(601, 686)) {
  $r = Invoke-Pf "https://api.printful.com/products/$catId"
  foreach ($v in $r.result.variants) { if ($v.color -eq 'Matte' -and $v.in_stock) { $matte[$v.size] = $v.id } }
  Start-Sleep -Seconds 2
}
$iphoneModels = @('iPhone 14','iPhone 14 Plus','iPhone 14 Pro','iPhone 14 Pro Max','iPhone 15','iPhone 15 Plus','iPhone 15 Pro','iPhone 15 Pro Max','iPhone 16','iPhone 16 Plus','iPhone 16 Pro','iPhone 16 Pro Max')
$samsungModels = @('Samsung Galaxy S23','Samsung Galaxy S23 Plus','Samsung Galaxy S23 Ultra','Samsung Galaxy S24','Samsung Galaxy S24 Plus','Samsung Galaxy S24 Ultra')

$jobs = @(
  @{ name = 'Red Flags Were My Aesthetic Tote'; variants = @(
      @{ variant_id=49316; retail_price='22.00'; files=@(@{url="$base/p5-redflags.png"}) },      # Classic Pink
      @{ variant_id=49318; retail_price='22.00'; files=@(@{url="$base/p5-redflags.png"}) },      # Coral
      @{ variant_id=49320; retail_price='22.00'; files=@(@{url="$base/p5-redflags.png"}) },      # Light Grey
      @{ variant_id=49321; retail_price='22.00'; files=@(@{url="$base/p5-redflags.png"}) },      # Mint
      @{ variant_id=49322; retail_price='22.00'; files=@(@{url="$base/p5-redflags.png"}) },      # Mustard
      @{ variant_id=49323; retail_price='22.00'; files=@(@{url="$base/p5-redflags.png"}) },      # Natural
      @{ variant_id=49324; retail_price='22.00'; files=@(@{url="$base/p5-redflags.png"}) },      # Orange
      @{ variant_id=49313; retail_price='22.00'; files=@(@{url="$base/p5-redflags-dark.png"}) }, # Black
      @{ variant_id=49314; retail_price='22.00'; files=@(@{url="$base/p5-redflags-dark.png"}) }, # Bottle Green
      @{ variant_id=49315; retail_price='22.00'; files=@(@{url="$base/p5-redflags-dark.png"}) }, # Burgundy
      @{ variant_id=49317; retail_price='22.00'; files=@(@{url="$base/p5-redflags-dark.png"}) }, # Classic Red
      @{ variant_id=49319; retail_price='22.00'; files=@(@{url="$base/p5-redflags-dark.png"}) }  # French Navy
    ); thumb = "$base/p5-redflags.png" },
  @{ name = 'Closure is a Myth Sticker'; variants = @(
      @{ variant_id=10163; retail_price='8.00';  files=@(@{url="$base/p6-closure.png"}) },
      @{ variant_id=10164; retail_price='10.00'; files=@(@{url="$base/p6-closure.png"}) },
      @{ variant_id=10165; retail_price='12.00'; files=@(@{url="$base/p6-closure.png"}) }
    ); thumb = "$base/p6-closure.png" },
  @{ name = 'Ghosted Phone Case - iPhone'; variants = @($iphoneModels | ForEach-Object {
      @{ variant_id = $matte[$_]; retail_price='20.00'; files=@(@{url="$base/p8-ghosted.png"}) } }); thumb = "$base/p8-ghosted.png" },
  @{ name = 'Ghosted Phone Case - Samsung'; variants = @($samsungModels | ForEach-Object {
      @{ variant_id = $matte[$_]; retail_price='20.00'; files=@(@{url="$base/p8-ghosted.png"}) } }); thumb = "$base/p8-ghosted.png" },
  @{ name = 'Single & Salty Water Bottle'; variants = @(
      @{ variant_id=10798; retail_price='34.00'; files=@(@{url="$base/p11-salty.png"}) },        # White
      @{ variant_id=16030; retail_price='34.00'; files=@(@{url="$base/p11-salty-dark.png"}) }    # Black
    ); thumb = "$base/p11-salty.png" },
  @{ name = 'Salty Single Tumbler'; variants = @(
      @{ variant_id=19111; retail_price='32.00'; files=@(@{url="$base/p17-tumbler.png"}) },      # White
      @{ variant_id=19108; retail_price='32.00'; files=@(@{url="$base/p17-tumbler.png"}) },      # Mint
      @{ variant_id=19110; retail_price='32.00'; files=@(@{url="$base/p17-tumbler.png"}) },      # Pink
      @{ variant_id=19107; retail_price='32.00'; files=@(@{url="$base/p17-tumbler-dark.png"}) }, # Black
      @{ variant_id=19109; retail_price='32.00'; files=@(@{url="$base/p17-tumbler-dark.png"}) }  # Navy
    ); thumb = "$base/p17-tumbler.png" },
  @{ name = "Manifest, Don't Text Journal"; variants = @(
      @{ variant_id=12141; retail_price='22.00'; files=@(@{url="$base/p18-manifest.png"}) }
    ); thumb = "$base/p18-manifest.png" },
  @{ name = 'Healing Era Desk Mat'; variants = @(
      @{ variant_id=22325; retail_price='28.00'; files=@(@{url="$base/p23-deskmat.png"}) },
      @{ variant_id=22326; retail_price='32.00'; files=@(@{url="$base/p23-deskmat.png"}) },
      @{ variant_id=22327; retail_price='44.00'; files=@(@{url="$base/p23-deskmat.png"}) }
    ); thumb = "$base/p23-deskmat.png" }
)

foreach ($j in $jobs) {
  $body = @{ sync_product = @{ name = $j.name; thumbnail = $j.thumb }; sync_variants = $j.variants } | ConvertTo-Json -Depth 6
  $r = Invoke-Pf 'https://api.printful.com/store/products' 'Post' $body
  Write-Output "$($j.name) -> $($r.result.id) ($($j.variants.Count) variants)"
  Start-Sleep -Seconds 8
}
Write-Output 'ACCESSORIES COMPLETE'
