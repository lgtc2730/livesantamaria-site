# Checklist de alteração com impacto em privacidade

Usar antes de implementar ou publicar qualquer alteração. Finalidade, fundamento, risco e alterações estruturais exigem decisão conjunta de Luís Mesquita e Luís Carreiro enquanto corresponsáveis.

## Gatilhos

- [ ] Câmara nova, movida, reenquadrada ou removida.
- [ ] Timelapse ativado/desativado ou prazo alterado.
- [ ] Novo fornecedor, domínio externo, SDK, CDN ou mudança de conta/plano/região.
- [ ] Nova métrica, identificador, cookie/localStorage ou combinação de dados.
- [ ] Formulário, conta de utilizador, newsletter, publicidade, donativo/pagamento ou integração social.
- [ ] Mudança de logs, WAF, monitorização, retenção, backups ou acesso administrativo.
- [ ] Incidente, captação identificável ou pedido de exercício de direitos.
- [ ] Mudança de responsável, operador, contacto ou estrutura jurídica.

## Verificações obrigatórias

- [ ] Descrever finalidade, necessidade, dados, titulares e fluxo técnico real.
- [ ] Determinar e documentar fundamento; renovar ponderação ou consentimento quando aplicável.
- [ ] Rever minimização, enquadramento/máscaras, segurança, acessos e separação de funções.
- [ ] Definir retenção e eliminação na configuração/código, incluindo fornecedor e backups.
- [ ] Atualizar o registo de tratamentos, a revisão de fornecedores e o procedimento afetado.
- [ ] Atualizar a Política de Privacidade antes ou simultaneamente ao efeito da mudança.
- [ ] Confirmar que `lab-control` e o Control de produção lêem apenas o resumo público de produção e que `visits.total` é apresentado como `Últimos 30 dias`, sem total vitalício, rollup ou histórico acumulado.
- [ ] Criar/atualizar testes e provar em `lab` que comportamento e texto coincidem.
- [ ] Definir ordem de promoção, teste imediato e rollback sem expor segredos/dados pessoais.
- [ ] Registar privadamente o bookmark Time Travel e as contagens agregadas antes/depois da migration D1; nunca guardar ou divulgar o bookmark, linhas de eventos, sessões, chaves de evento ou segredos.
- [ ] Obter aprovação conjunta, explícita e datada dos corresponsáveis; obter aprovação remota separada para a migration D1, publicação Pages e publicação do Worker de retenção.
- [ ] Registar versão/data e rever após publicação; eliminar evidência temporária.

Se algum item não estiver comprovado: **Pendente de decisão ou verificação conjunta — não publicar em produção**.
