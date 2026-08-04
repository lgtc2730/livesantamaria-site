# Audience v2 — runbook de lançamento, WAF, retenção e RGPD

Estado: gate de lançamento; não autoriza alterações remotas por si só

Âmbito: `www.livesantamaria.org`, ingestão `POST /api/audience/event` e Worker de retenção
Evidência de configuração revista: `workers/audience-retention/wrangler.jsonc` define o Worker sem `routes`, com cron diário `17 4 * * *` (UTC), e usa as migrations em `database/migrations`.

## Regra de autoridade e proteção de informação

Só o responsável de lançamento pode dar aprovação explícita, registada no pedido de alteração, para cada mutação remota abaixo. Uma aprovação para uma etapa não autoriza outra etapa. Nenhum comando deste documento deve imprimir, guardar no repositório, copiar para chat, ou incluir em capturas valores de `token`, `secret`, `password`, `cookie`, `JWT`, `account_id` ou `database_id`.

Use credenciais de privilégio mínimo já fornecidas pelo mecanismo de autenticação aprovado. Não passe credenciais na linha de comando, não use ficheiros de variáveis na evidência de lançamento, e não exporte linhas de eventos, identificadores de sessão ou chaves de deduplicação.

## Gate WAF: medir antes de limitar

A regra tem de corresponder exatamente a este âmbito; não o alargue a outras rotas ou hosts:

```text
http.request.method eq "POST" and
http.request.uri.path eq "/api/audience/event" and
http.host eq "www.livesantamaria.org"
```

Antes de criar ou alterar uma regra, consulte Cloudflare Security Analytics para esta expressão e para uma janela representativa de utilização normal e de pico. Meça a taxa por IP no edge apenas na consola; não a copie para D1 nem a exporte para a evidência.

Registo privado de medição e decisão (obrigatório):

- início e fim da observação (UTC), incluindo períodos normais e de pico;
- pico normal por IP observado;
- pedidos por período escolhidos, derivados dessa medição — não inventar um limiar;
- ação de mitigação e duração escolhidas;
- resultado do teste de falsos positivos para navegação normal e abertura de várias câmaras;
- responsável, data de revisão e ligação privada para a evidência de Analytics.

Configure a característica de contagem da Rate Limiting Rule como **IP (`ip.src`)**. Registe no mesmo registo privado os pedidos medidos por período que sustentam o limiar, a característica `IP`/`ip.src`, o comportamento da ação disponível no plano e o respectivo timeout/duração. Para `block`, registe a duração de mitigação efectivamente suportada pelo plano. Para `managed challenge`, se a consola não disponibilizar duração, registe `N/A — challenge/throttling enquanto a regra se qualificar`; se disponibilizar duração, registe o valor apresentado. Nunca invente timeout, duração ou limiar.

**[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA 1 — mutação remota inicial WAF]** Crie a regra com a expressão e contagem acima apenas em observação/registo, quando o plano disponibilizar uma ação não executória. Se o plano não disponibilizar observação/registo ou outra ação não executória, guarde/crie a regra **desactivada** ou documente-a sem a activar. Nesta ramificação, não active `block`/`managed challenge` e não execute um teste que as accione. Esta aprovação só autoriza a criação inicial não executória ou desactivada, nunca a ativação de uma ação eficaz.

Recolha evidência suficiente antes de ativar execução: janela UTC de Security Analytics, pedidos normais/pico por período, resultado de falsos positivos de fluxos normais e, quando a regra estiver em observação/registo, o seu comportamento não executório. Não exceda deliberadamente o limiar para accionar `block` ou `managed challenge` nesta fase.

**[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA 2 — mutação remota para ação eficaz WAF]** Só depois de anexar a evidência anterior, obtenha nova aprovação para activar `block` ou `managed challenge` com o comportamento/timeout suportado pelo plano. Apenas após esta nova aprovação, execute um teste controlado, autorizado e limitado que ultrapasse o limiar a partir de uma origem de teste para provar que a ação eficaz é accionada; não use tráfego de visitantes nem guarde o IP da origem na evidência. Volte a testar navegação normal e abertura de várias câmaras. Cada edição posterior de expressão, limiar, característica de contagem, ação ou duração exige nova aprovação explícita separada.

O lançamento fica bloqueado até que o registo privado mostre o limiar medido, `IP`/`ip.src`, a ação eficaz activa, o teste controlado que a accionou e o teste sem falso positivo. Validação da aplicação, deduplicação e um modo apenas de observação não satisfazem este gate.

## Gate de migrations e retenção

### Pré-verificação local (sem alteração remota)

Execute e guarde apenas os resultados de sucesso/falha e contagens, nunca valores de eventos:

```powershell
npm test
npm run retention:dry-run
node --experimental-vm-modules --test tests/audience-database.test.mjs
$cleanPersist = Join-Path ([System.IO.Path]::GetTempPath()) ("lvsm-audience-clean-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $cleanPersist | Out-Null
& npx.cmd wrangler d1 migrations apply LVSM_AUDIENCE --local -c wrangler.jsonc --persist-to $cleanPersist
& npx.cmd wrangler d1 migrations list LVSM_AUDIENCE --local -c wrangler.jsonc --persist-to $cleanPersist
```

O teste de base de dados executa a migration real numa base vazia e noutra base legacy populada. A aceitação exige preservação exacta da contagem e dos campos das linhas legacy, manutenção dos duplicados, chaves distintas para tuplos que colidiam com concatenação por delimitador, `event_key` nullable, índice único parcial, escrita pelo SQL antigo de cinco colunas, escrita/deduplicação pelo código novo e nova escrita depois de simular rollback para o SQL antigo.

Aceitação local: a suite passa, o dry-run constrói o Worker agendado sem rota HTTP, os dois ensaios passam, a migration local aplica numa base descartável limpa e a listagem local não mostra migrations pendentes. Apague apenas o estado local descartável segundo o procedimento de desenvolvimento aprovado; nunca use esse estado como evidência de produção.

### Preparação remota e marcador Time Travel

**[LEITURA REMOTA — sem mutação]** Antes da janela, confirme as migrations pendentes:

```powershell
& npx.cmd wrangler d1 migrations list LVSM_AUDIENCE --remote -c wrangler.jsonc
```

**[LEITURA REMOTA — sem mutação; registo privado obrigatório]** Imediatamente antes de aplicar a migration, depois da última pré-verificação, obtenha o bookmark Time Travel actual e crie no registo privado de alteração uma entrada com data/hora UTC, operador, ambiente, resultado da consulta e o bookmark devolvido. Cloudflare cria os bookmarks automaticamente; esta etapa preserva a referência de recuperação, não cria uma cópia nem executa um restauro.

```powershell
& npx.cmd wrangler d1 time-travel info LVSM_AUDIENCE -c wrangler.jsonc
```

Não publique o bookmark no repositório nem em canais públicos. Confirme no resultado que Time Travel é suportado e que a janela de recuperação disponível é suficiente para a mudança. Se não for, pare e peça orientação ao responsável de lançamento.

### Sequência obrigatória: migration compatível, Pages e Worker

Esta ordem é obrigatória e cada mutação remota requer aprovação separada. Não avance por inferência:

1. concluir a pré-verificação privada e registar o bookmark Time Travel privado;
2. aplicar apenas a migration compatível que acrescenta `event_key` nullable e o índice único parcial;
3. com a versão Pages antiga ainda activa, provar por contagens agregadas que a ingestão antiga continua a escrever;
4. publicar o commit Pages novo, exacto e revisto;
5. provar visitas produzidas pelo browser, visualizações de câmaras e deduplicação de retries, sempre por resposta e contagens agregadas;
6. publicar o Worker de retenção como mutação separada;
7. observar o cron, uma execução `ok` e a contagem agregada de retenção;
8. só numa mudança futura e separadamente aprovada considerar constraints finais, depois de retirar todas as versões Pages antigas.

O alvo de rollback Pages e o alvo de versão/deployment do Worker têm de ser registados privadamente com SHA/ID exactos e prova de compatibilidade com o schema migrado antes da etapa 2. Um nome de branch, “commit anterior” ou “última versão” não é um alvo. A prova local desta mudança cobre explicitamente o SQL Pages antigo de cinco colunas, o código novo de seis colunas e o retorno ao SQL antigo. O relatório final de correcção regista os SHAs de origem testados; o registo privado de lançamento tem ainda de associá-los às versões remotas efectivamente publicadas.

#### 2. Aplicar a migration compatível

**[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA — mutação remota]** Só depois das pré-verificações, da revisão da migration e do registo privado do bookmark, aplique as migrations:

```powershell
& npx.cmd wrangler d1 migrations apply LVSM_AUDIENCE --remote -c wrangler.jsonc
```

Registe de forma privada apenas o estado aplicado e a hora UTC. Não execute SQL ad hoc, não faça exportação de linhas e não tente uma migration inversa destrutiva.

Confirme em modo de leitura que `event_key` é nullable e que o índice único é parcial para `event_key IS NOT NULL`. Não imponha `NOT NULL`, checks de tipo/evento ou normalização de linhas nesta janela.

#### 3. Provar a ingestão Pages antiga

Ainda sem publicar código Pages novo, registe uma contagem agregada antes, produza uma visita controlada através da versão antiga e registe a contagem agregada depois. Não capture nem exporte o corpo, `session_id`, `event_key`, valores SQL ou identificadores de rede. Pare se a escrita antiga falhar: não publique Pages novo e não publique o Worker.

#### 4. Publicar o Pages novo

**[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA — mutação remota Pages]** Publique apenas o SHA Pages exacto revisto e registado. Confirme que o artefacto contém o browser que omite `camera` em `visit`, a validação estrita e a geração de chave `v1` collision-safe. Não combine esta aprovação com a publicação do Worker.

#### 5. Provar visitas, views e deduplicação novas

Numa sessão controlada, prove por respostas e diferenças de contagens agregadas: uma visita aceite e inserida; uma visualização de câmara pública aceite e inserida; o retry exacto de cada evento aceite sem nova linha. Não guarde o identificador da sessão, chave do evento, corpo do pedido ou valores ligados. Pare se qualquer prova falhar e use apenas o alvo Pages de rollback registado e compatível.

#### 6. Publicar o Worker separadamente

**[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA — mutação remota]** Só depois de concluir com sucesso as provas Pages das etapas 3–5, publique o Worker de retenção:

```powershell
& npx.cmd wrangler deploy --config workers/audience-retention/wrangler.jsonc
```

A publicação tem de usar a configuração revista, sem rota pública. Não substitua a configuração, não acrescente `routes`, e não invoque manualmente o cron sem nova aprovação explícita: uma invocação pode eliminar eventos expirados.

#### Constraint final explicitamente adiada

Esta janela não inclui `event_key NOT NULL`, rebuild de tabela, eliminação/reconciliação destrutiva de duplicados, checks finais nem normalização de linhas históricas. Uma migration final só pode existir numa mudança posterior, revista e aprovada separadamente, depois de provar que todas as versões Pages antigas foram retiradas, rever evidência remota agregada, definir o tratamento sem perda para linhas incompatíveis e voltar a testar os alvos de rollback.

### 7. Observar cron e uma execução bem-sucedida

**[LEITURA REMOTA — sem mutação]** Confirme que a versão publicada existe:

```powershell
& npx.cmd wrangler deployments list --name livesantamaria-audience-retention
```

Na consola Cloudflare, em Workers & Pages > `livesantamaria-audience-retention` > Settings > Triggers, confirme em modo de leitura que há apenas o cron diário `17 4 * * *` (UTC) e que não há rota HTTP. Registe a hora da inspeção e o responsável no registo privado.

Espere pela próxima execução agendada. **[LEITURA REMOTA — sem mutação]** Inicie a observação pouco antes do cron e pare-a depois de recolher uma única execução `ok`:

```powershell
& npx.cmd wrangler tail livesantamaria-audience-retention --format=json --status=ok
```

Evidência mínima de retenção, em registo privado: hora UTC da execução, resultado `outcome: "ok"`, `deletedCount`, `durationMs`, responsável e confirmação de que o log não contém linhas, sessões, chaves de evento ou credenciais. Não cole o fluxo integral de logs no pedido de alteração.

O teste local de fronteira é obrigatório antes desta prova: `node --experimental-vm-modules --test tests/audience-retention.test.mjs` tem de demonstrar, com o cutoff fixo `2026-07-05T12:00:00.000Z`, que `2026-07-05T11:59:59.999Z` é apagado, que o valor exactamente no cutoff é retido, e que a query do Worker usa estritamente `created_at < ?`.

Após a execução, **[LEITURA REMOTA — sem mutação]** confirme apenas a contagem agregada de eventos expirados. Use comparação de instantes analisados por SQLite, não comparação lexical de texto ISO:

```powershell
& npx.cmd wrangler d1 execute LVSM_AUDIENCE --remote -c wrangler.jsonc --command "WITH cutoff AS (SELECT julianday('now', '-30 days') AS cutoff_jd) SELECT COUNT(*) AS expired_event_count FROM events, cutoff WHERE julianday(created_at) < cutoff.cutoff_jd;"
```

Registe também a hora UTC de início da query e a prova local de fronteira acima; a primeira demonstra a semântica exacta `<` no cutoff e a segunda impede que uma formatação textual diferente faça a contagem remota parecer falsamente zero. Aceitação: a consulta agregada devolve zero eventos expirados. Se a execução falhar, faltar, ou a contagem não for zero, pare a promoção, registe a falha e use o procedimento de rollback abaixo; não oculte a falha com uma execução manual não aprovada.

## Evidência de lançamento

O responsável de lançamento só pode aprovar promoção depois de verificar e anexar, em armazenamento de evidência privado:

- resultados do teste local, dry-run e ensaio local de migrations;
- comparação agregada que prova preservação integral das linhas da base legacy populada e compatibilidade de escrita old/new/rollback;
- revisão da migration pendente antes de a aplicar e confirmação de aplicada depois;
- bookmark Time Travel criado imediatamente antes da migration, janela de recuperação e operador;
- ID/SHA exacto da versão Pages antiga provada na etapa 3, SHA exacto Pages novo provado na etapa 5 e alvo exacto Pages de rollback compatível;
- alvo exacto de versão/deployment do Worker compatível com o schema, ou bloqueio explícito por ainda não existir versão anterior;
- configuração publicada sem rota, cron confirmado e uma execução bem-sucedida;
- contagem agregada zero para eventos com mais de 30 dias;
- registo WAF completo, com `IP`/`ip.src`, pedidos medidos por período, ação/timeout suportados pelo plano, duas aprovações separadas, teste controlado de ação eficaz e teste de falsos positivos;
- confirmação de que a Política de Privacidade abaixo descreve o comportamento realmente publicado.

Não trate uma captura de configuração, uma aprovação verbal, uma compilação local ou uma regra em observação como autorização de lançamento.

## Rollback e incidentes

Pare a promoção e informe o responsável de lançamento se a regra WAF bloquear tráfego legítimo, se a migration falhar, se o cron não estiver activo, se não houver execução `ok`, ou se a prova de retenção falhar.

- **WAF:** **[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA — mutação remota]** corrija a expressão ou volte a uma observação temporária/limiar mais alto baseado em medição. Registe a nova decisão, prazo e responsável. Desactivar o controlo eficaz reabre a falha de consumo de recursos e bloqueia a aceitação do lançamento.
- **Código/Worker:** antes de aplicar a migration, registe privadamente o ID/SHA exacto da versão Pages antiga cuja escrita foi testada, o SHA Pages novo, o alvo Pages de rollback e o alvo de deployment/versão do Worker; cada um tem de ter prova de compatibilidade com `event_key` nullable e o índice parcial. **[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA — mutação remota]** um rollback só pode publicar esses alvos identificados, nunca um nome de branch, “commit anterior” ou “última versão”. Depois de rollback Pages, repita a prova agregada de escrita antiga. Se não existir versão anterior do Worker compatível, obtenha aprovação separada para o procedimento temporário de retenção e para desactivar o Worker, com duração, evidência e responsável documentados; a interrupção não pode prolongar silenciosamente a retenção.
- **Dados:** a alteração de schema é forward-compatible e não deve ser removida de forma destrutiva. **[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA — mutação remota e destrutiva]** um restauro Time Travel exige incidente aprovado, o bookmark privado imediatamente anterior à migration, confirmação de que o commit Pages e a versão Worker a reabrir são compatíveis com o schema restaurado, e validação pós-restauro. O restauro pode ressuscitar eventos expirados/apagados, perder escritas posteriores e restaurar um schema incompatível. Depois do restauro, obtenha aprovação explícita separada para executar a limpeza de retenção pelo Worker revisto (sem SQL ad hoc), prove com a query `julianday` acima que há zero eventos expirados, e só então reabra o serviço.

## Bloqueio obrigatório: Política de Privacidade e RGPD

Antes de promoção de produção, o responsável pelo projecto e a administração técnica têm de concluir e aprovar esta lista. A Política de Privacidade deve descrever o comportamento efectivamente publicado, não a implementação planeada nem uma versão anterior.

- [x] Registar Luis Mesquita, em nome individual, como responsável pelo tratamento; Luis Carreiro, em nome individual, como responsável técnico e operacional (não Encarregado de Proteção de Dados); e `livesantamaria.project@gmail.com` como contacto público do projecto e de privacidade.
- [ ] Descrever a finalidade específica das métricas de audiência.
- [ ] Determinar e documentar a base de licitude aplicável.
- [x] Exigir consentimento prévio e explícito antes de ler/criar a sessão analítica de 30 minutos em `localStorage` ou enviar eventos; a recusa não limita o Site e a retirada apaga a sessão local e bloqueia eventos posteriores.
- [ ] Rever Cloudflare como subcontratante e os respectivos subprocessadores/termos aplicáveis.
- [ ] Publicar procedimento de exercício de direitos, incluindo contacto, verificação e resposta a objecções.
- [ ] Divulgar claramente a retenção de eventos brutos por 30 dias.
- [ ] Rever retenção e mascaramento de logs, consola e evidência operacional.
- [ ] Indicar o proprietário da política, data de publicação e versão.

Enquanto qualquer item estiver incompleto, não publique texto de privacidade, não faça alegações de anonimato ou de dispensa de consentimento e não promova o lançamento.

### Prova imediata do consentimento antes da promoção

- [ ] Sem decisão guardada, confirmar que o Site e as câmaras funcionam, que o painel apresenta `Aceitar métricas` e `Recusar`, e que não há acesso à chave `lvsm-audience-session` nem pedidos para `/api/audience/event`.
- [ ] Depois de `Recusar`, confirmar navegação normal, ausência de pedidos de audiência e remoção de qualquer sessão analítica legada.
- [ ] Reabrir `Privacidade`, escolher `Aceitar métricas` e confirmar uma única visita e deduplicação de câmaras na sessão de 30 minutos.
- [ ] Recarregar a página e confirmar que a decisão guardada é respeitada sem criar uma visita duplicada na mesma sessão.
- [ ] Retirar a aceitação através de `Privacidade`, confirmar a remoção da sessão local e a ausência de eventos posteriores.
- [ ] Confirmar que o texto público informa a finalidade, a sessão aleatória de 30 minutos, a eliminação dos eventos brutos após 30 dias, o contacto e a forma de alterar a escolha.
