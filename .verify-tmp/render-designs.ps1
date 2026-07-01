# Renders typographic merch designs for adamnoteve.
# Brand: hot pink #ff007a, cream #f8eaea, black #0a0a0a. Cooper Black headlines.
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$outDir = 'C:\Users\psp56\adamnoteve\designs'

$PINK  = [System.Drawing.Color]::FromArgb(255, 0, 122)
$CREAM = [System.Drawing.Color]::FromArgb(248, 234, 234)
$BLACK = [System.Drawing.Color]::FromArgb(10, 10, 10)

function New-Lockup {
  param(
    [string]$Path,
    [int]$W = 4500, [int]$H = 5400,
    [object[]]$Lines,          # @{ t=text; f=font; frac=width fraction; c=color; gapAfter=px }
    [System.Drawing.Color]$Bg = [System.Drawing.Color]::Transparent,
    [int]$CornerRadius = 0     # rounded-rect bg (sticker style) when > 0
  )
  $bmp = [System.Drawing.Bitmap]::new($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)
  if ($Bg.A -gt 0) {
    $brush = [System.Drawing.SolidBrush]::new($Bg)
    if ($CornerRadius -gt 0) {
      $p = [System.Drawing.Drawing2D.GraphicsPath]::new()
      $r = $CornerRadius; $d = $r * 2
      $p.AddArc(0, 0, $d, $d, 180, 90); $p.AddArc($W - $d, 0, $d, $d, 270, 90)
      $p.AddArc($W - $d, $H - $d, $d, $d, 0, 90); $p.AddArc(0, $H - $d, $d, $d, 90, 90)
      $p.CloseFigure(); $g.FillPath($brush, $p)
    } else { $g.FillRectangle($brush, 0, 0, $W, $H) }
  }
  $fmt = [System.Drawing.StringFormat]::GenericTypographic

  # Auto-size each line so its width = frac * canvas width, then stack centered.
  $sized = foreach ($ln in $Lines) {
    $target = [double]$W * $ln.frac
    $pt = 40.0
    $font = [System.Drawing.Font]::new($ln.f, $pt)
    $m = $g.MeasureString($ln.t, $font, [int][System.Int32]::MaxValue, $fmt)
    $pt = [Math]::Min(900.0, $pt * $target / [Math]::Max(1.0, $m.Width))
    $font.Dispose()
    $font = [System.Drawing.Font]::new($ln.f, $pt)
    $m = $g.MeasureString($ln.t, $font, [int][System.Int32]::MaxValue, $fmt)
    @{ t = $ln.t; font = $font; w = $m.Width; h = $m.Height; c = $ln.c; gap = [int]($ln.gapAfter ?? 40) }
  }
  $totalH = ($sized | ForEach-Object { $_.h + $_.gap } | Measure-Object -Sum).Sum - $sized[-1].gap
  $y = ([double]$H - $totalH) / 2.0
  foreach ($s in $sized) {
    $x = ([double]$W - $s.w) / 2.0
    $brush = [System.Drawing.SolidBrush]::new($s.c)
    $g.DrawString($s.t, $s.font, $brush, [single]$x, [single]$y, $fmt)
    $brush.Dispose(); $s.font.Dispose()
    $y += $s.h + $s.gap
  }
  $g.Dispose()
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output ("rendered " + (Split-Path $Path -Leaf))
}

$CB = 'Cooper Black'; $RW = 'Rockwell Extra Bold'; $BS = 'Bahnschrift SemiBold'

# ---- Apparel: light variant (dark ink) + dark variant (cream ink) ----
# p2 Thanks for the Trauma Hoodie
foreach ($v in @(@($BLACK, 'light'), @($CREAM, 'dark'))) {
  $ink, $tag = $v
  New-Lockup -Path "$outDir\p2-trauma-$tag.png" -Lines @(
    @{ t = 'THANKS'; f = $CB; frac = 0.84; c = $ink; gapAfter = 30 },
    @{ t = 'FOR THE'; f = $CB; frac = 0.62; c = $ink; gapAfter = 30 },
    @{ t = 'TRAUMA'; f = $CB; frac = 0.88; c = $PINK; gapAfter = 90 },
    @{ t = 'XOXO, YOUR EX'; f = $BS; frac = 0.34; c = $ink }
  )
}
# p3 Emotionally Unavailable Club Tee
foreach ($v in @(@($BLACK, 'light'), @($CREAM, 'dark'))) {
  $ink, $tag = $v
  New-Lockup -Path "$outDir\p3-club-$tag.png" -Lines @(
    @{ t = 'EMOTIONALLY'; f = $RW; frac = 0.9; c = $ink; gapAfter = 36 },
    @{ t = 'UNAVAILABLE'; f = $RW; frac = 0.9; c = $PINK; gapAfter = 36 },
    @{ t = 'CLUB'; f = $RW; frac = 0.52; c = $ink; gapAfter = 90 },
    @{ t = '· EST. 2026 · MEMBERS ONLY ·'; f = $BS; frac = 0.5; c = $ink }
  )
}
# p9 Petty in Pink Crewneck
foreach ($v in @(@($BLACK, 'light'), @($CREAM, 'dark'))) {
  $ink, $tag = $v
  New-Lockup -Path "$outDir\p9-petty-$tag.png" -Lines @(
    @{ t = 'PETTY'; f = $CB; frac = 0.85; c = $PINK; gapAfter = 24 },
    @{ t = 'IN PINK'; f = $CB; frac = 0.7; c = $PINK; gapAfter = 80 },
    @{ t = 'AND PROUD OF IT'; f = $BS; frac = 0.36; c = $ink }
  )
}
# p12 Cried in the Uber Crewneck
foreach ($v in @(@($BLACK, 'light'), @($CREAM, 'dark'))) {
  $ink, $tag = $v
  New-Lockup -Path "$outDir\p12-uber-$tag.png" -Lines @(
    @{ t = 'CRIED IN'; f = $CB; frac = 0.8; c = $ink; gapAfter = 30 },
    @{ t = 'THE UBER'; f = $CB; frac = 0.82; c = $ink; gapAfter = 80 },
    @{ t = [char]0x2605 + ' 1.0 RATING ' + [char]0x00B7 + ' STILL TIPPED 20%'; f = $BS; frac = 0.52; c = $PINK }
  )
}
# p13 Self-Care Era Tee
foreach ($v in @(@($BLACK, 'light'), @($CREAM, 'dark'))) {
  $ink, $tag = $v
  New-Lockup -Path "$outDir\p13-era-$tag.png" -Lines @(
    @{ t = 'THE'; f = $RW; frac = 0.3; c = $ink; gapAfter = 24 },
    @{ t = 'SELF-CARE'; f = $RW; frac = 0.9; c = $PINK; gapAfter = 24 },
    @{ t = 'ERA'; f = $RW; frac = 0.46; c = $ink; gapAfter = 90 },
    @{ t = 'ADMIT ONE ' + [char]0x00B7 + ' NO PLUS-ONES'; f = $BS; frac = 0.44; c = $ink }
  )
}
# p14 Allergic to Mixed Signals Hoodie
foreach ($v in @(@($BLACK, 'light'), @($CREAM, 'dark'))) {
  $ink, $tag = $v
  New-Lockup -Path "$outDir\p14-allergic-$tag.png" -Lines @(
    @{ t = 'ALLERGIC TO'; f = $CB; frac = 0.84; c = $ink; gapAfter = 30 },
    @{ t = 'MIXED SIGNALS'; f = $CB; frac = 0.9; c = $PINK; gapAfter = 80 },
    @{ t = 'Rx: ONE BOUNDARY DAILY'; f = $BS; frac = 0.46; c = $ink }
  )
}

# ---- Accessories / home (single variant each) ----
# p5 tote — black + pink on natural canvas
New-Lockup -Path "$outDir\p5-redflags.png" -Lines @(
  @{ t = 'RED FLAGS'; f = $CB; frac = 0.88; c = $PINK; gapAfter = 30 },
  @{ t = 'WERE MY'; f = $CB; frac = 0.62; c = $BLACK; gapAfter = 30 },
  @{ t = 'AESTHETIC'; f = $CB; frac = 0.88; c = $BLACK }
)
# p6 kiss-cut sticker — pink rounded tile, cream text
New-Lockup -Path "$outDir\p6-closure.png" -W 1800 -H 1800 -Bg $PINK -CornerRadius 160 -Lines @(
  @{ t = 'CLOSURE'; f = $CB; frac = 0.78; c = $CREAM; gapAfter = 20 },
  @{ t = 'IS A'; f = $CB; frac = 0.3; c = $CREAM; gapAfter = 20 },
  @{ t = 'MYTH'; f = $CB; frac = 0.62; c = $BLACK }
)
# p8 phone case — tall canvas
New-Lockup -Path "$outDir\p8-ghosted.png" -W 1300 -H 2100 -Lines @(
  @{ t = 'GHOSTED'; f = $CB; frac = 0.86; c = $PINK; gapAfter = 40 },
  @{ t = 'LEFT ON READ'; f = $BS; frac = 0.5; c = $BLACK; gapAfter = 10 },
  @{ t = 'SINCE 2:47 AM'; f = $BS; frac = 0.5; c = $BLACK }
)
# p11 water bottle — tall wrap
New-Lockup -Path "$outDir\p11-salty.png" -W 1800 -H 2400 -Lines @(
  @{ t = 'SINGLE'; f = $CB; frac = 0.84; c = $BLACK; gapAfter = 16 },
  @{ t = '&'; f = $CB; frac = 0.2; c = $PINK; gapAfter = 16 },
  @{ t = 'SALTY'; f = $CB; frac = 0.78; c = $BLACK }
)
# p17 tumbler
New-Lockup -Path "$outDir\p17-tumbler.png" -W 1800 -H 2400 -Lines @(
  @{ t = 'SALTY'; f = $CB; frac = 0.8; c = $PINK; gapAfter = 24 },
  @{ t = 'SINGLE'; f = $CB; frac = 0.84; c = $BLACK; gapAfter = 70 },
  @{ t = 'EXTRA ICE, EXTRA STANDARDS'; f = $BS; frac = 0.62; c = $BLACK }
)
# p18 spiral notebook cover — full-bleed pink
New-Lockup -Path "$outDir\p18-manifest.png" -W 1650 -H 2550 -Bg $PINK -Lines @(
  @{ t = 'MANIFEST,'; f = $CB; frac = 0.84; c = $CREAM; gapAfter = 24 },
  @{ t = "DON'T TEXT"; f = $CB; frac = 0.86; c = $BLACK; gapAfter = 80 },
  @{ t = 'A JOURNAL FOR THE HEALING ERA'; f = $BS; frac = 0.6; c = $CREAM }
)
# p23 desk mat — full-bleed pink, wide
New-Lockup -Path "$outDir\p23-deskmat.png" -W 10800 -H 5400 -Bg $PINK -Lines @(
  @{ t = 'HEALING ERA'; f = $CB; frac = 0.8; c = $CREAM; gapAfter = 60 },
  @{ t = 'HEADQUARTERS'; f = $BS; frac = 0.5; c = $BLACK }
)
Write-Output 'ALL DESIGNS RENDERED'
