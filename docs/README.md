# Documentação — Live Santa Maria Site

Este directório contém documentação relacionada com o **site público** do projecto Live Santa Maria.

Regra do projecto:

> **Infra monta. Site mostra. Control monitoriza e comanda.**

## Documentação principal

- `timelapse.md` — descreve como o site público consome e apresenta os ficheiros de Timelapse.
- `ROADMAP_EXPANSION.md` — roadmap geral de expansão do projecto, câmaras futuras, sponsors, ideias e evolução.

## Fonte de verdade

Este repositório é a fonte de verdade para:

- site público;
- apresentação das câmaras;
- frontend público;
- assets públicos;
- Timelapse apresentado ao visitante;
- conteúdos públicos;
- roadmap público/estratégico do projecto.

## Relação com outros repositórios

### `livesantamaria-infra`

Fonte de verdade para:

- instalação dos nós;
- scripts;
- serviços systemd;
- timers;
- templates;
- snapshots;
- configuração técnica;
- recuperação;
- documentação operacional de infraestrutura.

### `livesantamaria-pwa`

Fonte de verdade para:

- LVSM Control;
- health dos nós;
- comandos operacionais;
- modo viagem/mobile;
- monitorização interna;
- operação técnica.

## Nota sobre `infra/`

Se existir uma pasta `infra/` neste repositório, deve ser considerada material histórico/snapshot antigo.

A fonte de verdade actual para infraestrutura é:

```text
livesantamaria-infra