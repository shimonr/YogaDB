# Shared by deploy.ps1 and upload-photos.ps1: settings from deploy\oracle\config.env (+ qa.env for
# the QA stack), SSH options, and the remote command that updates the server checkout to
# origin/$BRANCH before running a server script. Dot-source it after setting $Target.
$Root = Split-Path -Parent $PSScriptRoot
if (-not $Target) { $Target = "prod" }

$config = @{ PROJECT = "yogadb"; IMPORT_ON_DEPLOY = "0"; SEED_SAMPLE_CONTENT = "0" }
$files = @("$Root\deploy\oracle\config.env")
if ($Target -eq "qa") { $files += "$Root\deploy\oracle\qa.env" }
elseif ($Target -ne "prod") { throw "Unknown target '$Target' (use prod or qa)." }
foreach ($file in $files) {
    foreach ($line in Get-Content -LiteralPath $file) {
        if ($line -match '^\s*([A-Z_]+)=(.*)$') { $config[$Matches[1]] = $Matches[2].Trim() }
    }
}
$sshTarget = $config["SSH_TARGET"]; $app = $config["APP_DIR"]; $branch = $config["BRANCH"]
$domain = $config["DOMAIN"]; $repo = $config["REPO_URL"]

# SSH key: your default key (~\.ssh\id_ed25519 / id_rsa) or set DEPLOY_SSH_KEY to the key file path.
$sshArgs = @("-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=15")
if ($env:DEPLOY_SSH_KEY) { $sshArgs += @("-i", $env:DEPLOY_SSH_KEY, "-o", "IdentitiesOnly=yes") }

function Get-RemoteCommand([string]$ServerScript) {
    # Single-quoted so PowerShell leaves the remote shell's $ variables alone.
    $remote = 'set -e; app=__APP__; if [ ! -d $app/.git ]; then sudo mkdir -p $app; sudo chown $(id -u):$(id -g) $app; git clone -q --branch __BRANCH__ __REPO__ $app; fi; git -C $app fetch -q origin __BRANCH__; git -C $app reset -q --hard origin/__BRANCH__; REPO_URL=__REPO__ APP_DIR=$app BRANCH=__BRANCH__ DOMAIN=__DOMAIN__ PROJECT=__PROJECT__ IMPORT_ON_DEPLOY=__IMPORT__ SEED_SAMPLE_CONTENT=__SEED__ bash $app/deploy/oracle/__SCRIPT__'
    return $remote.Replace("__APP__", $app).Replace("__BRANCH__", $branch).Replace("__REPO__", $repo).Replace("__DOMAIN__", $domain).Replace("__PROJECT__", $config["PROJECT"]).Replace("__IMPORT__", $config["IMPORT_ON_DEPLOY"]).Replace("__SEED__", $config["SEED_SAMPLE_CONTENT"]).Replace("__SCRIPT__", $ServerScript)
}

function Test-PublicSite([string]$ExpectedVersion) {
    Write-Host "==> Check from here: https://$domain"
    try {
        $health = Invoke-RestMethod -Uri "https://$domain/api/health" -TimeoutSec 15
    } catch {
        throw "https://$domain is not reachable from here. Check that TCP 80 and 443 are open in the Oracle VCN security list."
    }
    if ($ExpectedVersion -and $health.version -ne $ExpectedVersion) {
        throw "https://$domain reports version $($health.version), expected $ExpectedVersion."
    }
}
