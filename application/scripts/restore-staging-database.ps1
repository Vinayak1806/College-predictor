param(
  [Parameter(Mandatory)][string]$BackupPath,
  [Parameter(Mandatory)][string]$StagingDatabaseUrl,
  [string]$LocalDatabaseUrl = '',
  [ValidateSet('', 'STAGING')][string]$ConfirmTarget = ''
)

. (Join-Path $PSScriptRoot 'database-tools.ps1')

$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
$stagingName = Get-DatabaseNameFromUrl $StagingDatabaseUrl
$localUrl = if ($LocalDatabaseUrl) { $LocalDatabaseUrl } else { Get-ProjectDatabaseUrl '' }
$localName = Get-DatabaseNameFromUrl $localUrl

if ($stagingName -notmatch '(stage|staging)' -and $ConfirmTarget -ne 'STAGING') {
  throw "Restore refused: database '$stagingName' must contain stage/staging, or pass -ConfirmTarget STAGING explicitly."
}
if ($StagingDatabaseUrl -eq $localUrl -or $stagingName -eq $localName) {
  throw 'Restore refused: the staging target matches the configured local database.'
}

$manifestPath = "$resolvedBackup.sha256"
if (Test-Path -LiteralPath $manifestPath) {
  $expectedHash = ((Get-Content -LiteralPath $manifestPath -Raw).Trim() -split '\s+')[0]
  $actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedBackup).Hash
  if ($expectedHash -ne $actualHash) { throw 'Restore refused: the backup SHA-256 hash does not match its manifest.' }
}

$pgRestore = Find-PostgresTool 'pg_restore'
$psql = Find-PostgresTool 'psql'
$cliStagingUrl = Convert-ToPostgresCliUrl $StagingDatabaseUrl

& $pgRestore --list $resolvedBackup | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'The selected file is not a readable PostgreSQL custom backup.' }

Write-Output "Replacing data in isolated staging database: $stagingName"
& $pgRestore --clean --if-exists --no-owner --no-privileges --dbname=$cliStagingUrl $resolvedBackup
if ($LASTEXITCODE -ne 0) { throw 'The staging database restore failed.' }

$verification = & $psql $cliStagingUrl --tuples-only --no-align --command="SELECT (SELECT COUNT(*) FROM colleges) || ' colleges, ' || (SELECT COUNT(*) FROM cutoffs) || ' cutoffs';"
if ($LASTEXITCODE -ne 0) { throw 'The restore finished, but database verification failed.' }

Write-Output "Staging restore passed: $(($verification -join '').Trim())"
