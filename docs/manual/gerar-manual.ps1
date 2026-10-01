# Regenera as telas do manual e o PDF final (assets/manual-rsf-online.pdf).
# Requer o Microsoft Edge e um servidor local na raiz do projeto:
#   python -m http.server 8080
#   powershell -File docs/manual/gerar-manual.ps1
$ErrorActionPreference = 'Stop'
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$dir  = $PSScriptRoot
$prof = Join-Path $env:TEMP 'rsf-manual-edge'
$base = 'http://localhost:8080/docs/manual/captura.html'

function Edge([string[]]$extra, [string]$url) {
  $a = @('--headless=new', '--disable-gpu', '--hide-scrollbars', "--user-data-dir=$prof") + $extra + $url
  Start-Process -FilePath $edge -ArgumentList $a -Wait | Out-Null
}

# nome, parâmetros da captura, largura x altura da janela
$telas = @(
  @('tela',             'tab=0&apto=1',                  1440, 900),
  @('capa',             'tab=0&clean=1&card=0',          1200, 400),
  @('status-datas',     'tab=1&clean=1&card=0',          1200, 560),
  @('status-contatos',  'tab=1&clean=1&card=2',          1200, 760),
  @('status-situacao',  'tab=1&clean=1&card=3',          1200, 560),
  @('previa',           'tab=1&clean=1&sel=.preview-wrap', 1200, 780),
  @('dds',              'tab=2&clean=1&card=0',          1200, 700),
  @('dds-foto',         'tab=2&clean=1&card=2',          1200, 660),
  @('atividades',       'tab=3&clean=1&card=0',          1200, 860),
  @('fatos',            'tab=4&clean=1&card=0',          1200, 760),
  @('acompanhamento',   'tab=4&clean=1&card=2',          1200, 400),
  @('atrasos',          'tab=5&clean=1&card=0',          1200, 520),
  @('curva',            'tab=6&clean=1&sel=.panel',      1200, 900),
  @('cronograma',       'tab=7&clean=1&sel=.panel',      1200, 900),
  @('fotos',            'tab=8&clean=1&card=0',          1200, 820),
  @('exportar',         'tab=1&y=99999',                 1440, 900)
)
New-Item -ItemType Directory -Force (Join-Path $dir 'img') | Out-Null
foreach ($t in $telas) {
  $png = Join-Path $dir "img\$($t[0]).png"
  Edge @('--force-device-scale-factor=1.5', "--window-size=$($t[2]),$($t[3])", '--virtual-time-budget=10000', "--screenshot=`"$png`"") "$base`?$($t[1])"
  Write-Output "ok  $($t[0])"
}

$pdf = Join-Path (Split-Path (Split-Path $dir)) 'assets\manual-rsf-online.pdf'
Edge @('--no-pdf-header-footer', '--virtual-time-budget=10000', "--print-to-pdf=`"$pdf`"") 'http://localhost:8080/docs/manual/manual.html'
Write-Output "PDF: $pdf"

# reduz o PDF convertendo as telas para JPEG (opcional: requer python + pymupdf)
python -c "import pymupdf,sys; d=pymupdf.open(sys.argv[1]); d.rewrite_images(quality=82); d.save(sys.argv[1]+'.tmp', garbage=4, deflate=True)" "$pdf"
if ($LASTEXITCODE -eq 0) { Move-Item -Force "$pdf.tmp" $pdf; Write-Output "PDF compactado: $([math]::Round((Get-Item $pdf).Length/1MB,1)) MB" }
