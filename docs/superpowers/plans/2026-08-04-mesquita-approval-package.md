# Mesquita Approval Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produzir um documento único e assinável para Luis Mesquita rever e decidir sobre o enquadramento de privacidade da release v2.

**Architecture:** Um documento Markdown principal resume as decisões, provas e condições e aponta para os documentos detalhados já versionados. O documento distingue aprovação de conteúdo de qualquer autorização técnica remota.

**Tech Stack:** Markdown, Git, testes Node.js existentes, script PowerShell de contrato de retenção.

## Global Constraints

- Português de Portugal e linguagem não técnica.
- Não afirmar conformidade jurídica garantida.
- Não incluir segredos, dados pessoais de visitantes ou evidência operacional em bruto.
- A aprovação não autoriza push, deployment, migration D1, Worker, WAF ou alteração remota.
- Incluir `3 dias / 10 diários / 4 semanais`, `30 dias`, `14 dias` e `12 meses`.
- Identificar Luis Mesquita como responsável e Luis Carreiro como responsável técnico e operacional, ambos em nome individual.

---

### Task 1: Documento único de decisão

**Files:**
- Create: `docs/privacy/mesquita-v2-approval-package.md`

**Interfaces:**
- Consumes: `privacidade.html`, `docs/privacy/*.md`, `docs/operations/audience-v2-runbook.md`, commit Site `dee959b` e commit Infra `69b3f6e`.
- Produces: documento autónomo para decisão, com anexos relativos e declaração assinável.

- [ ] **Step 1: Criar o documento principal**

Incluir: âmbito; funções; tabela dos quatro tratamentos; prazos; decisões sobre responsabilidade, finalidades, fundamentos, retenções e texto público; evidência local; condições pendentes; lista de anexos; declaração com opções `Aprovo`, `Aprovo com as condições abaixo` e `Não aprovo`, nome/data/observações.

- [ ] **Step 2: Verificar cobertura e ausência de segredos**

Run:

```powershell
rg -n "Luis Mesquita|Luis Carreiro|3 dias|10 diários|4 semanais|30 dias|14 dias|12 meses|Aprovo|Não aprovo|dee959b|69b3f6e" docs/privacy/mesquita-v2-approval-package.md
rg -n "password|passwd|token|secret|rtsp://|private key|account_id|database_id" docs/privacy/mesquita-v2-approval-package.md
git diff --check
```

Expected: todos os elementos de decisão e SHAs presentes; termos sensíveis apenas em proibições, sem valores.

- [ ] **Step 3: Verificar novamente as provas locais referidas**

Run no Site:

```powershell
& npm.cmd test
```

Run na Infra:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\tools\test-timelapse-retention.ps1
```

Expected: Site `66` testes aprovados; Infra `Timelapse retention contract OK: captures=3 daily=10 weekly=4`.

- [ ] **Step 4: Commit local**

```powershell
git add docs/privacy/mesquita-v2-approval-package.md
git commit -m "docs: add Mesquita v2 approval package"
```

- [ ] **Step 5: Parar antes de qualquer operação remota**

Entregar o caminho, SHA e provas ao utilizador. Não executar push ou deployment; a decisão de Luis Mesquita e cada mutação remota continuam gates separados.
