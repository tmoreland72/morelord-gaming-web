[CmdletBinding()]
param(
    [ValidateNotNullOrEmpty()]
    [string]$WebsiteUrl = 'https://morelordgaming.com',

    [string]$Token,

    [string]$PayloadPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectRoot = Split-Path -Parent $PSScriptRoot

function Import-DotEnv {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path $Path -PathType Leaf)) {
        return
    }

    foreach ($line in Get-Content -Path $Path -Encoding UTF8) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith('#')) {
            continue
        }

        $separator = $trimmed.IndexOf('=')
        if ($separator -lt 1) {
            continue
        }

        $name = $trimmed.Substring(0, $separator).Trim()
        $value = $trimmed.Substring($separator + 1).Trim()

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        if (-not [string]::IsNullOrWhiteSpace($name)) {
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

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

# This script publishes product/module release metadata to the website. It is
# intentionally not part of the website deployment workflow.
if ([string]::IsNullOrWhiteSpace($PayloadPath)) {
    throw @"
No product release payload was supplied.

scripts/publish-release.ps1 publishes product/module release metadata to /api/releases; it does not deploy the Morelord Gaming website.

For normal website changes, run:
  npm run check
  npm run build
  git add .
  git commit -m "Your message"
  git push

If you intentionally need to publish product release metadata, run:
  ./scripts/publish-release.ps1 -PayloadPath ./release-payload.json

The script will automatically read RELEASE_PUBLISH_TOKEN from the project .env file when available.
"@
}

Import-DotEnv -Path (Join-Path $projectRoot '.env')

if ([string]::IsNullOrWhiteSpace($Token)) {
    $Token = $env:RELEASE_PUBLISH_TOKEN
}

# Backward compatibility with the older Windows user-variable name used by
# some Morelord repositories.
if ([string]::IsNullOrWhiteSpace($Token)) {
    $Token = $env:MORELORD_RELEASE_TOKEN
}

if ([string]::IsNullOrWhiteSpace($Token)) {
    throw "RELEASE_PUBLISH_TOKEN was not found. Put it in the project's .env file or pass -Token explicitly."
}

$candidatePayloadPath = $PayloadPath
if (-not [System.IO.Path]::IsPathRooted($candidatePayloadPath)) {
    $candidatePayloadPath = Join-Path $projectRoot $candidatePayloadPath
}

if (-not (Test-Path $candidatePayloadPath -PathType Leaf)) {
    throw "Release payload was not found: $candidatePayloadPath"
}

$resolvedPayloadPath = (Resolve-Path $candidatePayloadPath).Path
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
