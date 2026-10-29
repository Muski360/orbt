# ORBT — Identidade visual

**Direção:** brutalismo gráfico aplicado a uma ferramenta de trabalho.  
**Versão:** 1.0  
**Data:** 29/10/2026  
**Aplicação:** orientação para as futuras telas descritas no [README](../README.md).

## 1. Conceito

A ORBT organiza o trabalho de uma equipe criativa em um quadro compartilhado. Sua identidade deve transmitir **clareza, presença e movimento**, com a aparência de um quadro de produção: blocos bem definidos, marcações visíveis e informação direta.

O brutalismo será expresso por contraste forte, cantos retos, tipografia de peso alto, linhas expostas e sombras secas. A composição deve parecer deliberada e funcional. A experiência precisa continuar confortável para quem consulta e movimenta tarefas durante o dia.

Três elementos devem tornar a ORBT reconhecível: o isotipo orbital existente, os cabeçalhos de coluna com contadores monoespaçados e as ações em verde-lima sobre uma base clara. O movimento entre colunas é a principal expressão de dinamismo da marca.

## 2. Marca

Preservar os arquivos disponíveis em `public/assets/`:

- [Logotipo](../public/assets/orbt_logo.png): identificação da marca em áreas com espaço suficiente.
- [Isotipo vetorial](../public/assets/orbt_isotipo.svg): assinatura compacta em navegação e identificação do produto.
- [Isotipo PNG](../public/assets/orbt_isotipo.png): alternativa raster quando necessária.

O isotipo vetorial utiliza o preto `#0B0B0B`, que será a referência para textos e contornos. As curvas do símbolo orbital contrastam com a estrutura retangular da interface.

Manter as proporções originais e uma área livre ao redor da marca equivalente, no mínimo, a um quarto de sua altura. Usar sobre fundos claros e lisos, garantindo a leitura. Em um contexto escuro, posicionar a versão existente em uma área clara. Não distorcer, inclinar, aplicar gradientes ou adicionar efeitos à marca.

## 3. Cores

A base clara ocupa a maior parte da tela. O verde-lima destaca a ação principal; as demais cores têm funções específicas.

| Papel | Cor | Aplicação |
| --- | --- | --- |
| Papel | `#F2F0E9` | Fundo principal e áreas de descanso visual. |
| Superfície | `#FFFFFF` | Tarefas, formulários e diálogos. |
| Tinta | `#0B0B0B` | Texto principal, bordas, ícones e sombras. |
| Texto secundário | `#55534D` | Descrições e informações complementares sobre fundos claros. |
| Ação | `#C7F000` | Botão principal, destaque de seleção e destino válido durante o arraste. |
| Informação | `#2448D8` | Links, foco de teclado e identificação de trabalho em andamento. |
| Conclusão | `#17603A` | Identificação de tarefa concluída e mensagens de sucesso. |
| Erro | `#B42318` | Erros de formulário e ações destrutivas. |

Usar texto preto sobre verde-lima. Usar texto branco sobre azul, verde de conclusão e vermelho. O texto secundário fica restrito aos fundos claros. A cor de ação não deve ser usada como texto sobre branco.

O produto terá inicialmente uma direção clara, sem alternância automática de tema. Não usar gradientes, transparências que prejudiquem a leitura ou uma cor diferente para cada cartão.

### Cores no Kanban

| Status | Tratamento |
| --- | --- |
| A Fazer | Cabeçalho claro, marcador preto e nome por extenso. |
| Em Andamento | Marcador azul e nome por extenso. |
| Concluído | Marcador verde e nome por extenso. |

Os cartões permanecem brancos. A identificação do status deve combinar posição, texto e marcador, sem depender apenas da cor. O verde-lima permanece associado à interação e não representa um quarto status.

## 4. Tipografia

Reaproveitar **Geist** e **Geist Mono**, já configuradas no projeto. O contraste entre pesos e funções construirá a personalidade brutalista sem exigir novas famílias.

| Função | Família e peso | Tamanho de referência |
| --- | --- | --- |
| Título de página | Geist, 800 | 40 px no computador; 28 px no celular. |
| Título de seção ou coluna | Geist, 700 | 20–24 px. |
| Título de tarefa | Geist, 600 | 16 px. |
| Texto e campos | Geist, 400 | 16 px; entrelinha de 1,5. |
| Botões e navegação | Geist, 600 | 14–16 px. |
| Contadores e metadados curtos | Geist Mono, 500 | 12–14 px. |

Usar caixa alta em rótulos curtos, como **A FAZER**, e preservar a escrita natural em títulos de tarefas, descrições e mensagens. Evitar parágrafos inteiros em caixa alta ou fonte monoespaçada. Títulos podem ter entrelinha de 1,1 a 1,2; os cartões devem permitir quebra de linha para nomes longos.

Os contadores podem utilizar dois dígitos, como `03`, como recurso visual. Não inventar identificadores de tarefas apenas para decorar. Se as fontes falharem, utilizar uma fonte sans-serif do sistema para Geist e uma monoespaçada do sistema para Geist Mono.

## 5. Composição e formas

- **Estrutura:** faixas e blocos retangulares, com alinhamentos explícitos e hierarquia entre navegação, projeto e tarefas.
- **Bordas:** 2 px em controles e cartões; 3 px em divisórias principais. Cor de tinta.
- **Cantos:** retos nos componentes. Avatares podem ser circulares para distinguir pessoas de tarefas e ações.
- **Sombras:** deslocamento seco de 4 px nos dois eixos, sem desfoque. Reservar para ação principal, diálogo e cartão em arraste; o quadro em repouso deve permanecer visualmente leve.
- **Espaçamento:** escala de 4, 8, 12, 16, 24, 32 e 48 px. Usar 16 px dentro de cartões e 24 px entre áreas principais.
- **Densidade:** manter títulos, responsável e ações fáceis de localizar. Mostrar a descrição completa nos detalhes da tarefa para preservar a leitura do quadro.

No computador, o quadro ocupa a área principal, com três colunas alinhadas. O cabeçalho apresenta o projeto e a ação **Criar tarefa**. A navegação de projetos deve ocupar uma área secundária e estável. O usuário precisa reconhecer seu contexto antes de executar uma ação.

## 6. Componentes e estados

| Elemento | Direção visual |
| --- | --- |
| Ação principal | Fundo verde-lima, texto preto, borda preta e sombra seca. Uma ação dominante por contexto. |
| Ação secundária | Fundo claro, texto preto e borda preta. |
| Ação destrutiva | Texto ou fundo vermelho conforme a ênfase, com rótulo explícito e confirmação. |
| Cartão de tarefa | Fundo branco, borda preta, título destacado e responsável em área consistente. |
| Cabeçalho de coluna | Nome do status, marcador e contador monoespaçado separados por uma divisória. |
| Campo de formulário | Fundo branco, borda visível, rótulo persistente e erro textual junto ao campo. |
| Diálogo | Superfície clara, contorno forte, título objetivo e ações em ordem previsível. |
| Estado selecionado | Marcador ou contorno preto com destaque verde-lima; seleção também identificável por texto ou estado acessível. |
| Controle indisponível | Aparência atenuada e indicação da indisponibilidade, preservando a leitura do rótulo. |

O estado vazio deve explicar o que falta: **Nenhuma tarefa em andamento**. Quando a ação for permitida, oferecer um caminho direto para criar uma tarefa. Erros devem explicar o ocorrido e a ação possível, como **Não foi possível salvar. Tente novamente.** Durante o carregamento, manter a estrutura estável e apresentar uma indicação textual discreta.

As permissões definidas no README orientam a disponibilidade das ações. A interface deve evitar controles que aparentem permitir uma operação proibida.

## 7. Ícones, imagens e linguagem

Utilizar ícones simples, de contorno uniforme, preferencialmente em uma grade de 24 px e com traço de 2 px. Manter a mesma linguagem em adicionar, editar, excluir, fechar e movimentar. Ações importantes devem ter rótulo; botões somente com ícone precisam de nome acessível.

O próprio quadro, a marca e a tipografia são o material visual principal. Não são necessárias fotografias, ilustrações genéricas, texturas ou elementos espaciais adicionais. Avatares podem usar iniciais quando não houver imagem.

A comunicação será em português brasileiro, com verbos diretos: **Criar projeto**, **Criar tarefa**, **Salvar alterações** e **Excluir tarefa**. Não exibir termos internos como JWT, bcrypt ou MongoDB nos fluxos comuns do produto.

## 8. Interação e movimento

O gesto característico é deslocar uma tarefa entre colunas. O cartão em arraste ganha sombra seca, o local de origem mantém uma indicação de espaço e o destino válido recebe um destaque verde-lima. Evitar rotação do cartão e efeitos que dificultem a leitura.

Botões podem simular pressão com deslocamento de até 2 px e redução da sombra. Transições de cor, contorno e deslocamento devem durar aproximadamente 100–160 ms, com resposta imediata à interação. Não usar animação contínua da marca, cursor personalizado ou efeitos de rolagem no quadro de trabalho.

Respeitar a preferência por movimento reduzido, removendo deslocamentos decorativos. Mudanças de status e resultados de operações precisam continuar perceptíveis por texto e estado visual. A mudança de status também deve funcionar por um controle acessível por teclado e toque.

## 9. Responsividade e acessibilidade

No celular, reorganizar o cabeçalho, permitir quebra das ações e apresentar as colunas empilhadas na mesma ordem do quadro. Preservar os nomes dos status e os contadores. O arraste será um complemento à mudança de status por controle explícito.

Usar texto base de 16 px, áreas interativas de pelo menos 44 × 44 px e foco visível com contorno azul de 3 px e afastamento de 3 px sobre uma superfície clara. Manter a sequência de foco coerente com a leitura e não exigir hover para revelar ações essenciais.

Na implementação, verificar contraste mínimo de 4,5:1 para texto comum e de 3:1 para texto grande e elementos gráficos essenciais, além de navegação por teclado, ampliação e leitura em telas estreitas. O estilo brutalista não justifica cortes de conteúdo, baixa legibilidade ou ações sem identificação.

## 10. Aplicação por tela

| Área | Aplicação da identidade |
| --- | --- |
| Login | Marca sobre fundo de papel, título forte e formulário com campos delimitados. |
| Projetos | Listagem com divisórias claras, nomes em destaque e uma ação principal de criação quando permitida. |
| Quadro Kanban | Três colunas, cabeçalhos com contadores e cartões consistentes; verde-lima reservado à ação e ao arraste. |
| Contas e membros | Informação organizada em linhas ou blocos, papéis identificados por texto e ações de associação explícitas. |
| Formulários e confirmações | Mesma tipografia, bordas e espaçamento do quadro; consequências de exclusão apresentadas com clareza. |

Este documento define a direção visual. A validação de contraste, composição responsiva e comportamento dos componentes deve ocorrer sobre as telas implementadas.
