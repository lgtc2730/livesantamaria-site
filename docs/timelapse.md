# LVSM Site — Timelapse

## Objectivo

Este documento descreve como o site público **Live Santa Maria** consome e apresenta os ficheiros de Timelapse.

A geração dos ficheiros, scripts, serviços systemd, timers, configuração dos nós e retenção pertencem ao repositório `livesantamaria-infra`.

Regra do projecto:

> **Infra monta. Site mostra. Control monitoriza e comanda.**

---

## Papel deste documento

Este documento pertence ao repositório:

```text
livesantamaria-site
```

E descreve apenas a parte de **frontend/site público** do Timelapse:

- que fontes o site consulta;
- que ficheiros espera receber;
- como apresenta o Timelapse;
- como se comporta quando o Timelapse está indisponível;
- como se relaciona com os repositórios `infra` e `pwa`.

Não documenta a instalação dos nós, scripts de captura, serviços systemd ou timers.  
Essa documentação deve ficar no repositório `livesantamaria-infra`.

---

## Fonte de dados

O site carrega os índices de Timelapse definidos no array `TIMELAPSE_SOURCES`, no ficheiro:

```text
timelapse.js
```

Exemplo actual:

```js
const TIMELAPSE_SOURCES = [
  {
    id: "anjos-porto",
    baseUrl: "https://anjos-timelapse.livesantamaria.org"
  },
  {
    id: "malbusca-sunset",
    baseUrl: "https://malbusca-sunset-timelapse.livesantamaria.org"
  }
];
```

Cada entrada representa uma fonte/nó de Timelapse.

Actualmente existem duas fontes activas:

```text
anjos-porto
malbusca-sunset
```

com base em:

```text
https://anjos-timelapse.livesantamaria.org
https://malbusca-sunset-timelapse.livesantamaria.org
```

---

## Carregamento do `index.json`

Para cada fonte definida em `TIMELAPSE_SOURCES`, o site tenta carregar:

```text
/index.json
```

O carregamento é feito com cache busting, acrescentando um timestamp à URL:

```text
/index.json?t=TIMESTAMP
```

Exemplo lógico:

```text
https://anjos-timelapse.livesantamaria.org/index.json?t=1720000000000
```

Isto evita que o browser reutilize uma versão antiga do índice.

---

## Estrutura esperada na fonte Timelapse

Cada fonte de Timelapse deve disponibilizar, via HTTP/HTTPS, os ficheiros referidos pelo respectivo `index.json`.

A estrutura lógica esperada inclui:

```text
index.json
latest/
daily/
weekly/
thumbs/
```

No site público podem existir também cópias ou artefactos locais destas pastas, por exemplo:

```text
daily/
latest/
weekly/
thumbs/
```

Mas a geração e manutenção real destes ficheiros pertence ao repositório `livesantamaria-infra` e aos Raspberry Pi/nós responsáveis.

---

## Dados esperados por câmara

Cada câmara recebida através do `index.json` pode conter informação como:

```text
id
name
enabled
currentThumb
today
latest.dayVideo
latest.dayThumb
daily
weekly.video
weekly.thumb
```

### Campos principais

#### `currentThumb`

Imagem actual ou mais recente da câmara.

Usada no bloco:

```text
Agora
```

#### `today`

Lista de thumbnails da evolução do dia.

Usada no bloco:

```text
Evolução do dia
```

Cada item deve incluir, pelo menos:

```text
hour
thumb
```

#### `latest.dayVideo`

Vídeo Timelapse diário mais recente.

Usado no bloco:

```text
Hoje
```

#### `latest.dayThumb`

Thumbnail do vídeo diário mais recente.

#### `daily`

Lista de vídeos diários anteriores.

Usada no bloco:

```text
Últimos dias
```

Cada item pode incluir:

```text
date
video
thumb
```

#### `weekly.video`

Vídeo Timelapse semanal.

#### `weekly.thumb`

Thumbnail do vídeo semanal.

---

## Conteúdo apresentado no site

O dashboard de Timelapse apresenta:

- selector de câmaras Timelapse;
- imagem actual;
- evolução do dia por thumbnails;
- vídeo diário;
- últimos dias;
- vídeo semanal.

A interface é construída dinamicamente pelo ficheiro:

```text
timelapse.js
```

---

## Selector de câmaras

Quando existem várias câmaras Timelapse disponíveis, o site apresenta um selector.

Cada botão mostra:

- thumbnail actual;
- nome da câmara.

Ao seleccionar uma câmara, o dashboard é redesenhado com os dados dessa câmara.

Se nenhuma câmara estiver activa, o dashboard não é apresentado.

---

## Bloco “Agora”

O bloco **Agora** mostra a imagem actual da câmara seleccionada.

Também pode mostrar a data/hora da última actualização do índice, quando disponível.

Exemplo de legenda:

```text
Actualizado 13/06/26, 14:35
```

---

## Bloco “Evolução do dia”

O bloco **Evolução do dia** mostra thumbnails por hora.

Cada thumbnail pode ser aberta numa vista ampliada.

O objectivo é permitir uma leitura rápida da evolução visual do dia:

- luz;
- nebulosidade;
- mar;
- movimento;
- pôr-do-sol;
- condições gerais.

---

## Bloco “Hoje”

O bloco **Hoje** apresenta o vídeo Timelapse diário mais recente.

Ao clicar no cartão, o site abre o vídeo em overlay/fullscreen interno.

---

## Bloco “Últimos dias”

O bloco **Últimos dias** apresenta vídeos diários anteriores.

O primeiro vídeo diário, correspondente ao dia mais recente, é omitido desta grelha porque já aparece em destaque no bloco **Hoje**.

Por defeito, são apresentados até 6 dias anteriores.

---

## Bloco “Semanal”

O bloco **Semanal** apresenta o vídeo Timelapse semanal.

Ao clicar no cartão, o vídeo é aberto em overlay/fullscreen interno.

---

## Overlay de vídeo

Quando o utilizador clica num vídeo, o site cria um overlay com:

- botão de fechar;
- vídeo HTML5;
- autoplay;
- controls;
- `playsinline`;
- título do Timelapse.

O overlay pode ser fechado:

- no botão `×`;
- clicando fora do vídeo;
- usando a tecla `Escape`.

---

## Overlay de imagem

Quando o utilizador clica numa thumbnail da evolução do dia, o site abre a imagem num overlay semelhante ao dos vídeos.

O overlay pode ser fechado:

- no botão `×`;
- clicando fora da imagem;
- usando a tecla `Escape`.

---

## Comportamento quando disponível

Quando pelo menos uma fonte responde com sucesso, o site:

1. carrega o `index.json`;
2. lê a lista de câmaras;
3. associa cada câmara à respectiva fonte;
4. aplica a `baseUrl`;
5. agrega as câmaras disponíveis;
6. apresenta a primeira câmara activa por defeito.

Se uma fonte falhar mas outra responder, o site deve continuar a apresentar as fontes disponíveis.

---

## Comportamento quando indisponível

Se nenhuma fonte de Timelapse responder com sucesso, o site apresenta uma mensagem simples:

```text
Timelapse indisponível
Não foi possível carregar o índice de timelapse.
```

A indisponibilidade de um nó Timelapse **não deve quebrar o resto do site**.

Este comportamento é essencial porque os nós Timelapse dependem de Raspberry Pi, câmaras, rede local, energia e Cloudflare Tunnel.

---

## Tolerância a falhas

O site está preparado para falhas parciais.

Exemplo:

```text
Fonte A falha
Fonte B responde
→ o site apresenta os dados da Fonte B
```

Se todas falharem:

```text
→ mostra mensagem de indisponibilidade
```

Este modelo permite adicionar novos nós sem tornar o sistema global demasiado frágil.

---

## Múltiplas fontes

A arquitectura permite adicionar mais nós Timelapse no array `TIMELAPSE_SOURCES`.

Configuração actual:

```js
const TIMELAPSE_SOURCES = [
  {
    id: "anjos-porto",
    baseUrl: "https://anjos-timelapse.livesantamaria.org"
  },
  {
    id: "malbusca-sunset",
    baseUrl: "https://malbusca-sunset-timelapse.livesantamaria.org"
  }
];
```

Cada fonte deve disponibilizar o seu próprio:

```text
index.json
```

com a lista de câmaras Timelapse que serve.

Os nós devem autorizar por CORS o hostname em que o frontend é executado. Uma
Pages Preview da branch `lab` pode, por isso, não conseguir carregar os índices
mesmo quando o frontend e os nós estão operacionais. Esta limitação deve ser
distinguida de uma falha da lógica de agregação do frontend.

---

## URLs relativas e absolutas

A função `timelapseUrl()` resolve os caminhos recebidos do `index.json`.

Regras:

- caminho vazio → não gera URL;
- `#` → mantém `#`;
- URL absoluta `http://` ou `https://` → usa directamente;
- caminho relativo → prefixa com a `baseUrl` da fonte.

Exemplo:

```text
/thumbs/current.jpg
```

torna-se:

```text
https://anjos-timelapse.livesantamaria.org/thumbs/current.jpg
```

---

## Segurança

O site não deve conter:

- passwords;
- tokens;
- ficheiros de credenciais;
- URLs RTSP com user/password;
- chaves privadas;
- endpoints sensíveis não protegidos.

O site deve consumir apenas endpoints públicos ou adequadamente protegidos.

A configuração sensível dos nós pertence ao repositório `livesantamaria-infra` e/ou aos próprios Raspberry Pi.

---

## Relação com Cloudflare

O Timelapse pode ser exposto através de Cloudflare Tunnel.

O domínio usado pelo site deve apontar para o serviço HTTP do nó Timelapse.

Exemplo actual:

```text
https://anjos-timelapse.livesantamaria.org
```

Este domínio deve disponibilizar:

```text
/index.json
/thumbs/...
/daily/...
/latest/...
/weekly/...
```

A configuração do tunnel pertence à documentação do repositório `livesantamaria-infra`.

---

## Relação com `livesantamaria-infra`

O repositório `livesantamaria-infra` é a fonte de verdade para:

- instalação dos nós;
- estrutura base do Raspberry Pi;
- scripts de captura;
- scripts de geração de vídeo;
- scripts de limpeza/retenção;
- serviços systemd;
- timers systemd;
- Cloudflare Tunnel;
- snapshots técnicos;
- templates de novos nós;
- recuperação de nós.

No caso do Anjos-Porto, a documentação técnica do nó deve estar em:

```text
livesantamaria-infra/nodes/anjos-porto/
```

---

## Relação com `livesantamaria-pwa`

O repositório `livesantamaria-pwa` é a fonte de verdade para:

- LVSM Control;
- health dos nós;
- comandos operacionais;
- modo viagem/mobile;
- monitorização interna;
- acções como PTZ, quando aplicável;
- interface de operação técnica.

O site público apenas apresenta o Timelapse.

O Control pode monitorizar ou comandar nós, mas essa lógica não pertence ao site público.

---

## Nota sobre `site/infra`

Existe ou existiu no repositório `livesantamaria-site` uma pasta:

```text
infra/
```

Essa pasta é considerada material histórico/snapshot antigo.

A fonte de verdade actual para infraestrutura é:

```text
livesantamaria-infra
```

Não devem ser adicionados novos scripts, serviços systemd ou configurações técnicas de nós em `livesantamaria-site/infra`.

---

## Regra de separação

Resumo operacional:

```text
Infra   → monta
Site    → mostra
Control → monitoriza e comanda
```

Ou, na forma curta adoptada pelo projecto:

> **Infra monta. Site mostra. Control monitoriza e comanda.**

---

## Estado actual

Estado conhecido à data desta documentação:

```text
Fontes Timelapse activas: anjos-porto, malbusca-sunset
Domínios: https://anjos-timelapse.livesantamaria.org
          https://malbusca-sunset-timelapse.livesantamaria.org
Frontend: timelapse.js
Consumo principal: /index.json
```

O frontend agrega os índices dos dois nós e tolera a indisponibilidade parcial de uma fonte.

---

## Pendentes / melhorias futuras

- confirmar formato final e estável do `index.json`;
- documentar exemplo real de `index.json`;
- adicionar validação visual quando uma fonte falha parcialmente;
- melhorar mensagens de erro para distinguir falha de rede, falha CORS e índice vazio;
- avaliar refresh automático do Timelapse;
- decidir se o site deve mostrar hora local dos Açores em vez da hora local do browser;
