param(
  [string]$DatabaseUrl = '',
  [string]$OutputDirectory = ''
)

. (Join-Path $PSScriptRoot 'database-tools.ps1')

$databaseUrl = Get-ProjectDatabaseUrl $DatabaseUrl
$cliDatabaseUrl = Convert-ToPostgresCliUrl $databaseUrl
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (!$OutputDirectory) { $OutputDirectory = Join-Path $projectRoot 'backups' }
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null

$databaseName = Get-DatabaseNameFromUrl $databaseUrl
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = Join-Path $resolvedOutput "$databaseName-$timestamp.dump"
$manifestPath = "$backupPath.sha256"
$pgDump = Find-PostgresTool 'pg_dump'
$pgRestore = Find-PostgresTool 'pg_restore'

& $pgDump --format=custom --compress=6 --no-owner --no-privileges --file=$backupPath $cliDatabaseUrl
if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $backupPath)) { throw 'PostgreSQL backup failed.' }

& $pgRestore --list $backupPath | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Backup verification failed: pg_restore could not read the archive.' }

$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $backupPath).Hash
Set-Content -LiteralPath $manifestPath -Value "$hash  $([System.IO.Path]::GetFileName($backupPath))" -Encoding ascii

Write-Output "Backup created and verified: $backupPath"
Write-Output "SHA-256 manifest: $manifestPath"
