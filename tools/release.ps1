[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('help', 'create', 'check', 'publish', 'rollback')]
    [string]$Command = 'help',

    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Config = [ordered]@{
    Version       = '1.0'
    ExpectedRepo  = 'lgtc2730/livesantamaria-site'
    SourceBranch  = 'lab'
    TargetBranch  = 'main'
    ReleaseBranch = 'release/launch-2026-07-15'
    PreLaunchTag  = 'pre-launch-2026-07-15'
    LaunchTag     = 'launch-2026-07-15'
}

function Show-Header {
    Write-Host ''
    Write-Host '==============================================' -ForegroundColor Cyan
    Write-Host " Live Santa Maria Release Manager v$($Config.Version)" -ForegroundColor Cyan
    Write-Host '==============================================' -ForegroundColor Cyan
    Write-Host ''
}

function Show-Help {
    Show-Header
    Write-Host 'Usage'
    Write-Host ''
    Write-Host '  .\tools\release.ps1 create'
    Write-Host '  .\tools\release.ps1 check'
    Write-Host '  .\tools\release.ps1 publish -DryRun'
    Write-Host '  .\tools\release.ps1 publish'
    Write-Host '  .\tools\release.ps1 rollback -DryRun'
    Write-Host '  .\tools\release.ps1 rollback'
    Write-Host ''
    Write-Host 'Commands'
    Write-Host ''
    Write-Host '  create    Cria e publica o branch de release a partir de lab.'
    Write-Host '  check     Valida o estado do repositorio e da release.'
    Write-Host '  publish   Coloca a release em main.'
    Write-Host '  rollback  Reposiciona main na tag pre-launch.'
    Write-Host ''
    Write-Host 'Options'
    Write-Host ''
    Write-Host '  -DryRun   Valida e mostra o plano sem alterar refs ou tags.'
    Write-Host ''
}

function Write-StepOk {
    param(
        [Parameter(Mandatory)][int]$Number,
        [Parameter(Mandatory)][int]$Total,
        [Parameter(Mandatory)][string]$Label
    )

    Write-Host ("[{0}/{1}] {2} " -f $Number, $Total, $Label) -NoNewline
    Write-Host 'OK' -ForegroundColor Green
}

function Write-InfoLine {
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$Value
    )

    Write-Host ("{0,-18} {1}" -f ($Label + ':'), $Value)
}

function Invoke-Git {
    param(
        [Parameter(Mandatory)][string[]]$Arguments,
        [switch]$AllowFailure
    )

    $output = & git @Arguments 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0 -and -not $AllowFailure) {
        $message = ($output | ForEach-Object { $_.ToString() }) -join [Environment]::NewLine
        throw "git $($Arguments -join ' ') falhou:`n$message"
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Output   = @($output | ForEach-Object { $_.ToString() })
    }
}

function Assert-GitAvailable {
    $commandInfo = Get-Command git -ErrorAction SilentlyContinue
    if (-not $commandInfo) {
        throw 'Git nao foi encontrado no PATH.'
    }
}

function Assert-GitRepository {
    $result = Invoke-Git -Arguments @('rev-parse', '--is-inside-work-tree')
    if (($result.Output -join '').Trim() -ne 'true') {
        throw 'A pasta atual nao e um repositorio Git.'
    }
}

function Assert-CleanWorkingTree {
    $result = Invoke-Git -Arguments @('status', '--porcelain')
    if ($result.Output.Count -gt 0) {
        throw 'A working tree tem alteracoes. Faca commit ou stash antes de continuar.'
    }
}

function Get-OriginUrl {
    $result = Invoke-Git -Arguments @('remote', 'get-url', 'origin')
    return ($result.Output -join '').Trim()
}

function Assert-ExpectedRemote {
    $originUrl = Get-OriginUrl
    $normalized = $originUrl.Trim().ToLowerInvariant()
    $expected = $Config.ExpectedRepo.ToLowerInvariant()

    $valid = (
        $normalized -eq "https://github.com/$expected" -or
        $normalized -eq "https://github.com/$expected.git" -or
        $normalized -eq "git@github.com:$expected" -or
        $normalized -eq "git@github.com:$expected.git" -or
        $normalized.EndsWith("/$expected") -or
        $normalized.EndsWith("/$expected.git") -or
        $normalized.EndsWith(":$expected") -or
        $normalized.EndsWith(":$expected.git")
    )

    if (-not $valid) {
        throw "O remoto origin nao corresponde a $($Config.ExpectedRepo). Valor atual: $originUrl"
    }
}

function Get-CurrentBranch {
    $result = Invoke-Git -Arguments @('branch', '--show-current')
    return ($result.Output -join '').Trim()
}

function Update-Origin {
    Invoke-Git -Arguments @('fetch', 'origin', '--prune', '--tags') | Out-Null
}

function Test-RefExists {
    param([Parameter(Mandatory)][string]$Ref)

    $result = Invoke-Git -Arguments @('rev-parse', '--verify', '--quiet', $Ref) -AllowFailure
    return $result.ExitCode -eq 0
}

function Get-RefCommit {
    param([Parameter(Mandatory)][string]$Ref)

    $result = Invoke-Git -Arguments @('rev-parse', '--verify', $Ref)
    return ($result.Output -join '').Trim()
}

function Get-ShortCommit {
    param([Parameter(Mandatory)][string]$Ref)

    $result = Invoke-Git -Arguments @('rev-parse', '--short=8', $Ref)
    return ($result.Output -join '').Trim()
}

function Get-CommitSubject {
    param([Parameter(Mandatory)][string]$Ref)

    $result = Invoke-Git -Arguments @('log', '-1', '--format=%s', $Ref)
    return ($result.Output -join '').Trim()
}

function Get-ReleaseState {
    $refs = [ordered]@{
        SourceLocal   = $Config.SourceBranch
        SourceRemote  = "origin/$($Config.SourceBranch)"
        ReleaseLocal  = $Config.ReleaseBranch
        ReleaseRemote = "origin/$($Config.ReleaseBranch)"
        MainRemote    = "origin/$($Config.TargetBranch)"
        PreLaunchTag  = $Config.PreLaunchTag
        LaunchTag     = $Config.LaunchTag
    }

    $state = [ordered]@{}
    foreach ($entry in $refs.GetEnumerator()) {
        $exists = Test-RefExists -Ref $entry.Value
        $state[$entry.Key] = [pscustomobject]@{
            Ref     = $entry.Value
            Exists  = $exists
            Commit  = if ($exists) { Get-RefCommit -Ref $entry.Value } else { $null }
            Short   = if ($exists) { Get-ShortCommit -Ref $entry.Value } else { '-' }
            Subject = if ($exists) { Get-CommitSubject -Ref $entry.Value } else { '-' }
        }
    }

    return $state
}

function Assert-BaseState {
    Assert-GitAvailable
    Assert-GitRepository
    Assert-CleanWorkingTree
    Assert-ExpectedRemote
}

function Assert-ReleaseReady {
    param([Parameter(Mandatory)]$State)

    if (-not $State.SourceRemote.Exists) {
        throw "Nao existe origin/$($Config.SourceBranch)."
    }

    if (-not $State.ReleaseLocal.Exists) {
        throw "Nao existe o branch local $($Config.ReleaseBranch). Execute create."
    }

    if (-not $State.ReleaseRemote.Exists) {
        throw "Nao existe origin/$($Config.ReleaseBranch). Execute create."
    }

    if ($State.ReleaseLocal.Commit -ne $State.ReleaseRemote.Commit) {
        throw 'O branch release local e remoto apontam para commits diferentes.'
    }

    if (-not $State.MainRemote.Exists) {
        throw "Nao existe origin/$($Config.TargetBranch)."
    }

    if (-not $State.PreLaunchTag.Exists) {
        throw "Nao existe a tag $($Config.PreLaunchTag)."
    }
}

function Show-State {
    param([Parameter(Mandatory)]$State)

    Write-Host ''
    Write-InfoLine -Label 'Lab local' -Value "$($State.SourceLocal.Short)  $($State.SourceLocal.Subject)"
    Write-InfoLine -Label 'Lab remoto' -Value "$($State.SourceRemote.Short)  $($State.SourceRemote.Subject)"
    Write-InfoLine -Label 'Release local' -Value "$($State.ReleaseLocal.Short)  $($State.ReleaseLocal.Subject)"
    Write-InfoLine -Label 'Release remoto' -Value "$($State.ReleaseRemote.Short)  $($State.ReleaseRemote.Subject)"
    Write-InfoLine -Label 'Main remoto' -Value "$($State.MainRemote.Short)  $($State.MainRemote.Subject)"
    Write-InfoLine -Label 'Pre-launch tag' -Value "$($State.PreLaunchTag.Short)  $($State.PreLaunchTag.Subject)"
    Write-InfoLine -Label 'Launch tag' -Value "$($State.LaunchTag.Short)  $($State.LaunchTag.Subject)"
    Write-Host ''
}

function Confirm-Action {
    param(
        [Parameter(Mandatory)][string]$ExpectedText,
        [Parameter(Mandatory)][string]$Prompt
    )

    $answer = Read-Host $Prompt
    if ($answer -cne $ExpectedText) {
        throw 'Confirmacao invalida. Operacao cancelada.'
    }
}

function Invoke-Check {
    Show-Header
    $total = 6

    Assert-GitAvailable
    Write-StepOk 1 $total 'Git'

    Assert-GitRepository
    Write-StepOk 2 $total 'Repository'

    Assert-CleanWorkingTree
    Write-StepOk 3 $total 'Working Tree'

    Assert-ExpectedRemote
    Write-StepOk 4 $total 'Remote'

    Update-Origin
    Write-StepOk 5 $total 'Fetch'

    $state = Get-ReleaseState
    Assert-ReleaseReady -State $state
    Write-StepOk 6 $total 'Release State'

    Show-State -State $state
    Write-Host 'READY' -ForegroundColor Green
}

function Invoke-Create {
    Show-Header
    Assert-BaseState

    $currentBranch = Get-CurrentBranch
    if ($currentBranch -ne $Config.SourceBranch) {
        throw "O comando create tem de ser executado no branch $($Config.SourceBranch). Branch atual: $currentBranch"
    }

    Update-Origin
    $state = Get-ReleaseState

    if (-not $state.SourceRemote.Exists) {
        throw "Nao existe origin/$($Config.SourceBranch)."
    }

    if ($state.SourceLocal.Commit -ne $state.SourceRemote.Commit) {
        throw "$($Config.SourceBranch) local nao coincide com origin/$($Config.SourceBranch)."
    }

    $sourceCommit = $state.SourceLocal.Commit

    if ($state.ReleaseLocal.Exists -and $state.ReleaseLocal.Commit -ne $sourceCommit) {
        throw "O branch local $($Config.ReleaseBranch) ja existe noutro commit."
    }

    if ($state.ReleaseRemote.Exists -and $state.ReleaseRemote.Commit -ne $sourceCommit) {
        throw "O branch remoto origin/$($Config.ReleaseBranch) ja existe noutro commit."
    }

    if (-not $state.ReleaseLocal.Exists) {
        Invoke-Git -Arguments @('branch', $Config.ReleaseBranch, $sourceCommit) | Out-Null
        Write-StepOk 1 2 'Release local criada'
    }
    else {
        Write-StepOk 1 2 'Release local ja existe'
    }

    if (-not $state.ReleaseRemote.Exists) {
        Invoke-Git -Arguments @('push', '-u', 'origin', $Config.ReleaseBranch) | Out-Null
        Write-StepOk 2 2 'Release remota publicada'
    }
    else {
        Write-StepOk 2 2 'Release remota ja existe'
    }

    Write-Host ''
    Write-InfoLine -Label 'Release' -Value $Config.ReleaseBranch
    Write-InfoLine -Label 'Commit' -Value "$(Get-ShortCommit -Ref $sourceCommit)  $(Get-CommitSubject -Ref $sourceCommit)"
    Write-Host ''
    Write-Host 'Release criada e pronta para validacao.' -ForegroundColor Green
}

function Show-PublishPlan {
    param([Parameter(Mandatory)]$State)

    Write-Host ''
    Write-Host 'Plano de publicacao' -ForegroundColor Yellow
    Write-Host '-------------------' -ForegroundColor Yellow
    Write-InfoLine -Label 'Origem' -Value $Config.ReleaseBranch
    Write-InfoLine -Label 'Destino' -Value "origin/$($Config.TargetBranch)"
    Write-InfoLine -Label 'Main atual' -Value $State.MainRemote.Short
    Write-InfoLine -Label 'Release' -Value $State.ReleaseRemote.Short
    Write-InfoLine -Label 'Tag' -Value $Config.LaunchTag
    Write-Host ''
    Write-Host 'Comandos previstos:'
    Write-Host "  git switch $($Config.TargetBranch)"
    Write-Host "  git reset --hard $($State.ReleaseRemote.Commit)"
    Write-Host "  git push --force-with-lease=refs/heads/$($Config.TargetBranch):$($State.MainRemote.Commit) origin $($Config.TargetBranch)"
    Write-Host "  git tag $($Config.LaunchTag) $($State.ReleaseRemote.Commit)"
    Write-Host "  git push origin $($Config.LaunchTag)"
    Write-Host ''
}

function Invoke-Publish {
    Show-Header
    Assert-BaseState
    Update-Origin

    $state = Get-ReleaseState
    Assert-ReleaseReady -State $state

    if ($state.LaunchTag.Exists -and $state.LaunchTag.Commit -ne $state.ReleaseRemote.Commit) {
        throw "A tag $($Config.LaunchTag) ja existe noutro commit."
    }

    Show-State -State $state
    Show-PublishPlan -State $state

    if ($DryRun) {
        Write-Host 'DRY RUN CONCLUIDO' -ForegroundColor Cyan
        Write-Host 'Nenhuma alteracao foi efetuada.' -ForegroundColor Cyan
        return
    }

    Confirm-Action -ExpectedText 'PUBLICAR' -Prompt 'Escreva PUBLICAR para colocar esta release em producao'

    Invoke-Git -Arguments @('switch', $Config.TargetBranch) | Out-Null
    Invoke-Git -Arguments @('reset', '--hard', $state.ReleaseRemote.Commit) | Out-Null
    Invoke-Git -Arguments @(
        'push',
        "--force-with-lease=refs/heads/$($Config.TargetBranch):$($state.MainRemote.Commit)",
        'origin',
        $Config.TargetBranch
    ) | Out-Null
    Write-StepOk 1 2 'Main publicado'

    if (-not $state.LaunchTag.Exists) {
        Invoke-Git -Arguments @('tag', $Config.LaunchTag, $state.ReleaseRemote.Commit) | Out-Null
        Invoke-Git -Arguments @('push', 'origin', $Config.LaunchTag) | Out-Null
        Write-StepOk 2 2 'Tag publicada'
    }
    else {
        Write-StepOk 2 2 'Tag ja existente'
    }

    Write-Host ''
    Write-Host "PRODUCAO ATUALIZADA: $($state.ReleaseRemote.Short)" -ForegroundColor Green
}

function Show-RollbackPlan {
    param([Parameter(Mandatory)]$State)

    Write-Host ''
    Write-Host 'Plano de rollback' -ForegroundColor Yellow
    Write-Host '-----------------' -ForegroundColor Yellow
    Write-InfoLine -Label 'Main atual' -Value $State.MainRemote.Short
    Write-InfoLine -Label 'Destino' -Value "$($Config.PreLaunchTag) ($($State.PreLaunchTag.Short))"
    Write-Host ''
    Write-Host 'Comandos previstos:'
    Write-Host "  git switch $($Config.TargetBranch)"
    Write-Host "  git reset --hard $($Config.PreLaunchTag)"
    Write-Host "  git push --force-with-lease=refs/heads/$($Config.TargetBranch):$($State.MainRemote.Commit) origin $($Config.TargetBranch)"
    Write-Host ''
}

function Invoke-Rollback {
    Show-Header
    Assert-BaseState
    Update-Origin

    $state = Get-ReleaseState

    if (-not $state.MainRemote.Exists) {
        throw "Nao existe origin/$($Config.TargetBranch)."
    }

    if (-not $state.PreLaunchTag.Exists) {
        throw "Nao existe a tag $($Config.PreLaunchTag)."
    }

    Show-RollbackPlan -State $state

    if ($DryRun) {
        Write-Host 'DRY RUN CONCLUIDO' -ForegroundColor Cyan
        Write-Host 'Nenhuma alteracao foi efetuada.' -ForegroundColor Cyan
        return
    }

    Confirm-Action -ExpectedText 'REVERTER' -Prompt 'Escreva REVERTER para repor a versao pre-launch'

    Invoke-Git -Arguments @('switch', $Config.TargetBranch) | Out-Null
    Invoke-Git -Arguments @('reset', '--hard', $Config.PreLaunchTag) | Out-Null
    Invoke-Git -Arguments @(
        'push',
        "--force-with-lease=refs/heads/$($Config.TargetBranch):$($state.MainRemote.Commit)",
        'origin',
        $Config.TargetBranch
    ) | Out-Null

    Write-Host ''
    Write-Host "ROLLBACK CONCLUIDO: $($state.PreLaunchTag.Short)" -ForegroundColor Green
}

try {
    switch ($Command) {
        'help'     { Show-Help }
        'create'   { Invoke-Create }
        'check'    { Invoke-Check }
        'publish'  { Invoke-Publish }
        'rollback' { Invoke-Rollback }
        default    { Show-Help }
    }
}
catch {
    Write-Host ''
    Write-Host 'ERRO' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ''
    exit 1
}
