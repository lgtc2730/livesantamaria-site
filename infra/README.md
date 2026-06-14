# Infra no repositório Site

Esta pasta contém material histórico/snapshot antigo relacionado com infraestrutura de nós LVSM.

A fonte de verdade actual para infraestrutura é o repositório:

`livesantamaria-infra`

Regra do projecto:

**Infra monta. Site mostra. Control monitoriza e comanda.**

Não actualizar novos scripts, serviços systemd, configurações Cloudflare ou documentação técnica de nós nesta pasta.

Antes de remover esta pasta, confirmar se todo o conteúdo relevante já foi migrado para `livesantamaria-infra`.

Estado actual:

- `infra/nodes/anjos-porto/` é considerado snapshot antigo/legado.
- A versão actual do nó Anjos-Porto está em `livesantamaria-infra/nodes/anjos-porto/`.