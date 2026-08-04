# Privacy Policy v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a Política de Privacidade pública, registos internos RGPD e integração do consentimento para revisão de Luis Mesquita antes da release v2.

**Architecture:** Uma página estática autónoma contém toda a informação pública sem iniciar métricas. Documentos Markdown separados mantêm o registo de tratamentos, testes de ponderação, procedimento de direitos, revisão de fornecedores e checklist de mudança; o Site liga diretamente à Política a partir do rodapé e do painel de consentimento.

**Tech Stack:** HTML/CSS, JavaScript existente, Node.js `node:test`, Markdown, Cloudflare Pages.

## Global Constraints

- Texto público apenas em português de Portugal.
- Responsável pelo tratamento: Luis Mesquita, em nome individual.
- Responsável técnico e operacional: Luis Carreiro, em nome individual; não EPD.
- Contacto: `livesantamaria.project@gmail.com`.
- Timelapse: 3 dias de capturas, 10 vídeos diários e 4 semanais arquivados.
- Métricas: sessão de 30 minutos mediante consentimento; eventos brutos por 30 dias.
- Emails: até 12 meses após encerramento; logs técnicos controlados pelo projeto: até 14 dias.
- Não afirmar anonimato absoluto, ausência total de IP, ausência de armazenamento local ou conformidade jurídica garantida.
- Não publicar em produção, migrar D1, ativar WAF ou alterar serviços remotos neste plano.

---

### Task 1: Página pública de privacidade

**Files:**
- Create: `privacidade.html`
- Create: `tests/privacy-page.test.mjs`

**Interfaces:**
- Produces: página autónoma com âncora `#metricas`, contacto `mailto:`, versão/data e secções aprovadas; não carrega `index.html`, `timelapse.js`, HLS, audiência ou fornecedores meteorológicos.

- [ ] **Step 1: Escrever teste RED da página renderizável**

Criar `tests/privacy-page.test.mjs` que lê `privacidade.html` e valida: `lang="pt-PT"`; um único `h1`; headings para responsável, câmaras/Timelapse, métricas, emails, fornecedores, conservação e direitos; `id="metricas"`; os nomes e email aprovados; valores `3`, `10`, `4`, `30 dias`, `14 dias`, `12 meses`; link CNPD; ausência de scripts de audiência/HLS e das expressões proibidas “dados anónimos”, “nenhum IP” e “conformidade garantida”.

- [ ] **Step 2: Confirmar RED**

Run: `node --test tests/privacy-page.test.mjs`

Expected: falha `ENOENT` porque `privacidade.html` ainda não existe.

- [ ] **Step 3: Criar `privacidade.html`**

Usar HTML sem dependências externas, CSS responsivo inline, `main`, navegação por secções, foco visível e link de regresso ao Site. Implementar o conteúdo integral aprovado na especificação, incluindo finalidade/fundamento, tratamento técnico de IP por fornecedores, retirada do consentimento, limitação de pesquisa de métricas pseudónimas, prazo normal de resposta de um mês e reclamação à CNPD. Definir versão `1.0` e data de entrada em vigor como a data de aprovação/publicação, não antecipar uma data ainda inexistente; até essa aprovação usar o rótulo factual `Versão para revisão — 2026-08-04` e bloquear promoção.

- [ ] **Step 4: Confirmar GREEN e suite**

Run:

```powershell
node --test tests/privacy-page.test.mjs
& npm.cmd test
git diff --check
```

- [ ] **Step 5: Commit**

```powershell
git add privacidade.html tests/privacy-page.test.mjs
git commit -m "feat: add v2 privacy policy draft"
```

### Task 2: Integração no Site e consentimento

**Files:**
- Modify: `index.html`
- Modify: `tests/audience-event.test.mjs`

**Interfaces:**
- Consumes: `privacidade.html#metricas` da Task 1.
- Produces: link de rodapé para `/privacidade.html` e link informativo no painel para `/privacidade.html#metricas`, sem transformar o link em consentimento.

- [ ] **Step 1: Escrever teste RED de navegação**

No harness real de `tests/audience-event.test.mjs`, validar que o rodapé contém um `a` com `href="./privacidade.html"`, que o painel contém `href="./privacidade.html#metricas"`, e que ativar qualquer link não chama `setAudienceConsent`, não cria `lvsm-audience-session` e não envia `/api/audience/event`.

- [ ] **Step 2: Confirmar RED**

Run: `node --experimental-vm-modules --test tests/audience-event.test.mjs`

Expected: falha porque o rodapé atual é botão e o painel não tem link informativo.

- [ ] **Step 3: Implementar links e estilos mínimos**

Substituir o botão de rodapé por uma ligação real à Política. Manter uma ação separada `Definições de métricas` que reabre o painel, porque navegar para a Política não altera consentimento. Dentro do painel, acrescentar `Saber mais na Política de Privacidade` apontando para `#metricas`. Preservar labels, foco visível e os botões equivalentes `Aceitar métricas`/`Recusar`.

- [ ] **Step 4: Confirmar GREEN e regressões**

Run:

```powershell
node --experimental-vm-modules --test tests/audience-event.test.mjs
& npm.cmd test
git diff --check
```

- [ ] **Step 5: Commit**

```powershell
git add index.html tests/audience-event.test.mjs
git commit -m "feat: link audience consent to privacy policy"
```

### Task 3: Registo interno e testes de ponderação

**Files:**
- Create: `docs/privacy/processing-register.md`
- Create: `docs/privacy/legitimate-interest-cameras.md`
- Create: `docs/privacy/legitimate-interest-security.md`

**Interfaces:**
- Produces: registo sem segredos para imagens/Timelapse, métricas, email e logs; testes de ponderação assináveis por Luis Mesquita.

- [ ] **Step 1: Criar o registo de tratamentos**

Adicionar uma tabela por tratamento com responsável, operador, finalidade, titulares, dados, fundamento, destinatários, transferência, retenção, eliminação, acesso, medidas, revisão e aprovador. Usar apenas factos aprovados; marcar decisões que dependem de aprovação de Mesquita como `Pendente de aprovação do responsável — não publicar em produção`, nunca com um marcador genérico.

- [ ] **Step 2: Criar ponderação de câmaras/Timelapse**

Documentar interesse, necessidade, alternativas, impacto, expectativas razoáveis e salvaguardas: enquadramento não identificável, ausência de áudio/biometria/seguimento, retenção `3/10/4`, contacto, resposta a incidências e revisão por câmara. Concluir condicionalmente que o tratamento só avança se Mesquita aprovar e as verificações por câmara estiverem completas.

- [ ] **Step 3: Criar ponderação de segurança/operação**

Documentar necessidade de logs mínimos, ausência deliberada de corpos/credenciais/sessões, acesso técnico restrito, retenção máxima de 14 dias e revisão após incidentes.

- [ ] **Step 4: Rever consistência e segredos**

Run:

```powershell
rg -n "Luis Mesquita|Luis Carreiro|3 dias|10|4|30 dias|14 dias|12 meses" docs/privacy
rg -n "password|passwd|token|secret|rtsp://|cookie|private key" docs/privacy
git diff --check
```

Expected: todos os valores aprovados presentes; termos sensíveis apenas como proibições/categorias, sem valores.

- [ ] **Step 5: Commit**

```powershell
git add docs/privacy/processing-register.md docs/privacy/legitimate-interest-cameras.md docs/privacy/legitimate-interest-security.md
git commit -m "docs: add v2 processing records"
```

### Task 4: Direitos, fornecedores e mudança controlada

**Files:**
- Create: `docs/privacy/data-subject-rights-procedure.md`
- Create: `docs/privacy/provider-review-2026-08.md`
- Create: `docs/privacy/privacy-change-checklist.md`

**Interfaces:**
- Consumes: registo da Task 3.
- Produces: procedimento executável, revisão datada de Cloudflare/Google/jsDelivr/Open-Meteo/SpotAzores e checklist de manutenção.

- [ ] **Step 1: Escrever procedimento de direitos**

Definir receção no email público, registo privado, âmbito, verificação proporcional, pesquisa limitada à retenção, prazo de um mês, aprovação de resposta por Mesquita, execução, comunicação de limitações e reclamação à CNPD. Para imagem exigir câmara/data/hora aproximada; para métricas explicar a impossibilidade possível de ligação individual.

- [ ] **Step 2: Rever fornecedores em fontes oficiais**

Registar, com URL e data de consulta, função, dados técnicos recebidos, região declarada, DPA/termos, subprocessadores, mecanismo de transferência e prazo conhecido/configurável para Cloudflare, Google/Gmail, jsDelivr, Open-Meteo e SpotAzores. Se uma informação não estiver publicamente verificável, escrever `Não verificado em 2026-08-04 — bloqueia a alegação e requer confirmação do responsável/fornecedor`, sem inventar.

- [ ] **Step 3: Criar checklist de mudança**

Cobrir nova/movida/removida câmara, Timelapse, prazo, fornecedor, métrica, formulário/conta/newsletter/publicidade/pagamento, incidente, pedido de direitos e mudança de responsáveis/contacto. Cada caso exige revisão de código/configuração, registo, Política, fundamento, retenção, teste e aprovação.

- [ ] **Step 4: Rever links oficiais e formatação**

Run:

```powershell
rg -n "https://|um mês|CNPD|Pendente|Não verificado" docs/privacy
git diff --check
```

- [ ] **Step 5: Commit**

```powershell
git add docs/privacy/data-subject-rights-procedure.md docs/privacy/provider-review-2026-08.md docs/privacy/privacy-change-checklist.md
git commit -m "docs: add privacy operating procedures"
```

### Task 5: Alinhamento do runbook e gate Mesquita

**Files:**
- Modify: `docs/operations/audience-v2-runbook.md`
- Modify: `docs/superpowers/specs/2026-08-04-privacy-policy-design.md` only for factual corrections discovered during implementation.

**Interfaces:**
- Produces: checklist única que bloqueia produção até Infra, política, fornecedores, logs e aprovação de Mesquita estarem comprovados.

- [ ] **Step 1: Atualizar checklist do runbook**

Marcar como concluído apenas o que tem evidência. Adicionar gates para `3/10/4` aplicado, 14 dias de logs configurados/verificados, revisão de fornecedores, testes de ponderação, links no ambiente de teste e aprovação datada de Luis Mesquita. Manter D1, Worker, WAF e produção como aprovações remotas independentes.

- [ ] **Step 2: Verificação completa local**

Run:

```powershell
& npm.cmd test
git diff --check
git status --short --branch
```

- [ ] **Step 3: Commit**

```powershell
git add docs/operations/audience-v2-runbook.md docs/superpowers/specs/2026-08-04-privacy-policy-design.md
git commit -m "docs: gate v2 on privacy approval"
```

### Task 6: Ambiente de teste e pacote de aprovação

**Files:**
- No source changes unless test evidence identifies a defect.

**Interfaces:**
- Produces: deployment `lab` verificável e pacote de revisão para Luis Mesquita; nenhuma promoção `main`.

- [ ] **Step 1: Verificação antes de push**

Run:

```powershell
& npm.cmd test
git diff --check
git status --short --branch
git log --oneline -8
```

- [ ] **Step 2: Obter autorização e publicar apenas `lab`**

Depois de autorização explícita, executar `git push origin lab`; acompanhar `livesantamaria-teste-v2` até o deployment do SHA exato ficar `Active`.

- [ ] **Step 3: Teste no endereço protegido**

Com sessão Cloudflare Access, validar desktop/mobile/teclado: Política abre; `#metricas` chega à secção; pending/recusar/aceitar/retirar funcionam; recusa não bloqueia Site; `teste.livesantamaria.org` não envia eventos.

- [ ] **Step 4: Preparar pacote para Mesquita**

Entregar: Política em revisão, registo, duas ponderações, procedimento de direitos, revisão de fornecedores, checklist, SHAs, resultados de testes e itens ainda bloqueados. Pedir aprovação explícita e datada sobre responsabilidade, finalidades, fundamentos, retenções e texto público. Não substituir essa aprovação por silêncio ou aprovação técnica de Luis Carreiro.
