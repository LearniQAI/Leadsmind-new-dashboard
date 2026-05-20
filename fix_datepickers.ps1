$files = Get-ChildItem -Path "src" -Filter "*.tsx" -Recurse
foreach ($file in $files) {
    $content = Get-Content -LiteralPath $file.FullName
    $newContent = $content -replace 'onChange=\{\(date\) =>', 'onChange={(date: any) =>'
    if ($content -ne $newContent) {
        Set-Content -LiteralPath $file.FullName -Value $newContent
        Write-Host "Updated $($file.Name)"
    }
}
Write-Host "Done"
