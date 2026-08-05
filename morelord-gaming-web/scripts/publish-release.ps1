[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$WebsiteUrl,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$Token,

    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path $_ -PathType Leaf })]
    [string]$PayloadPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-Property {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Object,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property -or [string]::IsNullOrWhiteSpace([string]$property.Value)) {
        throw "Release payload is missing required property '$Name'."
    }
}

$resolvedPayloadPath = (Resolve-Path $PayloadPath).Path
$rawPayload = Get-Content -Path $resolvedPayloadPath -Raw -Encoding UTF8

try {
    $payload = $rawPayload | ConvertFrom-Json -Depth 20
}
catch {
    throw "Release payload is not valid JSON: $($_.Exception.Message)"
}

Assert-Property -Object $payload -Name 'productSlug'
Assert-Property -Object $payload -Name 'version'
Assert-Property -Object $payload -Name 'title'

if ([string]$payload.version -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$') {
    throw "Release version '$($payload.version)' is not valid semantic versioning."
}

$endpoint = "$($WebsiteUrl.TrimEnd('/'))/api/releases"
$headers = @{
    Authorization = "Bearer $Token"
    Accept        = 'application/json'
}

Write-Host "Publishing $($payload.productSlug) v$($payload.version) to $endpoint..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod `
        -Method Post `
        -Uri $endpoint `
        -Headers $headers `
        -ContentType 'application/json; charset=utf-8' `
        -Body $rawPayload
}
catch {
    $details = $_.ErrorDetails.Message
    if ([string]::IsNullOrWhiteSpace($details)) {
        $details = $_.Exception.Message
    }
    throw "Website release publication failed: $details"
}

if (-not $response.ok) {
    throw "Website release publication failed: $($response.error)"
}

Write-Host "Published $($response.productSlug) v$($response.version)." -ForegroundColor Green
Write-Host "Release record: $($response.releaseId)" -ForegroundColor DarkGray
