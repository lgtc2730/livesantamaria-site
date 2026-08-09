# Política de Privacidade e registos RGPD — desenho

Data: 2026-08-04
Estado: aprovado para especificação
Repositório principal: `livesantamaria-site`
Branch: `lab`

## Objetivo e âmbito

Criar a documentação pública e interna de privacidade necessária para a release v2 do Live Santa Maria. A documentação deve corresponder ao comportamento técnico efetivamente publicado e abranger:

- Site público e fornecedores carregados pelo navegador;
- câmaras em direto;
- Timelapse das câmaras que o disponibilizem;
- métricas opcionais de audiência;
- contactos recebidos por email;
- registos técnicos controlados pelo projeto.

A versão pública inicial é exclusivamente em português de Portugal. Não se cria uma página autónoma de videovigilância: câmaras, Timelapse e métricas pertencem a uma Política de Privacidade única e completa.

## Funções e contacto

- **Responsável pelo tratamento:** Luis Mesquita, em nome individual. Decide, em última instância, as finalidades, localização e enquadramento das câmaras e responsabiliza-se pelo tratamento.
- **Responsável técnico e operacional:** Luis Carreiro, em nome individual.
- Luis Carreiro não é designado nem apresentado como Encarregado de Proteção de Dados.
- **Contacto público do projeto e de privacidade:** `livesantamaria.project@gmail.com`.

Não inventar nem publicar morada ou telefone. A necessidade de outros dados de contacto deve ser novamente apreciada antes da publicação e sempre que a estrutura jurídica ou operacional do projeto mude.

## Finalidades e fundamentos

### Métricas opcionais

Finalidade: conhecer, de forma agregada, o número de visitas e as câmaras públicas abertas, para compreender a utilização do Site e apoiar decisões operacionais.

Fundamento: consentimento, nos termos do artigo 6.º, n.º 1, alínea a), do RGPD e das regras aplicáveis ao armazenamento/acesso no equipamento terminal. Sem aceitação explícita, o navegador não lê nem cria a sessão analítica e não envia eventos.

A decisão `accepted` ou `refused` é guardada separadamente para respeitar e demonstrar a preferência do visitante. Recusar não limita o Site. Retirar consentimento remove a sessão analítica local e bloqueia eventos posteriores, sem afetar a licitude do tratamento anterior à retirada.

### Câmaras em direto e Timelapse

Finalidade: disponibilizar observação paisagística, meteorológica e marítima informal de Santa Maria.

Fundamento proposto: interesse legítimo, nos termos do artigo 6.º, n.º 1, alínea f), do RGPD. O teste interno de ponderação deve registar finalidade, necessidade, impacto, expectativas razoáveis e salvaguardas antes da publicação.

As câmaras são posicionadas e enquadradas para evitar a identificação de pessoas, matrículas e detalhes privados. Não há reconhecimento facial, leitura de matrículas, seguimento de pessoas nem finalidade de vigilância. Uma captação incidental pode ser comunicada para análise, reposicionamento, ocultação, apagamento ou outra medida adequada.

### Contactos por email

Finalidade: responder a pedidos, propostas de apoio, questões de privacidade e outros assuntos iniciados pelo remetente.

Fundamento: diligências solicitadas pela pessoa, quando aplicável, e interesse legítimo em responder e gerir a correspondência. O projeto trata apenas os dados fornecidos na mensagem e os metadados normais do email.

### Segurança e operação

Finalidade: manter disponibilidade, diagnosticar falhas, prevenir abuso e demonstrar a execução das rotinas de retenção.

Fundamento proposto: interesse legítimo na segurança e operação do serviço. Os logs controlados pelo projeto não devem conter deliberadamente corpos de pedidos, tokens, credenciais, identificadores de sessão analítica ou dados não necessários.

## Dados e retenção

### Imagem em direto

A transmissão em direto pode conter imagem incidental de pessoas, veículos ou propriedades, apesar do enquadramento preventivo. O projeto não pretende identificar essas pessoas. Segmentos técnicos transitórios e cache de entrega são limitados ao necessário para transmitir o serviço e aos prazos do fornecedor técnico aplicável.

### Timelapse

Para a release v2, a configuração técnica efetiva de cada nó Timelapse deve cumprir:

- capturas individuais: 3 dias;
- vídeos diários: últimos 10;
- vídeos semanais arquivados: últimos 4;
- ficheiros correntes: substituídos pelo ciclo seguinte;
- miniaturas: substituídas ou reconstruídas pelo processo técnico.

Estes limites substituem a configuração anterior de 30 vídeos diários e 6 semanais. A Política não pode ser promovida para produção até a Infra estar alterada e verificada. Uma nova câmara Timelapse só pode ser publicada com retenção documentada. Qualquer mudança posterior exige alinhamento da configuração, registo interno e texto público antes ou no momento em que produza efeitos.

### Métricas

Cada evento contém apenas:

- data e hora;
- tipo `visit` ou `camera_view`;
- identificador público da câmara, quando aplicável;
- host público canónico;
- identificador aleatório de sessão;
- chave técnica de deduplicação.

O projeto não grava deliberadamente o endereço IP, User-Agent, email, identidade Cloudflare Access ou conta pessoal na base D1 de métricas. Os eventos brutos são eliminados diariamente quando tiverem mais de 30 dias. Os resumos apresentados contêm apenas contagens agregadas dentro dessa janela.

A sessão do navegador dura 30 minutos após a atividade mais recente. Como não existe uma ligação persistente entre a pessoa e um identificador aleatório anterior, o projeto pode não conseguir localizar retroativamente eventos específicos para responder a um pedido individual. A Política deve explicar esta limitação com clareza, sem negar o direito de apresentar um pedido ou reclamar.

### Email e logs

- emails: até 12 meses após o encerramento do assunto, salvo obrigação legal ou necessidade de exercer ou defender direitos;
- logs técnicos controlados pelo projeto: no máximo 14 dias;
- logs próprios dos fornecedores: segundo a configuração, os termos e os prazos aplicáveis do fornecedor, a documentar no registo interno.

## Destinatários, fornecedores e transferências

A Política identifica as categorias e, quando útil para transparência, os fornecedores atuais:

- **Cloudflare:** Pages, Functions, D1, CDN/Tunnel, segurança e proteção do serviço;
- **Google/Gmail:** receção e conservação do correio do projeto;
- **jsDelivr:** entrega da biblioteca HLS carregada pelo navegador;
- **Open-Meteo:** dados meteorológicos/marítimos pedidos diretamente pelo navegador;
- **SpotAzores:** imagens ou streams externos usados em algumas câmaras.

Ligações diretas a estes serviços podem comunicar endereço IP, data/hora e informação técnica normal do pedido ao fornecedor. A Política não afirma que nenhum IP é tratado; distingue o tratamento técnico do fornecedor da ausência de IP na base de métricas do projeto.

O registo interno deve guardar a revisão atual dos termos, DPA, subprocessadores, regiões e mecanismos de transferência. Quando houver tratamento ou acesso fora do Espaço Económico Europeu, o texto público refere as garantias aplicáveis, como decisão de adequação ou cláusulas contratuais-tipo, sem declarar uma garantia que não tenha sido verificada.

Links externos de patrocinadores, entidades ou conteúdos só transmitem dados ao destino depois de o visitante os ativar. Esta distinção não se aplica a bibliotecas, meteorologia, imagens e streams carregados automaticamente pelo Site.

## Direitos e procedimento

A Política informa sobre os direitos de:

- acesso;
- retificação;
- apagamento;
- limitação;
- oposição, nomeadamente ao tratamento baseado em interesse legítimo;
- portabilidade, quando aplicável;
- retirada do consentimento a qualquer momento;
- reclamação à Comissão Nacional de Proteção de Dados.

Os pedidos são enviados para `livesantamaria.project@gmail.com`. O procedimento interno deve:

1. registar de forma privada a receção e o prazo;
2. confirmar o âmbito do pedido;
3. pedir apenas a verificação de identidade proporcional e necessária;
4. responder, em regra, no prazo de um mês;
5. registar decisão, execução e eventual fundamento de limitação ou recusa;
6. conservar a evidência do pedido apenas pelo período necessário a demonstrar o cumprimento e defender direitos.

Pedidos sobre imagens devem indicar, quando possível, câmara/local, data e intervalo horário aproximado. A equipa pesquisa apenas o material ainda existente nos limites de retenção. A impossibilidade técnica de relacionar métricas pseudónimas antigas com uma pessoa deve ser explicada caso a caso.

## Conteúdo público

Criar `privacidade.html` com:

1. título, versão, data de entrada em vigor e âmbito;
2. identidade e contacto do responsável;
3. câmaras e Timelapse;
4. métricas e armazenamento local;
5. emails e contactos;
6. logs técnicos e segurança;
7. fornecedores, destinatários e transferências;
8. períodos de conservação;
9. direitos, contacto e reclamação à CNPD;
10. alterações à Política.

O botão `Privacidade` do rodapé passa a ser uma ligação para esta página. O painel de métricas inclui uma ligação direta para a secção de métricas. A página deve usar o mesmo idioma, identidade visual básica, comportamento responsivo e foco visível do Site, sem carregar métricas ou recursos desnecessários.

Não publicar afirmações como “dados anónimos”, “nenhum IP tratado”, “sem cookies” ou “conformidade RGPD garantida”. A Política deve usar linguagem factual: identificadores aleatórios/pseudónimos, armazenamento local e fornecedores técnicos.

## Documentação interna

Criar um registo interno simplificado, sem segredos, com uma linha por tratamento:

- responsável e responsável operacional;
- finalidade;
- categorias de titulares e dados;
- fundamento e, para interesse legítimo, referência ao teste de ponderação;
- destinatários/fornecedores;
- transferências e garantia verificada;
- retenção e mecanismo de eliminação;
- controlo de acesso;
- medidas técnicas e organizativas;
- última revisão e responsável pela revisão.

Criar ainda:

- teste de ponderação para câmaras/Timelapse;
- teste de ponderação para segurança/operação;
- procedimento de exercício de direitos;
- checklist de mudança de câmara, Timelapse, fornecedor, métrica ou retenção;
- evidência operacional de retenção, sem dados de visitantes ou segredos.

## Gatilhos de revisão

Rever documentação e configuração quando:

- entra, sai, muda de posição ou muda de proprietário uma câmara;
- é ativado, desativado ou alterado um Timelapse;
- muda um prazo ou mecanismo de retenção;
- entra ou muda um fornecedor/subprocessador;
- muda o painel, os eventos ou o armazenamento local das métricas;
- passa a existir formulário, conta, newsletter, publicidade ou pagamento;
- ocorre um pedido de direitos, incidente ou captação identificável relevante;
- muda o responsável pelo tratamento, responsável técnico ou contacto.

## Ordem de implementação e gates

1. Alterar na Infra a retenção Timelapse para 3 dias, 10 diários e 4 semanais; testar e guardar evidência sem imagens identificáveis.
2. Preparar os documentos públicos e internos.
3. Ligar o rodapé e o painel à Política.
4. Rever fornecedores, DPA/subprocessadores, transferências e prazos configurados.
5. Verificar a eliminação de métricas após 30 dias e de logs após 14 dias.
6. Executar testes automáticos e revisão visual/acessível em `teste.livesantamaria.org`.
7. Obter aprovação de Luis Mesquita para o texto e os testes de ponderação.
8. Só depois promover Política, Site, métricas, Worker, D1 e WAF na ordem operacional da release v2.

A aprovação deste desenho não autoriza alteração remota dos nós, publicação em produção, migration D1, deployment do Worker, WAF ou merge para `main`. Cada mutação remota mantém o gate explícito já definido no runbook.

## Aceitação

- Política pública em português de Portugal, completa e legível.
- Texto e implementação usam os mesmos campos, finalidades e prazos.
- O painel mantém métricas desativadas antes do consentimento e liga à secção correta.
- A Infra verificada aplica 3 dias, 10 vídeos diários e 4 semanais.
- Eventos brutos de audiência têm retenção de 30 dias e logs do projeto 14 dias.
- Emails têm regra de 12 meses após encerramento, com exceções limitadas.
- Não existem alegações de anonimato absoluto nem omissão dos fornecedores carregados pelo navegador.
- Os documentos internos contêm responsáveis, fundamentos, retenção, direitos, fornecedores e gatilhos de revisão sem credenciais.
- Suite Site/Infra relevante passa e `git diff --check` está limpo.
- O ambiente de teste permite abrir a Política, alterar consentimento e usar o Site depois de recusar.

## Referências oficiais usadas no desenho

- RGPD, em especial artigos 5.º, 6.º, 12.º–21.º e 30.º: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- Diretiva 2002/58/CE, artigo 5.º, n.º 3: https://eur-lex.europa.eu/eli/dir/2002/58/art_5/par_3/oj/eng
- CNPD, nota sobre cookies analíticos: https://www.cnpd.pt/media/x2zdus50/nota-informativa-cnpd_cookies_20210625.pdf
- CNPD, direitos dos titulares: https://www.cnpd.pt/cidadaos/direitos/
- Cloudflare, informação RGPD/DPA: https://www.cloudflare.com/trust-hub/gdpr/
