# LVSM Release Manager v1.0

Ferramenta operacional para preparar, validar, publicar e reverter releases do site Live Santa Maria.

## Comando

A partir da raiz do repositório:

```powershell
.\lvsm-release.cmd help
```

Também pode ser chamado diretamente:

```powershell
.\tools\release.ps1 help
```

## Release de lançamento

```text
Origem:       lab
Release:      release/launch-2026-07-15
Produção:     main
Proteção:     pre-launch-2026-07-15
Tag final:    launch-2026-07-15
```

## Sequência operacional

### 1. Fechar e validar o `lab`

Depois da última câmara e das últimas correções previstas:

```powershell
git switch lab
git pull --ff-only origin lab
git status
```

A working tree tem de estar limpa.

### 2. Criar o candidato de lançamento

```powershell
.\lvsm-release.cmd create
```

Este comando cria e publica:

```text
release/launch-2026-07-15
```

no mesmo commit do `lab`.

### 3. Verificar a release

```powershell
.\lvsm-release.cmd check
```

O resultado esperado termina em:

```text
READY
```

### 4. Ensaiar a entrada em produção

```powershell
.\lvsm-release.cmd publish -DryRun
```

O Dry Run executa as validações e mostra os comandos previstos, mas não altera branches, refs ou tags.

O resultado esperado termina em:

```text
DRY RUN CONCLUIDO
Nenhuma alteracao foi efetuada.
```

### 5. Entrada em produção

Somente depois da aprovação final:

```powershell
.\lvsm-release.cmd publish
```

O comando apresenta o plano e exige:

```text
PUBLICAR
```

O `main` passa a apontar exatamente para o commit do release e é criada a tag:

```text
launch-2026-07-15
```

### 6. Ensaio do rollback

Antes do lançamento, validar também:

```powershell
.\lvsm-release.cmd rollback -DryRun
```

### 7. Rollback real

Usar apenas se houver um problema crítico após a publicação:

```powershell
.\lvsm-release.cmd rollback
```

O comando exige:

```text
REVERTER
```

O `main` regressa ao commit protegido pela tag:

```text
pre-launch-2026-07-15
```

O branch release e as tags não são apagados.

## Proteções

- working tree obrigatoriamente limpa;
- validação do repositório remoto;
- comparação entre release local e remoto;
- confirmação textual explícita;
- `--force-with-lease` com o commit observado de `origin/main`;
- interrupção imediata se algum comando Git falhar;
- Dry Run sem alterações destrutivas.

## Nota operacional

O Release Manager trata apenas da promoção Git. A validação HTTP do site, câmaras, Cloudflare e cache continua a fazer parte da checklist operacional de lançamento.
