Get-ChildItem -Path "src\components\elements\advanced-ui\swiper\*.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName
    $newContent = $content -replace "from 'swiper/modules'", "from 'swiper'"
    Set-Content $_.FullName $newContent
}
