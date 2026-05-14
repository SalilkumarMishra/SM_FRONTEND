$cssFiles = @(
  "src\assets\css\style.css",
  "src\assets\css\dashboard.css",
  "src\assets\css\auth.css",
  "src\assets\css\goals.css",
  "src\assets\css\hero-simple.css",
  "src\assets\css\progress-bar.css",
  "src\assets\css\transactions.css",
  "src\assets\css\withdrawal-card.css",
  "src\index.css",
  "src\App.css"
)

$base = "c:\Users\ASUS\OneDrive\Desktop\SM\savemore-react"

foreach ($f in $cssFiles) {
  $path = Join-Path $base $f
  if (Test-Path $path) {
    $content = [System.IO.File]::ReadAllText($path)

    # Remove backdrop-filter lines
    $content = $content -replace '(?m)^\s*backdrop-filter:\s*blur\([^)]*\);\s*$', ''
    $content = $content -replace '(?m)^\s*-webkit-backdrop-filter:\s*blur\([^)]*\);\s*$', ''

    # Remove filter: blur() lines (but NOT filter: drop-shadow)
    $content = $content -replace '(?m)^\s*filter:\s*blur\([^)]*\);\s*$', ''

    # Remove the broken noise.svg URL references
    $content = $content -replace 'background-image:\s*url\("https://grainy-gradients\.vercel\.app/noise\.svg"\);', 'background-image: none;'

    # Spacing fix: Remove bottom padding from hero and top padding from features
    if ($f -eq "src\assets\css\style.css") {
      # Change .hero padding from 'var(--space-xxl) 0' to 'var(--space-xxl) 0 0 0'
      $content = $content -replace '\.hero\s*\{([^}]*?)padding:\s*var\(--space-xxl\)\s*0;', '.hero {$1padding: var(--space-xxl) 0 0 0;'
      
      # Also check for .section-padding and reduce it or remove it between hero and next
      # However, section-padding is used everywhere. 
      # Better to target the specific section after hero in Home.jsx
    }

    [System.IO.File]::WriteAllText($path, $content)
    Write-Output "Fixed blur/styles in: $f"
  }
}

# Fix Home.jsx to remove section-padding from hero and features to eliminate gap
$homePath = Join-Path $base "src\pages\Home.jsx"
if (Test-Path $homePath) {
  $content = [System.IO.File]::ReadAllText($homePath)
  
  # Remove section-padding from hero
  $content = $content -replace 'className="hero container section-padding"', 'className="hero container"'
  
  # Remove section-padding (or reduce it) from features section
  $content = $content -replace 'id="features" className="container section-padding"', 'id="features" className="container" style={{paddingTop: "0"}}'

  # Fix leftover colors
  $content = $content -replace '#14f195', '#8DFF00'
  $content = $content -replace 'rgba\(20,\s*241,\s*149,', 'rgba(141, 255, 0,'

  [System.IO.File]::WriteAllText($homePath, $content)
  Write-Output "Fixed Home.jsx spacing and colors"
}

# Fix other JSX files for colors
$jsxFiles = @(
  "src\pages\LoginSuccess.jsx",
  "src\pages\Wallet.jsx",
  "src\pages\Analytics.jsx"
)

foreach ($f in $jsxFiles) {
  $path = Join-Path $base $f
  if (Test-Path $path) {
    $content = [System.IO.File]::ReadAllText($path)
    $content = $content -replace '#14f195', '#8DFF00'
    $content = $content -replace 'rgba\(20,\s*241,\s*149,', 'rgba(141, 255, 0,'
    [System.IO.File]::WriteAllText($path, $content)
    Write-Output "Fixed colors in: $f"
  }
}

Write-Output "All done!"
