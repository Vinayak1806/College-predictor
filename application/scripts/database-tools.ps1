function Get-ProjectDatabaseUrl {
  param([string]$ExplicitUrl)

  if ($ExplicitUrl) { return $ExplicitUrl }
  if ($env:DATABASE_URL) { return $env:DATABASE_URL }

  $envPath = Join-Path (Split-Path $PSScriptRoot -Parent) '.env'
  if (Test-Path -LiteralPath $envPath) {
    $line = Get-Content -LiteralPath $envPath | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -First 1
    if ($line) {
      return (($line -split '=', 2)[1]).Trim().Trim('"').Trim("'")
    }
  }

  throw 'DATABASE_URL is not configured. Add it to application/.env or pass -DatabaseUrl.'
}

function Find-PostgresTool {
  param([Parameter(Mandatory)][string]$Name)

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) { return $command.Source }

  $installRoot = 'C:\Program Files\PostgreSQL'
  $candidate = Get-ChildItem -LiteralPath $installRoot -Directory -ErrorAction SilentlyContinue |
    Sort-Object { [int]($_.Name -replace '[^0-9]', '') } -Descending |
    ForEach-Object { Join-Path $_.FullName "bin\$Name.exe" } |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1

  if (!$candidate) { throw "$Name was not found. Install PostgreSQL command-line tools or add its bin folder to PATH." }
  return $candidate
}

function Convert-ToPostgresCliUrl {
  param([Parameter(Mandatory)][string]$DatabaseUrl)
  $parts = $DatabaseUrl -split '\?', 2
  if ($parts.Count -eq 1) { return $DatabaseUrl }
  $parameters = @($parts[1] -split '&' | Where-Object { $_ -notmatch '^schema=' })
  if ($parameters.Count) { return "$($parts[0])?$($parameters -join '&')" }
  return $parts[0]
}

function Get-DatabaseNameFromUrl {
  param([Parameter(Mandatory)][string]$DatabaseUrl)
  $uri = [System.Uri]$DatabaseUrl
  return $uri.AbsolutePath.Trim('/').Split('?')[0]
}
