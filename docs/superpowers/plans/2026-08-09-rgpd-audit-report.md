# RGPD Audit Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auditar a solução Live Santa Maria v2 contra o RGPD e produzir um relatório simples, fundamentado e idêntico em Word e PDF para Luís Mesquita.

**Architecture:** A auditoria cruza evidência versionada dos repositórios e verificações públicas com fontes oficiais. Um documento-fonte temporário é revisto antes de ser convertido pelo Microsoft Word em `.docx` e `.pdf`; apenas os dois entregáveis finais permanecem no arquivo jurídico privado.

**Tech Stack:** Git/PowerShell para recolha read-only, fontes oficiais EUR-Lex/CNPD/CEPD/Comissão Europeia, HTML temporário, Microsoft Word para conversão DOCX/PDF.

## Global Constraints

- Linguagem portuguesa corrente, destinada a uma pessoa não técnica.
- Não declarar “100% conforme”, certificação ou parecer jurídico.
- Distinguir factos comprovados, declarações por verificar e recomendações.
- Não incluir segredos, IDs internos, URLs privadas, linhas D1, imagens identificáveis ou conteúdo desnecessário dos PDFs assinados.
- Classificar cada área como Verde, Amarelo ou Vermelho.
- Definir por extenso Avaliação de Impacto sobre a Proteção de Dados (AIPD) antes de usar a sigla.
- Guardar apenas os entregáveis finais em `LiveSantaMaria_local\Legal\Privacidade\Auditoria_RGPD`, fora de Git.

---

### Task 1: Matriz de evidência e critérios jurídicos

**Files:**
- Read: `privacidade.html`
- Read: `docs/privacy/*.md`
- Read: `docs/operations/audience-v2-runbook.md`
- Read: `index.html`
- Read: `functions/api/audience/*.js`
- Read: `workers/audience-retention/**`
- Read: documentos operacionais relevantes em `livesantamaria-pwa`, `livesantamaria-control-api` e `livesantamaria-infra`

**Interfaces:**
- Consumes: implementação e registos atuais, sem mutação.
- Produces: matriz interna `requisito → evidência → estado → ação` usada na redação.

- [ ] **Step 1: Inventariar tratamentos e fluxos**

Registar separadamente câmaras/direto, Timelapse, métricas, email e logs. Para
cada tratamento, identificar finalidade, dados, fundamento, destinatários,
retenção, acesso, direitos e medidas de segurança.

- [ ] **Step 2: Recolher fontes oficiais atuais**

Usar apenas fontes primárias: RGPD no EUR-Lex; CNPD sobre videovigilância,
cookies, AIPD, direitos e violações; CEPD sobre vídeo e corresponsabilidade;
Comissão Europeia sobre transferências e cláusulas contratuais-tipo.

- [ ] **Step 3: Avaliar artigo a artigo por tema**

Aplicar pelo menos: princípios e responsabilidade (artigos 5.º e 24.º),
licitude/consentimento (6.º e 7.º), transparência (12.º–14.º), direitos
(15.º–22.º), corresponsabilidade (26.º), subcontratação (28.º), registo (30.º),
segurança e incidentes (32.º–34.º), AIPD (35.º–36.º) e transferências
(44.º–49.º).

- [ ] **Step 4: Decidir a posição sobre AIPD**

Confrontar escala, monitorização sistemática de zonas públicas, divulgação em
direto, Timelapse, possibilidade de identificação e salvaguardas. Emitir uma
conclusão explícita: obrigatória, recomendável ou dispensável; separar a
conclusão jurídica da recomendação prudencial.

### Task 2: Redação e revisão do relatório

**Files:**
- Create temporarily: `.tmp-rgpd-audit/Auditoria_RGPD_Live_Santa_Maria_v2.html`

**Interfaces:**
- Consumes: matriz e fontes da Task 1.
- Produces: documento-fonte completo e validado para conversão.

- [ ] **Step 1: Redigir o resumo executivo**

Começar por uma conclusão curta: estado geral, pontos fortes, principais
pendentes e ausência/presença de risco que justifique suspensão imediata.

- [ ] **Step 2: Redigir as nove áreas e plano de ação**

Usar a estrutura aprovada. Para cada finding incluir estado, o que significa em
linguagem corrente, evidência, risco e ação. O plano final deve indicar
prioridade, responsável predominante e prazo sugerido, sem transformar a
distribuição operacional em exclusão de corresponsabilidade.

- [ ] **Step 3: Incluir fontes e ressalva**

Adicionar hiperligações diretas às fontes oficiais e a nota de que a auditoria
é prática/técnica-organizacional e não substitui aconselhamento jurídico.

- [ ] **Step 4: Rever consistência e privacidade**

Procurar contradições com a Política, estados desatualizados, afirmações
absolutas, jargão não explicado e qualquer conteúdo proibido. Confirmar que
Word e PDF não revelarão paths privados nem metadados desnecessários.

### Task 3: Gerar e validar Word/PDF privados

**Files:**
- Create: `C:\Users\luisc\OneDrive\LiveSantaMaria_local\Legal\Privacidade\Auditoria_RGPD\Auditoria_RGPD_Live_Santa_Maria_v2.docx`
- Create: `C:\Users\luisc\OneDrive\LiveSantaMaria_local\Legal\Privacidade\Auditoria_RGPD\Auditoria_RGPD_Live_Santa_Maria_v2.pdf`
- Delete after conversion: `.tmp-rgpd-audit/`

**Interfaces:**
- Consumes: HTML validado da Task 2.
- Produces: dois documentos finais com o mesmo conteúdo e data.

- [ ] **Step 1: Criar a pasta privada e converter**

Usar Microsoft Word em modo não visível para abrir o HTML, guardar DOCX e
exportar PDF. Não abrir janelas interativas nem guardar o HTML no arquivo final.

- [ ] **Step 2: Validar os dois ficheiros**

Confirmar existência, tamanho não zero, título, data, número de páginas e texto
extraído das secções Resumo, AIPD, Plano de ação e Fontes. Comparar que ambos
contêm a mesma versão do relatório.

- [ ] **Step 3: Limpar o temporário e verificar Git**

Eliminar apenas `.tmp-rgpd-audit` após confirmar os entregáveis. Provar que
nenhum DOCX/PDF/path privado está versionado ou pendente nos repositórios.

- [ ] **Step 4: Entregar**

Fornecer links locais para Word e PDF, síntese do parecer e lista curta de ações
prioritárias. Não fazer push do relatório privado.
