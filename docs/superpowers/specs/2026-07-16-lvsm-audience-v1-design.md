# LVSM Audience v1.0 — Design

## Objetivo

Adicionar ao Live Santa Maria uma medição simples e privada de audiência, visível no Control, começando a contar a partir da ativação do sistema.

A v1 responde apenas a:

- quantas visitas ocorreram hoje;
- quantas ocorreram ontem;
- quantas ocorreram nos últimos 7 dias;
- quantas ocorreram desde a ativação;
- quais as 5 câmaras mais abertas.

## Âmbito

Só o domínio público `www.livesantamaria.org` regista eventos.

O ambiente `teste.livesantamaria.org` nunca grava audiência.

Não são recolhidos IP, User-Agent completo, localização, cookies de terceiros ou outros dados pessoais.

## Definições

### Visita

Uma visita corresponde a uma sessão de browser com janela de 30 minutos.

Refreshes e `Ctrl+F5` dentro dessa janela não criam nova visita.

A sessão é renovada quando existe atividade e expira após 30 minutos de inatividade.

### Visualização de câmara

Cada câmara conta no máximo uma visualização por sessão.

Abrir e fechar repetidamente a mesma câmara na mesma sessão não incrementa novamente o ranking.

## Arquitetura

```text
Browser público
    |
    | POST /api/audience/event
    v
Cloudflare Pages Function
    |
    v
Cloudflare D1: LVSM_AUDIENCE
    |
    | GET /api/audience/summary
    v
LVSM Control
```

A solução usa Cloudflare Pages Functions porque o Site já utiliza esta tecnologia e a audiência nasce no próprio Site.

## Componentes

### D1

Tabela `events`:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `created_at TEXT NOT NULL`
- `event_type TEXT NOT NULL`
- `camera_id TEXT`
- `session_id TEXT NOT NULL`
- `host TEXT`

Índices em `created_at`, `event_type`, `camera_id` e, se necessário, em `session_id`.

### Endpoint de registo

`POST /api/audience/event`

Eventos aceites:

```json
{"event":"visit","session":"<uuid>"}
```

```json
{"event":"camera_view","camera":"anjos-porto","session":"<uuid>"}
```

Regras:

- rejeitar payload inválido;
- aceitar apenas `visit` e `camera_view`;
- exigir `camera` em `camera_view`;
- exigir origem/host público;
- tornar o registo idempotente:
  - uma visita por sessão;
  - uma visualização por câmara e sessão.

### Endpoint de resumo

`GET /api/audience/summary`

Resposta:

```json
{
  "startedAt": "2026-07-16T00:00:00Z",
  "today": 0,
  "yesterday": 0,
  "last7": 0,
  "total": 0,
  "cameraViewsToday": 0,
  "top": []
}
```

As fronteiras dos dias usam o fuso `Atlantic/Azores`.

### Tracking no Site

O browser guarda em `localStorage`:

- identificador efémero da sessão;
- instante da última atividade;
- lista de câmaras já abertas nessa sessão.

A sessão expira após 30 minutos de inatividade.

O Site envia:

- `visit` ao criar nova sessão;
- `camera_view` na primeira abertura de cada câmara durante essa sessão.

Falhas de tracking nunca bloqueiam o Site nem a abertura de câmaras.

### Control

Novo cartão `Audiência` com:

- Hoje;
- Ontem;
- Últimos 7 dias;
- Total desde ativação;
- Aberturas de câmara hoje;
- Top 5 câmaras.

A ausência da API mostra estado indisponível sem afetar o restante Control.

## Segurança e privacidade

- D1 não guarda IP.
- O endpoint público valida tamanho e formato dos campos.
- `session_id` é aleatório e efémero, sem associação a identidade.
- O endpoint de resumo pode ficar protegido pelo mesmo controlo de acesso do Control ou por token de leitura, conforme a integração atual permitir.
- O tracking só é ativado em `www.livesantamaria.org`.

## Tratamento de erros

- Payload inválido: `400`.
- Host não público: `204`, sem gravação.
- Evento duplicado: `204`, sem nova linha.
- Erro D1: `500` no endpoint, sem impacto funcional no Site.
- Summary indisponível: cartão do Control apresenta erro discreto.

## Testes de aceitação

1. Primeira visita no `www` cria um evento `visit`.
2. Refresh dentro de 30 minutos não cria nova visita.
3. Após expiração da sessão, nova visita é criada.
4. Primeira abertura de uma câmara cria `camera_view`.
5. Nova abertura da mesma câmara na sessão não duplica.
6. Outra câmara na mesma sessão é registada.
7. O domínio `teste` não grava eventos.
8. O resumo devolve hoje, ontem, 7 dias, total e top 5.
9. Falha da API não quebra o Site.
10. O Control apresenta os dados e tolera indisponibilidade.

## Fora de âmbito na v1

- gráficos;
- países ou geolocalização;
- dispositivos;
- duração média;
- visitantes únicos persistentes;
- integração com Google Analytics;
- importação retroativa de dados anteriores à ativação.
