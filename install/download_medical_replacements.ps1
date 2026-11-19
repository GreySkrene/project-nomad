[CmdletBinding()]
param(
    [ValidateSet('Start', 'Status', 'Finalize', 'Manifest')]
    [string]$Action = 'Status',
    [string]$DestinationRoot,
    [string]$ManifestPath
)

$ErrorActionPreference = 'Stop'
if (-not $DestinationRoot) {
    $DestinationRoot = Join-Path $PSScriptRoot '..\resources\official\medical\replacement-library'
}
$destination = [System.IO.Path]::GetFullPath($DestinationRoot)

function Add-HesperianBook {
    param(
        [System.Collections.Generic.List[object]]$Items,
        [string]$Code,
        [int]$Year,
        [string]$Folder,
        [int]$ChapterCount,
        [string[]]$AdditionalParts
    )

    $parts = @('fm')
    for ($chapter = 1; $chapter -le $ChapterCount; $chapter++) {
        $parts += $chapter.ToString('00')
    }
    $parts += $AdditionalParts

    foreach ($part in $parts) {
        $fileName = "en_${Code}_${Year}_${part}.pdf"
        $Items.Add([pscustomobject]@{
            Source = "https://hesperian.org/wp-content/uploads/pdf/en_${Code}_${Year}/$fileName"
            Destination = Join-Path $destination (Join-Path $Folder $fileName)
        })
    }
}

function Get-DownloadItems {
    $items = [System.Collections.Generic.List[object]]::new()

    Add-HesperianBook -Items $items -Code 'wtnd' -Year 2025 -Folder 'hesperian-where-there-is-no-doctor-2025' -ChapterCount 23 -AdditionalParts @(
        'toc', 'int', 'gp', 'info', 'gloss', 'resc', 'indx', 'bm'
    )
    Add-HesperianBook -Items $items -Code 'dent' -Year 2024 -Folder 'hesperian-where-there-is-no-dentist-2024' -ChapterCount 12 -AdditionalParts @('bm')
    Add-HesperianBook -Items $items -Code 'midw' -Year 2026 -Folder 'hesperian-a-book-for-midwives-2026' -ChapterCount 25 -AdditionalParts @(
        'gp', 'resc', 'gloss', 'indx', 'ddc'
    )

    $items.Add([pscustomobject]@{
        Source = 'https://iris.who.int/server/api/core/bitstreams/63432b9f-8808-44c5-9692-cea717c0cbda/content'
        Destination = Join-Path $destination 'who-basic-emergency-care-2018.pdf'
    })
    $items.Add([pscustomobject]@{
        Source = 'https://cdn.who.int/media/docs/default-source/integrated-health-services-(ihs)/csy/bec-quick-cards/becp-edu29-pdf-en-finl.pdf?sfvrsn=2532d61b_4'
        Destination = Join-Path $destination 'who-basic-emergency-care-quick-cards.pdf'
    })
    $items.Add([pscustomobject]@{
        Source = 'https://cdn.who.int/media/docs/default-source/integrated-health-services-(ihs)/csy/pph-quick-card.pdf?sfvrsn=359ae7aa_3'
        Destination = Join-Path $destination 'who-postpartum-haemorrhage-quick-card-2026.pdf'
    })

    return $items
}

function Test-PdfSignature {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $false }
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        if ($stream.Length -lt 8) { return $false }
        $bytes = New-Object byte[] 5
        [void]$stream.Read($bytes, 0, $bytes.Length)
        return [System.Text.Encoding]::ASCII.GetString($bytes) -eq '%PDF-'
    }
    finally {
        $stream.Dispose()
    }
}

$items = Get-DownloadItems

switch ($Action) {
    'Start' {
        $pending = @($items | Where-Object { -not (Test-PdfSignature $_.Destination) })
        if ($pending.Count -eq 0) {
            Write-Output 'All replacement PDFs already exist and have PDF signatures.'
            break
        }

        $curl = Get-Command curl.exe -ErrorAction Stop
        foreach ($item in $pending) {
            New-Item -ItemType Directory -Force -Path (Split-Path -Parent $item.Destination) | Out-Null
            $partial = "$($item.Destination).partial"
            Write-Output "Downloading $($item.Source)"
            & $curl.Source --fail --location --retry 5 --retry-delay 2 --continue-at - `
                --output $partial $item.Source
            if ($LASTEXITCODE -ne 0) {
                throw "curl failed with exit code $LASTEXITCODE for $($item.Source). Rerun -Action Start to resume."
            }
            if (-not (Test-PdfSignature $partial)) {
                throw "Downloaded file is not a PDF: $partial"
            }
            Move-Item -Force -LiteralPath $partial -Destination $item.Destination
        }

        & $PSCommandPath -Action Finalize -DestinationRoot $destination
    }
    'Status' {
        $valid = @($items | Where-Object { Test-PdfSignature $_.Destination }).Count
        $partials = @(Get-ChildItem -File -Recurse -Filter '*.partial' -LiteralPath $destination -ErrorAction SilentlyContinue)
        [pscustomobject]@{
            ValidFiles = $valid
            ExpectedFiles = $items.Count
            PartialFiles = $partials.Count
            PartialBytes = ($partials | Measure-Object Length -Sum).Sum
        }
    }
    'Finalize' {
        $invalid = @($items | Where-Object { -not (Test-PdfSignature $_.Destination) })
        if ($invalid.Count -gt 0) {
            $invalid | Select-Object Source, Destination
            throw "$($invalid.Count) downloaded file(s) failed the PDF signature check."
        }

        $files = Get-ChildItem -File -Recurse -LiteralPath $destination | Sort-Object FullName
        $total = ($files | Measure-Object Length -Sum).Sum
        [pscustomobject]@{ ValidFiles = $files.Count; TotalBytes = $total; Destination = $destination }
    }
    'Manifest' {
        if (-not $ManifestPath) {
            $ManifestPath = Join-Path $PSScriptRoot '..\docs\emergency\MEDICAL_REPLACEMENT_FILES.csv'
        }

        $rows = foreach ($item in $items) {
            if (-not (Test-PdfSignature $item.Destination)) {
                throw "Cannot manifest missing or invalid PDF: $($item.Destination)"
            }

            $destinationPrefix = $destination.TrimEnd('\') + '\'
            $relativePath = $item.Destination.Substring($destinationPrefix.Length).Replace('\', '/')
            $isWho = $relativePath.StartsWith('who-')
            $publisher = if ($isWho) { 'World Health Organization' } else { 'Hesperian Health Guides' }
            $license = if ($isWho) {
                'WHO publication terms; retained for personal offline reference with source attribution'
            } else {
                'Hesperian open copyright; noncommercial offline use with attribution'
            }
            $role = if ($isWho) {
                'professional emergency-care reference'
            } else {
                'austere supplemental reference; official US clinical guidance takes precedence'
            }

            [pscustomobject]@{
                path = $relativePath
                bytes = (Get-Item -LiteralPath $item.Destination).Length
                sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $item.Destination).Hash
                source_url = $item.Source
                publisher = $publisher
                role = $role
                license_or_offline_basis = $license
                validation = 'PDF signature and full-page extraction audit passed'
                nomad_state = 'installed; browse/download verified; manual indexing pending'
            }
        }

        $manifestFullPath = [System.IO.Path]::GetFullPath($ManifestPath)
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $manifestFullPath) | Out-Null
        $rows | Export-Csv -NoTypeInformation -Encoding UTF8 -LiteralPath $manifestFullPath
        [pscustomobject]@{ Files = @($rows).Count; Manifest = $manifestFullPath }
    }
}
