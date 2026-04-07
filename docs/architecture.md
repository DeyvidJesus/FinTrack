# Arquitetura Tecnica do FinTrack

## Objetivo arquitetural

O FinTrack foi estruturado como uma aplicacao full stack TypeScript com foco em baixo atrito de desenvolvimento local. A arquitetura privilegia:

- simplicidade operacional
- tipagem compartilhada entre cliente e servidor
- baixa quantidade de infraestrutura externa
- experiencia rapida para prototipacao e iteracao

Em vez de separar frontend e backend em repositorios ou processos totalmente independentes, o projeto usa um unico workspace onde o servidor Express entrega a API e tambem hospeda a aplicacao React.

## Visao em camadas

```text
React UI
  -> TanStack Query
    -> fetch/apiRequest
      -> Express routes
        -> validacao Zod
          -> DatabaseStorage
            -> Drizzle ORM
              -> SQLite (better-sqlite3)
```

## Organizacao de diretorios

### `client/`

Contem a SPA React. Os principais elementos sao:

- `src/App.tsx`: shell principal da aplicacao, providers globais e roteamento
- `src/pages/*`: paginas de dominio como dashboard, contas, transacoes, investimentos e metas
- `src/components/*`: componentes reaproveitaveis e componentes especificos da app
- `src/components/ui/*`: biblioteca de componentes baseada em `shadcn/ui`
- `src/lib/queryClient.ts`: configuracao da comunicacao HTTP e cache
- `src/lib/utils.ts`: utilitarios de formatacao e composicao de classes

### `server/`

Responsavel pelo bootstrap HTTP, pela API e pela forma como o frontend e servido em dev e producao.

- `index.ts`: inicializa o Express, middlewares, logging e o servidor HTTP
- `routes.ts`: registra endpoints REST
- `storage.ts`: implementa a logica de acesso a dados e parte da regra de negocio
- `vite.ts`: integra o Vite em modo middleware no desenvolvimento
- `static.ts`: serve o build estatico em producao

### `shared/`

E o ponto central de contrato entre frontend e backend.

- `schema.ts`: define tabelas Drizzle, tipos inferidos e schemas de insercao com `drizzle-zod`

Esse desenho evita duplicacao de interfaces e ajuda a manter API, persistencia e frontend alinhados.

### `script/`

- `build.ts`: orquestra o build do cliente com Vite e o bundle do servidor com esbuild

## Runtime e ciclo de requisicao

## 1. Inicializacao

O entrypoint do servidor e `server/index.ts`. Ele:

- cria a app Express
- monta `express.json()` e `express.urlencoded()`
- adiciona logging para chamadas `/api`
- registra rotas
- escolhe entre `setupVite()` em desenvolvimento e `serveStatic()` em producao
- sobe o servidor HTTP na porta `5000` por padrao

## 2. Cliente

O cliente React sobe a partir de `client/src/main.tsx`. Se a URL nao tiver hash, o app injeta `#/`, o que indica que o roteamento usa hash.

Em `client/src/App.tsx`, os providers globais sao montados nesta ordem:

- `QueryClientProvider`
- `ThemeProvider`
- `TooltipProvider`
- `Router` do `wouter` com `useHashLocation`
- `SidebarProvider`

Esse arranjo garante que a navegacao do sidebar e das paginas compartilhe o mesmo contexto de roteamento.

## 3. Consulta de dados

As leituras usam `useQuery` do `TanStack Query`. O `queryFn` padrao em `client/src/lib/queryClient.ts` transforma o `queryKey` em URL e executa `fetch`.

Exemplos:

- `["/api/accounts"]` -> `GET /api/accounts`
- `["/api/transactions", "?accountId=1"]` -> `GET /api/transactions/?accountId=1`

Observacao importante: esse padrao funciona, mas mistura semantica de cache com construcao textual de URL. Em uma evolucao futura, vale considerar uma camada de client API explicita para reduzir esse acoplamento.

## 4. Mutacoes

Criacoes, atualizacoes e exclusoes usam `useMutation` com `apiRequest()`. Depois da conclusao:

- queries relacionadas sao invalidadas manualmente
- a UI e atualizada por refetch
- toasts notificam o usuario

Esse fluxo e simples e previsivel, mas depende de o desenvolvedor lembrar quais caches invalidar para cada mutacao.

## Persistencia e modelo de dados

## Banco

O projeto usa `SQLite` com arquivo local `data.db`, acessado por `better-sqlite3`. A conexao e aberta em `server/storage.ts`.

Configuracoes relevantes:

- `journal_mode = WAL` para melhor comportamento de leitura/escrita concorrente local
- `foreign_keys = ON` para aplicar integridade referencial

## Criacao de schema

Apesar de existir configuracao do `Drizzle Kit` em `drizzle.config.ts`, o projeto atualmente tambem executa `CREATE TABLE IF NOT EXISTS` manualmente via `ensureSchema()` em tempo de execucao.

Isso revela uma arquitetura hibrida:

- `Drizzle` e usado para modelagem e queries
- a criacao inicial do banco ainda nao depende exclusivamente de migrations versionadas

Esse modelo e pratico para bootstrap local, mas traz um trade-off importante: a evolucao de schema pode ficar mais dificil de auditar quando a aplicacao crescer.

## Tabelas principais

### `accounts`

Representa contas financeiras, com suporte a:

- nome
- tipo (`personal` ou `company`)
- moeda
- saldo
- cor de identificacao

### `categories`

Categoriza receitas e despesas. O projeto faz seed automatico de categorias padrao caso a tabela esteja vazia.

### `transactions`

Modela movimentacoes financeiras com:

- descricao
- valor
- tipo (`income`, `expense`, `transfer`)
- data
- conta
- categoria opcional
- observacoes opcionais

### `investments`

Modela posicoes de investimento com valor investido, valor atual e data de compra.

### `goals`

Representa metas financeiras com valor alvo, valor atual e prazo opcional.

## Regra de negocio centralizada em `DatabaseStorage`

A classe `DatabaseStorage` concentra CRUD e algumas invariantes da aplicacao.

O caso mais importante e o saldo das contas:

- ao criar transacao, o saldo da conta e ajustado
- ao atualizar transacao, o delta antigo e revertido antes de aplicar o novo
- ao excluir transacao, o impacto e removido do saldo

Isso mantem o saldo como dado materializado na tabela `accounts`, em vez de recalcula-lo sob demanda a partir do historico de transacoes.

### Vantagem

- leitura rapida do saldo atual

### Trade-off

- maior cuidado com consistencia ao editar ou remover transacoes

Hoje a regra esta correta para `income` e `expense`. O tipo `transfer` existe no schema, mas ainda nao possui uma modelagem completa de transferencia entre duas contas.

## API e desenho dos endpoints

`server/routes.ts` organiza a API por recurso:

- `/api/accounts`
- `/api/categories`
- `/api/transactions`
- `/api/investments`
- `/api/goals`
- `/api/stats`

O padrao predominante e CRUD simples com `GET`, `POST`, `PATCH` e `DELETE`.

## Validacao

Nas rotas de criacao, os payloads passam por `safeParse()` usando os schemas derivados do `Drizzle`.

Beneficios:

- validacao de borda na API
- coerencia entre modelo de dados e contrato HTTP
- mensagens de erro razoavelmente claras

Limite atual:

- `PATCH` usa `req.body` quase sem validacao forte, o que abre espaco para payloads parciais inconsistentes

## Endpoint agregado `/api/stats`

Esse endpoint e relevante arquiteturalmente porque encapsula a montagem do dashboard no servidor. Ele calcula:

- saldos por tipo de conta
- saldo total
- valor total investido
- retorno percentual da carteira
- receitas e despesas do mes atual
- serie mensal dos ultimos 6 meses
- breakdown de despesas por categoria
- transacoes recentes

### Vantagem

- cliente simples, com menos composicao e menos round trips para o dashboard

### Trade-off

- a agregacao e feita em memoria sobre conjuntos retornados do banco
- em volumes maiores, seria melhor migrar parte desses calculos para queries SQL dedicadas

## Frontend e composicao da interface

## Roteamento

O projeto usa `wouter`, uma alternativa leve ao React Router.

Caracteristicas relevantes:

- baixo custo conceitual
- uso de hash routing, compatível com deploy simples
- rotas declaradas diretamente em `App.tsx`

Rotas atuais:

- `/`
- `/transactions`
- `/investments`
- `/goals`
- `/accounts`

## Gerenciamento de dados

`TanStack Query` cumpre tres papeis:

- cache de respostas
- sincronizacao assíncrona
- padrao consistente para loading, sucesso e erro

Configuracao importante no projeto:

- `staleTime: Infinity`
- `refetchOnWindowFocus: false`
- `retry: false`

Essa combinacao favorece previsibilidade local e evita refetches automaticos inesperados. Em troca, a atualizacao depende fortemente da invalidação manual apos mutacoes.

## Sistema visual

A UI usa:

- `Tailwind CSS` para layout e tokens utilitarios
- componentes de `shadcn/ui` em `client/src/components/ui`
- `lucide-react` para iconografia
- `Recharts` para visualizacao de dados

O `ThemeProvider` controla modo claro/escuro com persistencia em `localStorage`.

## Build e entrega

## Desenvolvimento

No modo `dev`, o servidor Express integra o `Vite` como middleware. Isso permite:

- HMR no frontend
- API e interface servidas do mesmo processo
- menor complexidade operacional

## Producao

O script `script/build.ts` executa:

1. build do cliente com `vite build`
2. bundle do servidor com `esbuild`

Saidas:

- frontend em `dist/public`
- backend em `dist/index.cjs`

O `vite.config.ts` define `base: "./"`, o que ajuda na portabilidade do build estatico. Em producao, `server/static.ts` serve os assets e aplica fallback para `index.html`.

## Decisoes arquiteturais e trade-offs

## 1. Monolito full stack TypeScript

### Beneficios

- onboarding rapido
- compartilhamento de tipos
- menos infraestrutura

### Custos

- limites de separacao de responsabilidades quando o produto crescer

## 2. SQLite embarcado

### Beneficios

- setup minimo
- excelente para demos, prototipos e uso local

### Custos

- nao resolve cenarios multiusuario e distribuidos com a mesma facilidade de um banco servidor

## 3. Saldo materializado em `accounts`

### Beneficios

- consultas de dashboard mais simples
- leitura imediata do saldo atual

### Custos

- exige manutencao cuidadosa da consistencia

## 4. Dashboard agregado no backend

### Beneficios

- simplifica a UI
- reduz numero de chamadas

### Custos

- centraliza logica no endpoint
- pode exigir refatoracao para SQL analitico no futuro

## Riscos e pontos de atencao

- Nao ha autenticacao, autorizacao ou isolamento por usuario
- Nao existem testes automatizados cobrindo regras financeiras
- `PATCH` nao aplica o mesmo nivel de validacao que `POST`
- O tipo `transfer` existe no dominio, mas ainda nao tem comportamento de transferencia entre contas modelado de ponta a ponta
- A criacao de schema em runtime pode divergir de uma estrategia formal de migrations
- A camada `storage` combina persistencia e regra de negocio, o que pode dificultar modularizacao futura

## Direcoes de evolucao recomendadas

## Curto prazo

- adicionar README de API ou colecao de exemplos de payload
- validar payloads de `PATCH` com schemas parciais
- cobrir `DatabaseStorage` e `/api/stats` com testes
- formalizar melhor erros de dominio e mensagens HTTP

## Medio prazo

- separar servicos de dominio da camada de persistencia
- introduzir migrations versionadas como fonte unica de verdade
- criar suporte real a transferencias entre contas
- padronizar uma camada client para chamadas HTTP

## Longo prazo

- adicionar autenticacao e multi-tenancy
- mover agregacoes mais pesadas para SQL otimizado
- considerar persistencia remota para ambientes compartilhados

## Resumo arquitetural

O FinTrack tem uma arquitetura pragmatica: simples de subir, coerente em tipagem e eficiente para desenvolvimento local. Ele acerta especialmente ao compartilhar contratos entre frontend e backend e ao manter o fluxo de dados compreensivel. Ao mesmo tempo, ja mostra com clareza onde estao os proximos passos naturais de evolucao: testes, validacoes parciais, servicos de dominio mais explicitos e uma estrategia de migrations mais formal.
