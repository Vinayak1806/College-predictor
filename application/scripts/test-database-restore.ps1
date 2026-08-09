param(
  [Parameter(Mandatory)][string]$BackupPath,
  [Parameter(Mandatory)][string]$TestDatabaseUrl,
  [string]$LiveDatabaseUrl = ''
)

. (Join-Path $PSScriptRoot 'database-tools.ps1')

$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
$testName = Get-DatabaseNameFromUrl $TestDatabaseUrl
$cliTestDatabaseUrl = Convert-ToPostgresCliUrl $TestDatabaseUrl
$liveUrl = if ($LiveDatabaseUrl) { $LiveDatabaseUrl } else { Get-ProjectDatabaseUrl '' }
$liveName = Get-DatabaseNameFromUrl $liveUrl

if ($TestDatabaseUrl -eq $liveUrl -or $testName -eq $liveName) {
  throw 'Restore test refused: the test database matches the live development database.'
}
if ($testName -notmatch '(test|restore|backup)') {
  throw "Restore test refused: database '$testName' must contain test, restore, or backup in its name."
}

$pgRestore = Find-PostgresTool 'pg_restore'
$psql = Find-PostgresTool 'psql'
& $pgRestore --clean --if-exists --no-owner --no-privileges --dbname=$cliTestDatabaseUrl $resolvedBackup
if ($LASTEXITCODE -ne 0) { throw 'Restore test failed while loading the archive.' }

$verification = & $psql $cliTestDatabaseUrl --tuples-only --no-align --command="SELECT CASE WHEN to_regclass('public.colleges') IS NOT NULL AND to_regclass('public.cutoffs') IS NOT NULL THEN 'READY' ELSE 'MISSING' END;"
if ($LASTEXITCODE -ne 0 -or ($verification -join '').Trim() -ne 'READY') {
  throw 'Restore completed, but required application tables were not found.'
}

Write-Output "Restore test passed in isolated database: $testName"
