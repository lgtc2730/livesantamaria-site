# Diálogo acessível de consentimento — desenho

Data: 2026-08-07  
Estado: aprovado para especificação

## Problema

O painel de métricas é visualmente apresentado como uma janela sobreposta, mas usa `role="region"`, não tem ação de fecho e permite que o foco saia para o navegador depois do último controlo. A apresentação e a semântica de acessibilidade não coincidem.

## Comportamento aprovado

O painel passa a ser um diálogo com `role="dialog"` e `aria-modal="true"`, identificado pelo título e pela descrição existentes.

- Um botão visível **Fechar** permite sair sem aceitar nem recusar.
- A tecla `Escape` executa o mesmo fecho sem alterar a preferência.
- Ao abrir, o foco entra no primeiro controlo do diálogo.
- Enquanto estiver aberto, `Tab` e `Shift+Tab` circulam apenas entre **Fechar**, **Saber mais**, **Aceitar métricas** e **Recusar**.
- Quando for aberto através de **Definições de métricas**, fechar ou decidir restaura o foco nesse botão.
- Na apresentação automática sem preferência guardada, o foco entra no diálogo; ao fechar sem decisão, regressa ao elemento anteriormente focado quando este existir, ou ao início lógico do Site.
- Aceitar e recusar mantêm o comportamento atual de armazenamento e métricas.

## Consentimento opcional

O diálogo não cria uma escolha por omissão. **Fechar** e `Escape` não escrevem consentimento, não criam sessão analítica e não enviam eventos. O Site continua utilizável depois do fecho. Sem uma decisão guardada, o diálogo pode reaparecer numa visita ou carregamento futuro.

## Apresentação

O botão **Fechar** fica no canto superior direito, tem nome acessível explícito e área de toque adequada. O diálogo mantém o layout atual em desktop e mobile; o botão não pode tapar o título. O foco visível aplica-se a todos os quatro controlos.

## Testes

O harness real do navegador deve provar:

- sem decisão, a abertura automática coloca foco no diálogo;
- fechar por botão e por `Escape` não altera consentimento nem envia eventos;
- `Tab` no último controlo volta ao primeiro e `Shift+Tab` no primeiro volta ao último;
- abertura através das definições e qualquer fecho/decisão restauram o foco ao botão de origem;
- os percursos existentes de aceitar, recusar e retirar continuam funcionais;
- a marcação contém a semântica e os nomes acessíveis aprovados.

## Fora de âmbito

Não se altera a Política de Privacidade, a retenção, o payload de métricas, a D1, o Worker, o WAF ou qualquer configuração remota. A publicação em `lab` exigirá autorização separada depois de testes locais aprovados.
