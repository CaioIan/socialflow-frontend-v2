# Social Flow | Documentação Técnica & Fluxo
**SOFTWARE HOUSE EDITION**

## 🎯 Contexto do Projeto para a IA (Business Rule Context)

### Por que esta aplicação existe?
Atualmente, o processo de aprovação de artes de social media (marketing) na empresa é um gargalo operacional extremamente manual. O Admin coleta o briefing, planeja via IA, abre chamados para o Design e, ao receber as artes, precisa montar manualmente um documento de prévia (inserindo imagens e legendas) para enviar ao cliente.

**O maior problema:** Se o cliente solicita qualquer alteração, o Admin precisa reenviar a demanda para a designer, aguardar a nova arte, atualizar o documento manualmente do zero e reenviar. Isso gera perda de histórico, confusão de versões e um tempo absurdo gasto em micro-gerenciamento de arquivos.

### O que o Social Flow vai melhorar no fluxo de trabalho?
*   **Fim do micro-gerenciamento (Zero Gargalo do Admin):** O Admin apenas cria a casca do Post (Data + Legenda Fixa) e delega. Quando a Designer faz o upload da arte, ela já fica automaticamente disponível no link do cliente.
*   **Versionamento Automático:** Se a arte precisar de ajustes, a Designer sobe o novo arquivo e o sistema cria a "Versão 2" automaticamente, amarrando o feedback do cliente à versão correta e mantendo a legenda intacta.
*   **Interface Split para o Cliente:** O cliente não recebe mais PDFs ou links confusos. Ele acessa seu portal (White Label), entra na pasta da campanha do mês e visualiza as artes em formato de cards, abrindo o Feed (1:1) lado a lado com os Stories (9:16) para aprovar ou comentar.
*   **Isolamento Total (SaaS Multitenant):** Arquitetura robusta onde cada cliente loga em seu próprio Tenant e visualiza apenas suas campanhas, permitindo escalar o sistema para clientes da agência e clientes particulares.

---

## 🛡️ Isolamento & Multi-tenancy
*   **Arquitetura de Tenant:** Cada Cliente/Empresa é uma `Organization` isolada no DB.
*   **Segurança de Rota:** Middlewares validam o `OrganizationID` em cada request.
*   **Gestão de Acessos:** Admin cadastra e-mails mockados (ex: cliente@socialflow.com.br) para acesso rápido.
*   **Visibilidade Restrita:** Separação estrita de dados baseada na Role do usuário autenticado.

## 📂 Gestão de Conteúdo
*   **Pastas de Campanha:** Admin organiza posts em campanhas (ex: "Maio 2026").
*   **Seletor de Interface:** Cliente loga, vê suas pastas e escolhe qual revisar.
*   **Timeline Cronológica:** Prévias listadas pela data de postagem dentro da pasta.
*   **Status Dinâmico:** Pendente, Alteração Solicitada, Aprovado ou Cancelado (reversível).

---

## 👥 Perfis de Acesso (Roles) e Permissões

### ADMIN (O Seu Fluxo)
**Você tem controle CRUD absoluto.** O seu papel é estruturar o palco para a operação rodar sozinha. Abaixo está o seu fluxo de trabalho **tim tim por tim tim** dentro da aplicação:

1.  **Cadastro da Empresa (Tenant):** Você cria a "Organização" na plataforma (Ex: Radiogenesis) definindo o escopo White Label.
2.  **Cadastro de Credenciais:** Você cria as contas de acesso para aquele cliente (Ex: cria o email *sueli@radiogenesis* e a senha) e envia para eles acessarem o link `/clients/radiogenesis`.
3.  **Cadastro de Equipe:** Você cadastra as designers da sua agência no sistema para que elas tenham contas de acesso restrito.
4.  **Criação da Campanha:** Dentro da organização do cliente, você cria a pasta/campanha mensal (Ex: "Artes Maio 2026").
5.  **Setup de Posts (O preenchimento da demanda):** Dentro da campanha, você preenche o formulário do card:
    *   Define a **Data de Publicação** (Ex: 17/04).
    *   Escreve um brevíssimo texto/briefing sobre o tema da arte.
    *   Cola a **Legenda Oficial** (que é fixa e não será alterada pela designer).
    *   **Designer tem acesso a qualquer campanha** da agência, não apenas a campanha que você está editando.
6.  **Delegação e Saída de Cena:** Acabou o seu trabalho manual. O admin já avisa a designer para subir as artes nos respectivos cards criados pelo admin mas claro dentro das campanhas.

### DESIGNER
*   **Foco na Entrega:** Visualiza e atua apenas nas prévias delegadas a ela.
*   **Versionamento Automático:** Faz upload dos formatos (Feed/Stories). Se editar um arquivo, o sistema gera uma nova versão automaticamente, mantendo a legenda intacta.
*   **Notificações In-App:** Recebe badges no painel quando o cliente sugere uma alteração na sua arte.

### CLIENTE
*   **Acesso Isolado:** Loga no seu próprio Tenant e visualiza o Dashboard de Pastas.
*   **Interface Split:** Analisa prévias visualizando Feed na esquerda e Stories na direita simultaneamente.
*   **Decisão Autônoma:** Aprova, sugere alterações via comentários ou cancela o post (envia para o arquivo).

---

## 🕹️ Simulador de Navegação do Cliente

### Estado Inicial
*   **Logado como:** sueli@radiogenesis
*   **Breadcrumb:** Dashboard > Pastas de Campanha

### Passo 1: Seleção de Campanha
*   **Campanha:** Artes Maio 2026 (12 Postagens) - [📂 Selecionar]
*   **Campanha:** Artes Junho 2026 (0 Postagens) - [📁 Selecionar]

### Passo 2: Lista de Posts (Pasta: Artes Maio 2026)
*   **Post Dia 17/04:** ⏳ Aguardando Aprovação - [🖼️ Abrir Detalhes]

### Passo 3: Detalhe do Post (Post 17/04 - Promoção de Maio)
*   **Informações:** Versão Atual: **v1** | Designer: **Fernanda**
*   **Visualização Split:**
    *   **FORMATO FEED (1:1):** [IMAGEM DO FEED]
    *   **FORMATO STORIES (9:16):** [IMAGEM DO STORY]
*   **Legenda Fixa:** "Garanta seu desconto exclusivo na Radiogenesis este mês! Link na bio. 🚀 #Saude #Maio"
*   **Ações Disponíveis:**
    *   [APROVAR TUDO]
    *   [SOLICITAR ALTERAÇÃO] -> Status: ALTERAÇÃO SOLICITADA (Notificação enviada para a designer Fernanda)
    *   [CANCELAR POST]

### Log do Sistema (Simulação)
*   [SISTEMA]: Usuário sueli@radiogenesis autenticado com sucesso (ROLE: CLIENT).
*   [SISTEMA]: Carregando dashboard e pastas da organização...
*   [AÇÃO]: Cliente abriu a visualização split da prévia.
*   [AÇÃO]: Cliente solicitou alteração. Notificação IN-APP enviada para a Designer.
