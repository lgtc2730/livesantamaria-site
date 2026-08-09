# Relatório de auditoria RGPD — desenho

## Objetivo e destinatário

Produzir uma auditoria prática da solução Live Santa Maria v2 para entregar a
Luís Mesquita. O texto deve explicar em português corrente o estado de
conformidade, transmitir segurança onde existe evidência e assinalar sem
alarmismo o que ainda precisa de confirmação ou correção.

O relatório é uma avaliação técnica e organizacional baseada em evidência e
fontes oficiais. Não é certificação de conformidade nem substitui parecer de
advogado ou decisão da CNPD.

## Âmbito

A auditoria cobre:

- corresponsabilidade de Luís Mesquita e Luís Carreiro;
- Política de Privacidade, transparência e exercício de direitos;
- câmaras em direto e Timelapse;
- métricas opcionais, consentimento, minimização e retenção;
- logs, acessos, segurança e gestão de incidentes;
- fornecedores, subcontratantes e transferências internacionais;
- registos e capacidade de demonstrar conformidade;
- necessidade de Avaliação de Impacto sobre a Proteção de Dados (AIPD).

Não serão incluídos segredos, credenciais, identificadores internos de recursos,
URLs privadas, linhas de bases de dados, imagens potencialmente identificáveis
ou conteúdo dos documentos assinados além do necessário para provar a sua
existência e finalidade.

## Método e escala

Cada área será confrontada com a implementação e documentação atuais, com o
RGPD e com orientações oficiais da CNPD, CEPD e Comissão Europeia. As conclusões
usarão três estados:

- **Verde — implementado e comprovado**;
- **Amarelo — base adequada, confirmação ou melhoria necessária**;
- **Vermelho — risco relevante que exige ação prioritária**.

O relatório distinguirá factos comprovados, declarações ainda por verificar e
recomendações. Não usará expressões absolutas como “100% conforme”.

## Estrutura

1. Resumo executivo de uma página.
2. O que foi analisado e limitações.
3. Corresponsabilidade e distribuição prática de funções.
4. Câmaras e Timelapse.
5. Métricas e consentimento.
6. Retenção, segurança e acessos.
7. Fornecedores e transferências internacionais.
8. Direitos das pessoas e resposta a incidentes.
9. AIPD.
10. Plano de ações por prioridade, responsável e prazo sugerido.
11. Fontes oficiais consultadas.

## Tratamento da AIPD

Na primeira utilização, a sigla será apresentada como **Avaliação de Impacto
sobre a Proteção de Dados (AIPD)**. O relatório explicará que é uma análise
formal do tratamento, da sua necessidade e proporcionalidade, dos riscos para
as pessoas e das medidas para os reduzir. Avaliará separadamente se a AIPD é
legalmente obrigatória, prudencialmente recomendável ou dispensável no âmbito
concreto do projeto. Se subsistir risco elevado após mitigação, assinalará a
regra de consulta prévia à CNPD.

## Conclusões preliminares a validar

Pontos fortes esperados: acordo de corresponsabilidade, informação pública,
consentimento prévio das métricas, minimização, retenção de 30 dias, contacto
comum, procedimento de direitos, controlos de acesso e ausência deliberada de
biometria, áudio ou identificação.

Pontos que exigem prova ou decisão: avaliação individual de cada câmara,
retenção efetiva nos nós Timelapse, prazo técnico dos logs, termos e mecanismos
de transferência dos fornecedores, procedimento formal de incidentes e decisão
documentada sobre AIPD.

## Entregáveis e localização

Serão produzidos:

- `Auditoria_RGPD_Live_Santa_Maria_v2.docx`;
- `Auditoria_RGPD_Live_Santa_Maria_v2.pdf`.

Os ficheiros finais ficarão fora de Git, numa nova pasta privada
`LiveSantaMaria_local\Legal\Privacidade\Auditoria_RGPD`. O Word será editável e
o PDF servirá como versão estável para leitura. Ambos terão o mesmo conteúdo e
data de emissão.
