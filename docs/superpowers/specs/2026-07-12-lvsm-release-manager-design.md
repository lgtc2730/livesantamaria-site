# LVSM Release Manager — Design

## Objetivo

Criar uma ferramenta PowerShell segura e repetível para preparar, validar, publicar e reverter releases do site Live Santa Maria.

## Comando

Ficheiro principal:

```text
tools/release.ps1
```

Comandos:

```powershell
.\tools\release.ps1 create
.\tools\release.ps1 check
.\tools\release.ps1 publish -DryRun
.\tools\release.ps1 publish
.\tools\release.ps1 rollback -DryRun
.\tools\release.ps1 rollback
```

Wrapper futuro imediato:

```text
lvsm-release.cmd
```

O wrapper apenas encaminha argumentos para `tools/release.ps1`.

## Configuração fixa da release inicial

```text
SourceBranch  = lab
TargetBranch  = main
ReleaseBranch = release/launch-2026-07-15
PreLaunchTag  = pre-launch-2026-07-15
LaunchTag     = launch-2026-07-15
ExpectedRepo  = lgtc2730/livesantamaria-site
```

## Regras de segurança

- Nunca publicar com working tree suja.
- Nunca usar `git push --force`; usar apenas `git push --force-with-lease`.
- Nunca alterar `main` sem confirmação textual explícita.
- `publish` exige `PUBLICAR`.
- `rollback` exige `REVERTER`.
- `-DryRun` executa todas as validações e mostra as ações, mas não altera refs, tags ou ficheiros.
- O remoto `origin` tem de apontar para `lgtc2730/livesantamaria-site`.
- O branch release local e remoto têm de apontar para o mesmo commit.
- O `main` remoto tem de continuar no commit esperado antes da promoção.
- Tags existentes só são aceites quando apontam para o commit esperado.
- Qualquer comando Git com erro aborta imediatamente.

## Comportamento

### `create`

1. Validar repositório, remoto e working tree.
2. Confirmar que o branch atual é `lab`.
3. Executar `git fetch origin --prune --tags`.
4. Confirmar que `lab` local coincide com `origin/lab`.
5. Criar `release/launch-2026-07-15` no commit atual de `lab`.
6. Publicar o branch release em `origin`.
7. Se o release já existir e apontar para o mesmo commit, terminar com sucesso sem recriar.

### `check`

1. Executar todas as validações sem alterar o repositório.
2. Mostrar commits de `lab`, release e `main`.
3. Confirmar proteção pela tag `pre-launch-2026-07-15`.
4. Confirmar que release local e remoto coincidem.
5. Mostrar estado `READY` ou os bloqueios encontrados.

### `publish`

1. Executar as validações de `check`.
2. Mostrar origem, destino, commit e tag.
3. Em `-DryRun`, mostrar os comandos previstos e terminar sem alterações.
4. Em modo real, exigir `PUBLICAR`.
5. Atualizar o `main` local para o commit do release.
6. Publicar com `--force-with-lease` usando o commit remoto de `main` observado após `fetch`.
7. Criar e publicar `launch-2026-07-15`.
8. Mostrar o commit final publicado.

### `rollback`

1. Validar a tag `pre-launch-2026-07-15`.
2. Mostrar commit atual e commit de destino.
3. Em `-DryRun`, não alterar nada.
4. Em modo real, exigir `REVERTER`.
5. Atualizar `main` para a tag pré-lançamento com `--force-with-lease`.
6. Não apagar o release nem a tag de lançamento.

## Interface

A ferramenta usa um cabeçalho consistente com as restantes ferramentas LVSM e estados claros:

```text
==============================================
 Live Santa Maria Release Manager v1.0
==============================================

[1/6] Repository ............. OK
[2/6] Working Tree ........... OK
[3/6] Release Branch ......... OK
[4/6] Main Protection ........ OK
[5/6] Publishing ............. OK
[6/6] Tagging ................ OK
```

Em caso de falha, apresenta a etapa, a causa e termina com código diferente de zero.

## Fora de âmbito

- Testes HTTP ao site, câmaras ou Cloudflare.
- Deploy manual no Cloudflare Pages.
- Refatoração da futura CLI única `lvsm`.
- Gestão genérica de múltiplas datas de release nesta primeira versão.
