# Robust script to remove italic classes and strings from all files
Get-ChildItem -Path "src" -Include "*.tsx", "*.jsx", "*.ts" -Recurse | ForEach-Object {
    $filePath = $_.FullName
    try {
        $content = [System.IO.File]::ReadAllText($filePath)
        # Targeted replacement of 'italic' as a class or standalone string
        $newContent = $content -replace "\bitalic\b", ""
        # Clean up any resulting double spaces in class names
        $newContent = $newContent -replace "  ", " "
        
        if ($content -ne $newContent) {
            [System.IO.File]::WriteAllText($filePath, $newContent)
            Write-Host "Processed: $($_.Name)"
        }
    } catch {
        Write-Warning "Could not process: $filePath"
    }
}
