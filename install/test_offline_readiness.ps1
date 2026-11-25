[CmdletBinding()]
param(
    [string]$NomadUrl = 'http://localhost:8080',
    [string]$KiwixUrl = 'http://localhost:8090',
    [string]$KolibriUrl = 'http://localhost:8310'
)

$ErrorActionPreference = 'Stop'
$results = [System.Collections.Generic.List[object]]::new()

function Add-ReadinessCheck {
    param(
        [Parameter(Mandatory)] [string]$Name,
        [Parameter(Mandatory)] [scriptblock]$Check
    )

    try {
        $details = & $Check
        $results.Add([pscustomobject]@{
                name = $Name
                passed = $true
                details = $details
            }) | Out-Null
    }
    catch {
        $results.Add([pscustomobject]@{
                name = $Name
                passed = $false
                details = $_.Exception.Message
            }) | Out-Null
    }
}

function Get-LocalJson {
    param([Parameter(Mandatory)] [string]$Path)
    Invoke-RestMethod -Uri "$($NomadUrl.TrimEnd('/'))$Path" -TimeoutSec 30
}

Add-ReadinessCheck 'NOMAD interface' {
    $response = Invoke-WebRequest -Uri $NomadUrl -UseBasicParsing -TimeoutSec 30
    if ($response.StatusCode -ne 200) { throw "HTTP $($response.StatusCode)" }
    "HTTP $($response.StatusCode)"
}

Add-ReadinessCheck 'NOMAD API health' {
    $health = Get-LocalJson '/api/health'
    if ($health.status -ne 'ok') { throw "Unexpected status: $($health.status)" }
    $health.status
}

Add-ReadinessCheck 'No unfinished downloads' {
    $jobs = @(Get-LocalJson '/api/downloads/jobs') | Where-Object { $null -ne $_ }
    if ($jobs.Count -ne 0) { throw "$($jobs.Count) download job(s) remain" }
    '0 jobs'
}

Add-ReadinessCheck 'Installed article inventory' {
    $inventory = Get-LocalJson '/api/zim/list'
    $count = @($inventory.files).Count
    if ($count -lt 1) { throw 'No installed Kiwix archives reported' }
    "$count archives"
}

Add-ReadinessCheck 'Kiwix reader' {
    $response = Invoke-WebRequest -Uri $KiwixUrl -UseBasicParsing -TimeoutSec 30
    if ($response.StatusCode -ne 200) { throw "HTTP $($response.StatusCode)" }
    "HTTP $($response.StatusCode)"
}

Add-ReadinessCheck 'Kolibri guest learning page' {
    $uri = "$($KolibriUrl.TrimEnd('/'))/en/learn/"
    $response = Invoke-WebRequest -Uri $uri -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 30
    if ($response.StatusCode -ne 200) { throw "HTTP $($response.StatusCode)" }
    "HTTP $($response.StatusCode): $($response.BaseResponse.ResponseUri.AbsoluteUri)"
}

Add-ReadinessCheck 'Installed map archives' {
    $regions = Get-LocalJson '/api/maps/regions'
    $count = @($regions.files).Count
    if ($count -lt 1) { throw 'No offline map archives reported' }
    "$count map archives"
}

Add-ReadinessCheck 'Offline routing engine' {
    $routing = Get-LocalJson '/api/maps/routing/health'
    if (-not $routing.available) { throw 'Routing engine is unavailable' }
    if ($null -eq $routing.liveConditionsIncluded -or [bool]$routing.liveConditionsIncluded) {
        throw 'Routing must explicitly report liveConditionsIncluded=false'
    }
    if (-not $routing.snapshotDate) { throw 'Routing snapshot date is missing' }
    "$($routing.coverage), snapshot $($routing.snapshotDate), Valhalla $($routing.version)"
}

Add-ReadinessCheck 'West Jordan to Marysvale offline route' {
    $routeRequest = @{
        locations = @(
            @{ latitude = 40.6097; longitude = -111.9391 }
            @{ latitude = 38.4494; longitude = -112.2291 }
        )
        mode = 'driving'
        priority = 'fastest'
        highwayPreference = 'neutral'
        avoidTolls = $false
        avoidFerries = $false
        avoidUnpaved = $false
        avoidTracks = $false
    } | ConvertTo-Json -Depth 5
    $route = Invoke-RestMethod `
        -Uri "$($NomadUrl.TrimEnd('/'))/api/maps/routing/route" `
        -Method Post `
        -ContentType 'application/json' `
        -Body $routeRequest `
        -TimeoutSec 45
    $miles = [double]$route.summary.distanceMiles
    $maneuvers = @($route.legs | ForEach-Object { $_.maneuvers }).Count
    if ($miles -lt 150 -or $miles -gt 220) { throw "Implausible route distance: $miles miles" }
    if ($maneuvers -lt 5) { throw "Route returned only $maneuvers maneuvers" }
    if ($null -eq $route.liveConditionsIncluded -or [bool]$route.liveConditionsIncluded) {
        throw 'Route must explicitly report liveConditionsIncluded=false'
    }
    if (-not $route.snapshotDate) { throw 'Route snapshot date is missing' }
    ('{0:N1} miles, {1} maneuvers, snapshot {2}' -f $miles, $maneuvers, $route.snapshotDate)
}

Add-ReadinessCheck 'Trusted splint passage and exact PDF page' {
    $search = Get-LocalJson '/api/rag/files/search?q=splint&limit=5'
    if ($search.partial) { throw 'Saved-document search reports a partial index' }
    $source = @($search.results) | Where-Object {
        $_.fileName -eq 'who-basic-emergency-care-2018.pdf' -and $_.pageNumber -eq 191
    } | Select-Object -First 1
    if (-not $source) { throw 'WHO Basic Emergency Care page 191 was not found' }

    $encodedSource = [uri]::EscapeDataString($source.source)
    $readerUrl = "$($NomadUrl.TrimEnd('/'))/library/document?source=$encodedSource&q=splint&page=191"
    $reader = Invoke-WebRequest -Uri $readerUrl -UseBasicParsing -TimeoutSec 30
    if ($reader.StatusCode -ne 200) { throw "Reader returned HTTP $($reader.StatusCode)" }

    $originalUrl = "$($NomadUrl.TrimEnd('/'))/api/rag/files/inline?source=$encodedSource"
    $original = Invoke-WebRequest -Uri $originalUrl -Method Head -UseBasicParsing -TimeoutSec 30
    if ($original.StatusCode -ne 200 -or $original.Headers['Content-Type'] -notmatch 'application/pdf') {
        throw 'Original WHO PDF did not return as application/pdf'
    }
    'WHO Basic Emergency Care, page 191; reader and original HTTP 200'
}

$failed = @($results | Where-Object { -not $_.passed }).Count
$report = [pscustomobject]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    note = 'Local-only check. Physically disconnect networking before running to claim an offline result.'
    aiInvoked = $false
    passed = $results.Count - $failed
    failed = $failed
    checks = $results
}

$report | ConvertTo-Json -Depth 8
if ($failed -gt 0) { exit 1 }
