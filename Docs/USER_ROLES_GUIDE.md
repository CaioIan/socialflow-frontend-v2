# Guia de Roles de Usuário - SocialFlow

## Visão Geral

O sistema SocialFlow utiliza um sistema de controle de acesso baseado em papéis (RBAC - Role-Based Access Control) com **3 roles principais**: `ADMIN`, `DESIGNER` e `CLIENT`.

---

## 📋 Estrutura de Roles

### 1. **ADMIN** 👨‍💼
**Nível de Acesso**: Total  
**Descrição**: Administrador completo da plataforma

#### Permissões:
- ✅ **Organizações**: Criar, ler, atualizar, deletar (soft delete) e reativar
- ✅ **Campanhas**: Criar, ler, atualizar, deletar e reativar
- ✅ **Posts**: Criar, ler, atualizar, deletar e reativar
- ✅ **Versões de Posts**: Ler todos os históricos
- ✅ **Comentários**: Ler, criar e gerenciar
- ✅ **Ativos**: Fazer upload e gerenciar (imagens, vídeos)
- ✅ **Usuários**: Gerenciar papéis e permissões (futuro)

#### Características:
- Acesso completo a todas as funcionalidades
- Pode gerenciar múltiplas organizações
- Responsável por configurações críticas do sistema
- Pode desativar/reativar recursos

---

### 2. **DESIGNER** 🎨
**Nível de Acesso**: Leitura + Criação de Conteúdo  
**Descrição**: Profissional responsável pelo design e criação de conteúdo

#### Permissões:
- ✅ **Organizações**: Ler (somente visualização)
- ✅ **Campanhas**: Ler (somente visualização)
- ✅ **Posts**: Ler, criar e atualizar (parcialmente)
- ✅ **Versões de Posts**: Ler histórico de alterações
- ✅ **Comentários**: Ler, criar respostas e sugestões
- ✅ **Ativos**: Fazer upload de imagens/vídeos para uso em posts
- ❌ **Deletar Campanhas/Posts**: Não permitido
- ❌ **Atualizar Organizações**: Não permitido
- ❌ **Gerenciar Usuários**: Não permitido

#### Características:
- Foco em criação e edição de conteúdo
- Não pode deletar recursos (apenas ADMINs)
- Pode visualizar feedback via comentários
- Acesso limitado às organizações que é membro

---

### 3. **CLIENT** 👥
**Nível de Acesso**: Leitura + Aprovação  
**Descrição**: Cliente que aprova e fornece feedback sobre conteúdo

#### Permissões:
- ✅ **Organizações**: Ler (somente visualização)
- ✅ **Campanhas**: Ler (somente visualização)
- ✅ **Posts**: Ler (somente visualização)
- ✅ **Versões de Posts**: Ler histórico (para entender evoluções)
- ✅ **Comentários**: Ler, criar comentários e solicitar alterações
- ✅ **Ativos**: Visualizar (não pode fazer upload)
- ❌ **Criar/Editar Posts**: Não permitido
- ❌ **Criar Campanhas**: Não permitido
- ❌ **Deletar Qualquer Coisa**: Não permitido
- ❌ **Fazer Upload de Ativos**: Não permitido

#### Características:
- Visão de leitura para acompanhamento
- Pode fornecer feedback através de comentários
- Pode solicitar alterações via comentários
- Acesso limitado às organizações que é cliente

---

## 🔐 Matriz de Permissões Detalhada

| Ação | ADMIN | DESIGNER | CLIENT | Autenticação Obrigatória |
|------|-------|----------|--------|--------------------------|
| **ORGANIZAÇÕES** | | | | |
| Criar Organização | ✅ | ❌ | ❌ | Sim |
| Listar Organizações | ✅ | ✅ | ✅ | Sim |
| Visualizar Organização | ✅ | ✅ | ✅ | Sim |
| Atualizar Organização | ✅ | ❌ | ❌ | Sim |
| Deletar Organização | ✅ | ❌ | ❌ | Sim |
| Reativar Organização | ✅ | ❌ | ❌ | Sim |
| **CAMPANHAS** | | | | |
| Criar Campanha | ✅ | ❌ | ❌ | Sim |
| Listar Campanhas | ✅ | ✅ | ✅ | Sim |
| Visualizar Campanha | ✅ | ✅ | ✅ | Sim |
| Atualizar Campanha | ✅ | ❌ | ❌ | Sim |
| Deletar Campanha | ✅ | ❌ | ❌ | Sim |
| Reativar Campanha | ✅ | ❌ | ❌ | Sim |
| **POSTS** | | | | |
| Criar Post | ✅ | ✅ | ❌ | Sim |
| Listar Posts | ✅ | ✅ | ✅ | Sim |
| Visualizar Post | ✅ | ✅ | ✅ | Sim |
| Atualizar Post | ✅ | ✅* | ❌ | Sim |
| Deletar Post | ✅ | ❌ | ❌ | Sim |
| Reativar Post | ✅ | ❌ | ❌ | Sim |
| **VERSÕES DE POST** | | | | |
| Listar Histórico | ✅ | ✅ | ✅ | Sim |
| Visualizar Versão | ✅ | ✅ | ✅ | Sim |
| **COMENTÁRIOS** | | | | |
| Criar Comentário | ✅ | ✅ | ✅ | Sim |
| Listar Comentários | ✅ | ✅ | ✅ | Sim |
| Deletar Comentário | ✅ | ✅* | ❌ | Sim |
| **ATIVOS (Assets)** | | | | |
| Upload de Arquivo | ✅ | ✅ | ❌ | Sim |
| Listar Ativos | ✅ | ✅ | ✅ | Sim |
| Deletar Ativo | ✅ | ❌ | ❌ | Sim |

*\* Somente seus próprios recursos*

---

## 🔄 Fluxo de Trabalho Típico

### Exemplo: Aprovação de Post

```
1. DESIGNER cria um novo post
   └─ POST /posts (requer role ADMIN)

2. DESIGNER marca como pronto para revisão
   └─ PATCH /posts/:id (requer role ADMIN)

3. CLIENT visualiza o post
   └─ GET /posts/:id (requer autenticação)

4. CLIENT deixa comentário solicitando alteração
   └─ POST /post-comments (qualquer role autenticado)

5. DESIGNER vê comentário e atualiza o post
   └─ PATCH /posts/:id (requer role ADMIN)

6. CLIENT aprova e comenta
   └─ POST /post-comments (qualquer role autenticado)

7. ADMIN finaliza ou publica
   └─ PATCH /posts/:id (requer role ADMIN)
```

---

## 🛡️ Segurança e Autenticação

### Requisitos Globais:
- ✅ **Todos os endpoints** requerem autenticação via JWT Token
- ✅ Token deve estar no header: `Authorization: Bearer <token>`
- ✅ Token contém: `userId`, `role` e `organizationId`
- ✅ Sistema valida permissões em tempo de execução

### Respostas de Erro:

| Código | Significado | Solução |
|--------|------------|---------|
| **401** | Não autenticado (sem token) | Fazer login |
| **403** | Proibido (role insuficiente) | Usar conta com role apropriado |
| **404** | Recurso não encontrado | Verificar ID do recurso |
| **400** | Requisição inválida | Verificar dados enviados |

---

## 💡 Boas Práticas no Frontend

### 1. **Verificação de Permissões**
```javascript
// Exemplo: Mostrar botão apenas para ADMIN
if (userRole === 'ADMIN') {
  // Mostrar botão de "Criar Post"
}
```

### 2. **Tratamento de Erros**
```javascript
// Se receber 403, informar: "Você não tem permissão para esta ação"
// Se receber 401, redirecionar para login
```

### 3. **Exibição de UI**
- **ADMIN**: Mostrar todos os botões (criar, editar, deletar)
- **DESIGNER**: Mostrar botões de criar/editar, esconder deletar
- **CLIENT**: Mostrar apenas comentários e aprovação

### 4. **Otimização**
- Cachear o `userRole` localmente após login
- Atualizar role se houver troca de organização
- Sempre validar no backend (não confie apenas no frontend)

---

## 📊 Resumo Rápido

| Role | Criar | Ler | Atualizar | Deletar |
|------|-------|-----|-----------|---------|
| **ADMIN** | ✅ | ✅ | ✅ | ✅ |
| **DESIGNER** | ✅ | ✅ | ✅* | ❌ |
| **CLIENT** | ❌ | ✅ | ❌ | ❌ |

---

## 🔗 Próximos Passos

1. **Frontend**: Implementar guards baseados em roles
2. **Backend**: Manter validações nos endpoints
3. **Testes**: Validar matriz de permissões
4. **Documentação**: Manter atualizada com novas funcionalidades

---

**Última atualização**: 20 de Abril de 2026  
**Versão**: 1.0
