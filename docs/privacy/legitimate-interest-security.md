# Teste de ponderação — segurança e operação

Data: 2026-08-04  
Decisor: Luis Mesquita  
Estado: **Pendente de aprovação do responsável — não publicar em produção**

## Interesse

Manter o serviço disponível, diagnosticar falhas, prevenir abuso e demonstrar a execução das rotinas de retenção.

## Necessidade e minimização

Sem sinais técnicos mínimos seria difícil detetar indisponibilidade, abuso ou falhas de eliminação. A alternativa adotada é recolher apenas hora, resultado, componente e códigos/contagens indispensáveis, evitando conteúdo e identificadores. A evidência de release usa resultados e contagens agregadas.

## Impacto

Endereços de rede, horas e padrões de pedido podem relacionar-se com visitantes. A acumulação, conservação longa ou combinação com outros registos aumenta o risco. Logs de fornecedores podem ter conteúdo e prazos diferentes dos logs controlados pelo projeto.

## Salvaguardas

- logs controlados pelo projeto conservados no máximo 14 dias;
- acesso limitado à administração técnica e partilha por necessidade;
- não incluir deliberadamente corpos de pedidos, credenciais, password, token, secret, cookies, identificadores de sessão analítica ou valores D1;
- mascaramento/minimização quando a plataforma o permitir;
- evidência operacional por contagens e estados, não por linhas individuais;
- rever configurações de fornecedores e apagar exportações temporárias;
- rever o tratamento após incidente, mudança de fornecedor ou nova telemetria.

## Conclusão condicional

O interesse pode prevalecer se os dados forem estritamente necessários, o prazo de 14 dias estiver tecnicamente aplicado aos logs sob controlo do projeto e os prazos externos forem transparentes. Qualquer logging adicional exige nova análise. **Pendente de aprovação do responsável — não publicar em produção**.

Aprovação: ____________________  Data: __________  Assinatura/registo: ____________________
