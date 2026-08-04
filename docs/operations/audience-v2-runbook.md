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

**[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA — mutação remota]** Crie/edite a regra na consola Cloudflare com a expressão acima. Se o plano permitir observação/registo, comece nessa modalidade; caso contrário, use um limiar deliberadamente permissivo baseado na medição. Após observação, active uma ação eficaz de `block` ou `managed challenge` com a duração medida e volte a testar os fluxos normais.

O lançamento fica bloqueado até que o registo privado mostre o limiar medido, a ação eficaz activa e o teste sem falso positivo. Validação da aplicação, deduplicação e um modo apenas de observação não satisfazem este gate.

## Gate de migrations e retenção

### Pré-verificação local (sem alteração remota)

Execute e guarde apenas os resultados de sucesso/falha e contagens, nunca valores de eventos:

```powershell
npm test
npm run retention:dry-run
& npx.cmd wrangler d1 migrations apply LVSM_AUDIENCE --local -c wrangler.jsonc
& npx.cmd wrangler d1 migrations list LVSM_AUDIENCE --local -c wrangler.jsonc
```

Aceitação local: a suite passa, o dry-run constrói o Worker agendado sem rota HTTP, a migration local aplica numa base descartável e a listagem local não mostra migrations pendentes. Apague apenas o estado local descartável segundo o procedimento de desenvolvimento aprovado; nunca use esse estado como evidência de produção.

### Preparação remota e marcador Time Travel

**[LEITURA REMOTA — sem mutação]** Antes da janela, confirme as migrations pendentes:

```powershell
& npx.cmd wrangler d1 migrations list LVSM_AUDIENCE --remote -c wrangler.jsonc
```

**[LEITURA REMOTA — sem mutação; registo privado obrigatório]** Obtenha o bookmark Time Travel actual e crie no registo privado de alteração uma entrada com data/hora UTC, operador, ambiente, resultado da consulta e o bookmark devolvido. Cloudflare cria os bookmarks automaticamente; esta etapa preserva a referência de recuperação, não cria uma cópia nem executa um restauro.

```powershell
& npx.cmd wrangler d1 time-travel info LVSM_AUDIENCE -c wrangler.jsonc
```

Não publique o bookmark no repositório nem em canais públicos. Confirme no resultado que Time Travel é suportado e que a janela de recuperação disponível é suficiente para a mudança. Se não for, pare e peça orientação ao responsável de lançamento.

### Aplicar migrations e publicar o Worker

**[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA — mutação remota]** Só depois das pré-verificações, da revisão da migration e do registo privado do bookmark, aplique as migrations:

```powershell
& npx.cmd wrangler d1 migrations apply LVSM_AUDIENCE --remote -c wrangler.jsonc
```

Registe de forma privada apenas o estado aplicado e a hora UTC. Não execute SQL ad hoc, não faça exportação de linhas e não tente uma migration inversa destrutiva.

**[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA — mutação remota]** Depois de a migration remota estar confirmada, publique o Worker de retenção:

```powershell
& npx.cmd wrangler deploy --config workers/audience-retention/wrangler.jsonc
```

A publicação tem de usar a configuração revista, sem rota pública. Não substitua a configuração, não acrescente `routes`, e não invoque manualmente o cron sem nova aprovação explícita: uma invocação pode eliminar eventos expirados.

### Confirmar cron e uma execução bem-sucedida

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

Após a execução, **[LEITURA REMOTA — sem mutação]** confirme apenas a contagem agregada de eventos expirados:

```powershell
& npx.cmd wrangler d1 execute LVSM_AUDIENCE --remote -c wrangler.jsonc --command "SELECT COUNT(*) AS expired_event_count FROM events WHERE created_at < datetime('now', '-30 days');"
```

Aceitação: a consulta agregada devolve zero eventos expirados. Se a execução falhar, faltar, ou a contagem não for zero, pare a promoção, registe a falha e use o procedimento de rollback abaixo; não oculte a falha com uma execução manual não aprovada.

## Evidência de lançamento

O responsável de lançamento só pode aprovar promoção depois de verificar e anexar, em armazenamento de evidência privado:

- resultados do teste local, dry-run e ensaio local de migrations;
- revisão da migration pendente antes de a aplicar e confirmação de aplicada depois;
- bookmark Time Travel, janela de recuperação e operador;
- configuração publicada sem rota, cron confirmado e uma execução bem-sucedida;
- contagem agregada zero para eventos com mais de 30 dias;
- registo WAF completo, com limiar medido, ação eficaz e teste de falsos positivos;
- confirmação de que a Política de Privacidade abaixo descreve o comportamento realmente publicado.

Não trate uma captura de configuração, uma aprovação verbal, uma compilação local ou uma regra em observação como autorização de lançamento.

## Rollback e incidentes

Pare a promoção e informe o responsável de lançamento se a regra WAF bloquear tráfego legítimo, se a migration falhar, se o cron não estiver activo, se não houver execução `ok`, ou se a prova de retenção falhar.

- **WAF:** **[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA — mutação remota]** corrija a expressão ou volte a uma observação temporária/limiar mais alto baseado em medição. Registe a nova decisão, prazo e responsável. Desactivar o controlo eficaz reabre a falha de consumo de recursos e bloqueia a aceitação do lançamento.
- **Código/Worker:** reverta para o commit conhecido anterior e, antes de qualquer publicação correctiva, obtenha aprovação explícita separada. **[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA — mutação remota]** desactivar o Worker só é permitido com procedimento temporário de retenção, duração, evidência e responsável documentados; a interrupção não pode prolongar silenciosamente a retenção.
- **Dados:** a alteração de schema é forward-compatible e não deve ser removida de forma destrutiva. Não há rollback que recupere eventos já apagados pela retenção aprovada. **[APROVAÇÃO EXPLÍCITA OBRIGATÓRIA — mutação remota e destrutiva]** um restauro Time Travel exige incidente aprovado, bookmark privado identificado, confirmação do impacto e procedimento de validação pós-restauro; nunca o execute como tentativa de rotina.

## Bloqueio obrigatório: Política de Privacidade e RGPD

Antes de promoção de produção, o responsável pelo projecto e a administração técnica têm de concluir e aprovar esta lista. A Política de Privacidade deve descrever o comportamento efectivamente publicado, não a implementação planeada nem uma versão anterior.

- [ ] Identificar o responsável pelo tratamento e contacto de privacidade.
- [ ] Descrever a finalidade específica das métricas de audiência.
- [ ] Determinar e documentar a base de licitude aplicável.
- [ ] Avaliar em Portugal a utilização de `localStorage`, o identificador de sessão de 30 minutos e qualquer requisito de consentimento; não presumir que o consentimento é dispensado.
- [ ] Rever Cloudflare como subcontratante e os respectivos subprocessadores/termos aplicáveis.
- [ ] Publicar procedimento de exercício de direitos, incluindo contacto, verificação e resposta a objecções.
- [ ] Divulgar claramente a retenção de eventos brutos por 30 dias.
- [ ] Rever retenção e mascaramento de logs, consola e evidência operacional.
- [ ] Indicar o proprietário da política, data de publicação e versão.

Enquanto qualquer item estiver incompleto, não publique texto de privacidade, não faça alegações de anonimato ou de dispensa de consentimento e não promova o lançamento.
