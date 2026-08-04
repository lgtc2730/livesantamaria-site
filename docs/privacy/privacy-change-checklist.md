# Checklist de alteração com impacto em privacidade

Usar antes de implementar ou publicar qualquer alteração. A aprovação técnica de Luis Carreiro não substitui a decisão de Luis Mesquita sobre finalidade, fundamento ou risco.

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
- [ ] Criar/atualizar testes e provar em `lab` que comportamento e texto coincidem.
- [ ] Definir ordem de promoção, teste imediato e rollback sem expor segredos/dados pessoais.
- [ ] Obter aprovação explícita e datada de Luis Mesquita; obter aprovação remota separada para cada publicação/configuração.
- [ ] Registar versão/data e rever após publicação; eliminar evidência temporária.

Se algum item não estiver comprovado: **Pendente de aprovação do responsável — não publicar em produção**.
