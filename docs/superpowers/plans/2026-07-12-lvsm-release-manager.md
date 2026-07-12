# LVSM Release Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um comando PowerShell seguro para criar, validar, publicar e reverter a release de lançamento do site LVSM.

**Architecture:** Um único script `tools/release.ps1` concentra configuração, validações Git, apresentação e dispatcher de comandos. Um wrapper `lvsm-release.cmd` encaminha argumentos para o script sem duplicar lógica.

**Tech Stack:** PowerShell 5.1+, Git CLI, Windows CMD wrapper.

## Global Constraints

- Repositório esperado: `lgtc2730/livesantamaria-site`.
- Source branch: `lab`.
- Target branch: `main`.
- Release branch: `release/launch-2026-07-15`.
- Pre-launch tag: `pre-launch-2026-07-15`.
- Launch tag: `launch-2026-07-15`.
- Nunca usar `git push --force`; usar `--force-with-lease`.
- `publish` exige `PUBLICAR`; `rollback` exige `REVERTER`.
- `-DryRun` não altera refs, tags ou ficheiros.

---

### Task 1: Esqueleto, ajuda e validações básicas

**Files:**
- Create: `tools/release.ps1`

**Interfaces:**
- Consumes: Git CLI disponível no `PATH`.
- Produces: comandos `help` e `check`; funções `Invoke-Git`, `Assert-GitRepository`, `Assert-CleanWorkingTree`, `Assert-ExpectedRemote`.

- [ ] **Step 1: Criar parser e configuração**

Usar:

```powershell
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
```

- [ ] **Step 2: Implementar execução Git com erro explícito**

```powershell
function Invoke-Git {
    param(
        [Parameter(Mandatory)]
        [string[]]$Arguments,
        [switch]$AllowFailure
    )

    $output = & git @Arguments 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "git $($Arguments -join ' ') falhou:`n$($output -join [Environment]::NewLine)"
    }

    return [pscustomobject]@{
        ExitCode = $exitCode
        Output   = @($output)
    }
}
```

- [ ] **Step 3: Implementar cabeçalho, ajuda e estados**

Criar `Show-Header`, `Show-Help`, `Write-StepOk`, `Write-StepError` e `Stop-Release`.

- [ ] **Step 4: Implementar validações básicas**

```powershell
function Assert-GitRepository {
    $result = Invoke-Git -Arguments @('rev-parse', '--is-inside-work-tree')
    if (($result.Output -join '').Trim() -ne 'true') {
        throw 'A pasta atual não é um repositório Git.'
    }
}

function Assert-CleanWorkingTree {
    $result = Invoke-Git -Arguments @('status', '--porcelain')
    if ($result.Output.Count -gt 0) {
        throw 'A working tree tem alterações. Faça commit ou stash antes de continuar.'
    }
}
```

`Assert-ExpectedRemote` deve aceitar URLs HTTPS e SSH que terminem em `lgtc2730/livesantamaria-site` com ou sem `.git`.

- [ ] **Step 5: Implementar `check` básico**

O comando deve validar Git, working tree e remoto, mostrar o branch atual e terminar com `Repository ready.`.

- [ ] **Step 6: Testar manualmente**

Run:

```powershell
.\tools\release.ps1
.\tools\release.ps1 help
.\tools\release.ps1 check
```

Expected:
- ajuda nos dois primeiros comandos;
- `check` termina com código 0 no repositório correto e limpo.

- [ ] **Step 7: Commit**

```powershell
git add tools/release.ps1
git commit -m "Add LVSM release manager skeleton"
```

---

### Task 2: Criar e validar branch release

**Files:**
- Modify: `tools/release.ps1`

**Interfaces:**
- Consumes: funções da Task 1.
- Produces: `Invoke-Create`, `Invoke-Check`, `Get-RefCommit`, `Assert-RefExists`, `Update-Origin`.

- [ ] **Step 1: Implementar atualização segura do remoto**

```powershell
function Update-Origin {
    Invoke-Git -Arguments @('fetch', 'origin', '--prune', '--tags') | Out-Null
}
```

- [ ] **Step 2: Implementar leitura de refs**

```powershell
function Get-RefCommit {
    param([Parameter(Mandatory)][string]$Ref)
    $result = Invoke-Git -Arguments @('rev-parse', '--verify', $Ref)
    return ($result.Output -join '').Trim()
}
```

- [ ] **Step 3: Implementar `create` idempotente**

Regras:
- branch atual tem de ser `lab`;
- `lab` local tem de coincidir com `origin/lab`;
- se release local/remoto existir no mesmo commit, terminar com sucesso;
- se existir noutro commit, abortar;
- se não existir, criar e publicar com:

```powershell
git branch release/launch-2026-07-15 <labCommit>
git push -u origin release/launch-2026-07-15
```

- [ ] **Step 4: Expandir `check`**

Mostrar commits curtos e mensagens de:
- `lab`;
- `origin/lab`;
- release local;
- `origin/release/launch-2026-07-15`;
- `origin/main`;
- `pre-launch-2026-07-15`.

Abortar se release local e remoto divergirem ou se a tag pré-lançamento não apontar para `origin/main` antes da primeira publicação.

- [ ] **Step 5: Testar `create` sem publicar código**

Run após a última atualização prevista de câmaras:

```powershell
.\tools\release.ps1 create
.\tools\release.ps1 check
```

Expected: release local/remoto no mesmo commit de `lab` e estado `READY`.

- [ ] **Step 6: Commit**

```powershell
git add tools/release.ps1
git commit -m "Add release creation and validation"
```

---

### Task 3: Publicação com Dry Run e confirmação

**Files:**
- Modify: `tools/release.ps1`

**Interfaces:**
- Consumes: validações completas da Task 2.
- Produces: `Invoke-Publish`, `Confirm-Action`, `Show-PublishPlan`.

- [ ] **Step 1: Implementar confirmação textual**

```powershell
function Confirm-Action {
    param(
        [Parameter(Mandatory)][string]$ExpectedText,
        [Parameter(Mandatory)][string]$Prompt
    )

    $answer = Read-Host $Prompt
    if ($answer -cne $ExpectedText) {
        throw "Confirmação inválida. Operação cancelada."
    }
}
```

- [ ] **Step 2: Implementar plano de publicação**

Mostrar:
- commit atual de `origin/main`;
- commit do release;
- branch de destino;
- tag de lançamento;
- comandos que serão executados.

- [ ] **Step 3: Implementar `publish -DryRun`**

O modo deve executar fetch e todas as validações, mas não pode executar `switch`, `reset`, `push`, `tag` ou qualquer escrita.

Expected final:

```text
DRY RUN CONCLUÍDO
Nenhuma alteração foi efetuada.
```

- [ ] **Step 4: Implementar publicação real**

Depois de `PUBLICAR`:

```powershell
git switch main
git reset --hard <releaseCommit>
git push --force-with-lease=refs/heads/main:<observedMainCommit> origin main
git tag launch-2026-07-15 <releaseCommit>
git push origin launch-2026-07-15
```

Se a tag já existir no mesmo commit, não recriar; se apontar para outro commit, abortar.

- [ ] **Step 5: Testar Dry Run**

Run:

```powershell
.\tools\release.ps1 publish -DryRun
```

Expected:
- nenhuma mudança em `git status`, refs locais, refs remotas ou tags;
- plano mostra o commit correto.

- [ ] **Step 6: Commit**

```powershell
git add tools/release.ps1
git commit -m "Add guarded release publishing"
```

---

### Task 4: Rollback seguro

**Files:**
- Modify: `tools/release.ps1`

**Interfaces:**
- Consumes: `Confirm-Action`, `Get-RefCommit`, validações Git.
- Produces: `Invoke-Rollback`.

- [ ] **Step 1: Implementar plano de rollback**

Mostrar commit atual de `origin/main` e commit da tag `pre-launch-2026-07-15`.

- [ ] **Step 2: Implementar `rollback -DryRun`**

Executar validações sem alterar refs.

- [ ] **Step 3: Implementar rollback real**

Depois de `REVERTER`:

```powershell
git switch main
git reset --hard pre-launch-2026-07-15
git push --force-with-lease=refs/heads/main:<observedMainCommit> origin main
```

Não apagar release nem tags.

- [ ] **Step 4: Testar apenas em Dry Run antes do lançamento**

```powershell
.\tools\release.ps1 rollback -DryRun
```

Expected: plano correto e nenhuma alteração.

- [ ] **Step 5: Commit**

```powershell
git add tools/release.ps1
git commit -m "Add safe release rollback"
```

---

### Task 5: Wrapper e documentação operacional

**Files:**
- Create: `lvsm-release.cmd`
- Create: `docs/LVSM-RELEASE.md`
- Modify: `tools/release.ps1`

**Interfaces:**
- Consumes: script final.
- Produces: comando curto `lvsm-release` quando executado a partir da raiz do repositório.

- [ ] **Step 1: Criar wrapper**

```bat
@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\release.ps1" %*
exit /b %ERRORLEVEL%
```

- [ ] **Step 2: Documentar sequência operacional**

A documentação deve incluir exatamente:

```powershell
lvsm-release create
lvsm-release check
lvsm-release publish -DryRun
lvsm-release publish
lvsm-release rollback -DryRun
```

E destacar que `publish` real só deve ser executado depois da aprovação final.

- [ ] **Step 3: Verificação final**

```powershell
.\lvsm-release.cmd help
.\lvsm-release.cmd check
.\lvsm-release.cmd publish -DryRun
.\lvsm-release.cmd rollback -DryRun
```

Expected: todos terminam sem alterações destrutivas; `check` e os Dry Runs usam os refs esperados.

- [ ] **Step 4: Commit**

```powershell
git add lvsm-release.cmd tools/release.ps1 docs/LVSM-RELEASE.md
git commit -m "Document LVSM release workflow"
```
