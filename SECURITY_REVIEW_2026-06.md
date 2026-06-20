# Revisão de Segurança — Live Santa Maria Site

Data: 20 de junho de 2026
Repositório: `livesantamaria-site`
Revisão: `a4a4d816c3b7098a73325fadc3c44886f41ce85c` (`lab`)
Âmbito: frontend público, Cloudflare Pages Functions, timelapse, páginas arquivadas e snapshot de infraestrutura.

## Sumário executivo

A auditoria Codex Security cobriu integralmente os 21 ficheiros de código e configuração selecionados pelo inventário determinístico. Todos receberam revisão integral e os 18 candidatos iniciais foram sujeitos a validação e análise de caminho de ataque.

Resultado final:

- 0 vulnerabilidades críticas;
- 0 vulnerabilidades altas;
- 7 instâncias de severidade média;
- nenhuma credencial ativa encontrada;
- nenhum DOM XSS, SSRF controlável pelo visitante, bypass de autenticação ou injeção em base de dados confirmado.

As sete instâncias concentram-se em dois problemas:

1. o endpoint público de timelapse expõe a árvore operacional, incluindo diretórios de scripts, logs e capturas;
2. a página principal e cinco páginas arquivadas públicas executam `hls.js@latest` diretamente de um CDN, sem versão imutável nem Subresource Integrity.

### Decisão para v1.0

**Lançamento condicionado.** Não se recomenda declarar a v1.0 pronta para exposição pública antes de fechar os dois controlos obrigatórios:

- separar a árvore operacional da raiz HTTP pública do timelapse;
- fixar e proteger a dependência HLS em todas as páginas que continuarem publicadas.

Não há evidência de comprometimento atual. Os problemas aumentam a superfície de exposição e o risco de cadeia de fornecimento.

## Metodologia e cobertura

O workflow foi executado em quatro fases distintas:

1. modelo de ameaças;
2. descoberta exaustiva;
3. validação por instância;
4. análise de caminhos de ataque e severidade.

Validação adicional, somente leitura, confirmou no serviço público:

- HTTP 200 em `/scripts/`;
- HTTP 200 e `Content-Type: text/x-sh` em `/scripts/smart-capture.sh`;
- HTTP 200 em `/logs/`;
- HTTP 200 em `/captures/`;
- HTTP 200 nas cinco páginas de `old/`;
- presença de `hls.js@latest` na página principal e nas cinco páginas arquivadas;
- ausência de header CSP nas respostas verificadas.

O dossiê técnico completo encontra-se fora do repositório, em:

`C:\tmp\codex-security-scans\livesantamaria-site\a4a4d816c3b7_20260620T101726+0100`

## Resultados

| ID | Severidade | Resultado |
|---|---|---|
| SR-01 | Média | O serviço público de timelapse serve a árvore operacional completa. |
| SR-02 | Média | `index.html:9` executa `hls.js@latest` sem pin/SRI. |
| SR-03 | Média | `old/index_v1_public.html:9` repete o controlo vulnerável. |
| SR-04 | Média | `old/index_v2.1.html:9` repete o controlo vulnerável. |
| SR-05 | Média | `old/index_v2.3.html:9` repete o controlo vulnerável. |
| SR-06 | Média | `old/index_v2.5.html:9` repete o controlo vulnerável. |
| SR-07 | Média | `old/index_v2_inicial.html:9` repete o controlo vulnerável. |

### SR-01 — Publicação excessiva da árvore de timelapse

O tunnel em `infra/nodes/anjos-porto/config/cloudflared-config.yml:8-9` encaminha o hostname público para o servidor definido em `infra/nodes/anjos-porto/scripts/timelapse-http.py`. Este muda a raiz para `/var/lib/lvsm/timelapse` e usa `SimpleHTTPRequestHandler`, publicando tudo o que existir abaixo dessa árvore.

A raiz inclui material operacional para além dos artefactos públicos esperados. CORS não funciona como autenticação e não impede pedidos HTTP diretos.

Impacto confirmado: enumeração e leitura não autenticada de scripts, logs, capturas e outros ficheiros operacionais presentes na raiz. Não foi confirmada a exposição de passwords, tokens ou chaves privadas.

Correção mínima:

- criar uma raiz dedicada, por exemplo `/var/lib/lvsm/timelapse-public`;
- publicar apenas `index.json`, `thumbs/`, `daily/`, `latest/` e `weekly/`;
- manter `scripts/`, `logs/` e `captures/` fora dessa raiz;
- executar o serviço com utilizador sem privilégios;
- impedir listagem de diretórios ou implementar allowlist explícita.

### SR-02 a SR-07 — Dependência HLS flutuante

Cada instância pública carrega:

`https://cdn.jsdelivr.net/npm/hls.js@latest`

O alias `@latest` pode mudar sem alteração no repositório. Sem SRI, o browser executa os bytes devolvidos pelo fornecedor com autoridade de script da página.

Exploração requer comprometimento ou alteração maliciosa da cadeia npm/CDN, o que reduz a probabilidade; o impacto potencial continua a ser execução arbitrária de JavaScript para visitantes.

Correção mínima:

- escolher e registar uma versão HLS.js auditada;
- preferir alojamento local do ficheiro exato;
- se o CDN for mantido, usar URL imutável, `integrity` e `crossorigin`;
- adicionar CSP restritiva;
- remover `old/` da publicação se essas páginas não forem necessárias.

## Checklist de correção para v1.0

### Obrigatório antes do lançamento

- [ ] Criar uma raiz HTTP exclusivamente pública para o timelapse.
- [ ] Retirar `scripts/`, `logs/` e capturas internas da raiz publicada.
- [ ] Confirmar que `/scripts/`, `/logs/` e `/captures/` devolvem 404.
- [ ] Executar o servidor HTTP de timelapse com utilizador sem privilégios.
- [ ] Desativar listagem de diretórios ou aplicar allowlist de caminhos.
- [ ] Fixar uma versão imutável de HLS.js na página principal.
- [ ] Autoalojar HLS.js ou configurar SRI e `crossorigin`.
- [ ] Remover `old/` do deployment ou corrigir individualmente as cinco páginas.
- [ ] Adicionar um teste que falhe perante `hls.js@latest`.
- [ ] Adicionar um teste que falhe se caminhos operacionais forem publicados.

### Hardening recomendado para v1.0

- [ ] Implementar CSP compatível com os scripts e origens realmente necessários.
- [ ] Confirmar HSTS, Referrer-Policy, Permissions-Policy e `X-Content-Type-Options: nosniff`.
- [ ] Adicionar timeout e limite de tamanho ao carregamento do `index.json` de timelapse.
- [ ] Limitar o número de câmaras e thumbnails renderizadas por resposta.
- [ ] Adicionar timeout e limites de resposta às funções IPMA e marés.
- [ ] Limitar tamanho de resposta METAR antes de `response.text()`.
- [ ] Rever rate limits e timeouts do Cloudflare Tunnel em ambiente de staging.
- [ ] Documentar a branch e o diretório que alimentam o deployment de produção.
- [ ] Ativar secret scanning no repositório e no histórico.

### Gate final

- [ ] Reexecutar a auditoria após as correções.
- [ ] Confirmar 21/21 linhas de cobertura ou atualizar o inventário se o código mudar.
- [ ] Confirmar que não permanecem findings médios ou superiores sem aceitação de risco documentada.
- [ ] Registar versão, hash e origem do HLS.js publicado.
- [ ] Aprovar formalmente a v1.0 apenas depois das verificações em produção.
