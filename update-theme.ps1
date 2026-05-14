$files = @(
  "src\assets\css\style.css",
  "src\assets\css\dashboard.css",
  "src\assets\css\auth.css",
  "src\assets\css\goals.css",
  "src\assets\css\hero-simple.css",
  "src\assets\css\progress-bar.css",
  "src\assets\css\transactions.css",
  "src\assets\css\withdrawal-card.css"
)

foreach ($f in $files) {
  $path = Join-Path "c:\Users\ASUS\OneDrive\Desktop\SM\savemore-react" $f
  if (Test-Path $path) {
    $content = [System.IO.File]::ReadAllText($path)
    
    # CSS variable definitions
    $content = $content -replace '--accent-teal:\s*#14f195', '--accent-teal: #8DFF00'
    $content = $content -replace '--accent-blue:\s*#00e5ff', '--accent-blue: #BFFF00'
    $content = $content -replace '--accent-teal-dark:\s*#0db36e', '--accent-teal-dark: #6BCC00'
    $content = $content -replace '--border-accent:\s*rgba\(20,\s*241,\s*149,\s*0\.2\)', '--border-accent: rgba(141, 255, 0, 0.2)'
    
    # rgba(20, 241, 149, ...) -> rgba(141, 255, 0, ...)
    $content = $content -replace 'rgba\(20,\s*241,\s*149,', 'rgba(141, 255, 0,'

    # rgba(0, 229, 255, ...) -> rgba(141, 255, 0, ...) [cyan]
    $content = $content -replace 'rgba\(0,\s*229,\s*255,', 'rgba(141, 255, 0,'
    
    # Material greens
    $content = $content -replace '#4caf50', '#8DFF00'
    $content = $content -replace '#4CAF50', '#8DFF00'
    $content = $content -replace '#45a049', '#6BCC00'
    $content = $content -replace '#66bb6a', '#A5FF33'
    $content = $content -replace '#388e3c', '#6BCC00'
    $content = $content -replace '#2e7d32', '#5AB800'
    
    # rgba(76, 175, 80, ...) -> rgba(141, 255, 0, ...)
    $content = $content -replace 'rgba\(76,\s*175,\s*80,', 'rgba(141, 255, 0,'
    
    # Tailwind greens
    $content = $content -replace '#22c55e', '#8DFF00'
    $content = $content -replace '#16a34a', '#6BCC00'
    $content = $content -replace '#15803d', '#5AB800'
    $content = $content -replace 'rgba\(34,\s*197,\s*94,', 'rgba(141, 255, 0,'
    
    # CTA button gradient
    $content = $content -replace 'rgba\(16,\s*196,\s*121,\s*1\)', 'rgba(107, 255, 0, 1)'

    [System.IO.File]::WriteAllText($path, $content)
    Write-Output "Updated: $f"
  } else {
    Write-Output "Not found: $f"
  }
}
Write-Output "Done!"
