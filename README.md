# FinTrack

FinTrack e uma aplicacao full stack para controle financeiro pessoal e empresarial em uma unica interface. O projeto permite cadastrar contas, registrar transacoes, acompanhar investimentos, definir metas financeiras e visualizar indicadores consolidados em um dashboard.

O sistema foi desenhado para ser simples de executar localmente, com uma arquitetura enxuta baseada em React no cliente, Express no servidor e SQLite como persistencia local.

## O que o projeto faz

- Gerencia contas dos tipos `personal` e `company`
- Registra receitas e despesas com categoria, data e conta de origem
- Acompanha investimentos por tipo, custo e valor atual
- Mantem metas financeiras com progresso acumulado
- Exibe um dashboard com saldos, retorno de investimentos, tendencia mensal e distribuicao por categoria

## Principais tecnologias

- `React 18` para a interface
- `TypeScript` em cliente, servidor e contratos compartilhados
- `Vite` para desenvolvimento do frontend
- `Express 5` para a API HTTP
- `Wouter` para roteamento leve no cliente
- `TanStack Query` para cache, leitura e invalidação de dados
- `Drizzle ORM` com `better-sqlite3` para persistencia em `SQLite`
- `Zod` e `drizzle-zod` para validacao de payloads
- `Tailwind CSS` e componentes `shadcn/ui` para a camada visual
- `Recharts` para graficos do dashboard

## Estrutura do projeto

```text
fintrack/
├── client/         # Aplicacao React
├── server/         # API Express, bootstrap e integracao dev/prod
├── shared/         # Schema Drizzle + tipos e validacoes compartilhadas
├── script/         # Build de producao
├── data.db         # Banco SQLite local
└── docs/           # Documentacao tecnica e arquitetural
```

## Como executar

### Requisitos

- `Node.js` 18+
- `npm`

### Desenvolvimento

```bash
npm install
npm run dev
```

O servidor sobe por padrao na porta `5000` e serve tanto a API quanto o frontend.

### Build de producao

```bash
npm run build
npm start
```

### Verificacao de tipos

```bash
npm run check
```

## Visao funcional

### Dashboard

Consolida saldo pessoal e empresarial, receitas e despesas do mes, performance de investimentos, grafico comparativo mensal e ultimas transacoes.

### Accounts

Centraliza a criacao e exclusao de contas, com separacao entre contas pessoais e empresariais, saldo inicial, moeda e cor identificadora.

### Transactions

Permite lancar receitas e despesas e reflete automaticamente o impacto no saldo da conta vinculada.

### Investments

Mantem carteira por conta, com tipo de ativo, custo, valor atual e retorno percentual agregado.

### Goals

Permite definir metas por conta, acompanhar percentual de progresso e atualizar o valor acumulado.

## Fluxo tecnico resumido

1. A UI faz requisicoes HTTP para endpoints em `/api/*`.
2. O servidor valida entradas com schemas `Zod` derivados do schema `Drizzle`.
3. A camada `storage` executa operacoes no SQLite via `Drizzle ORM`.
4. Mutations invalidam queries no `TanStack Query` para manter a interface sincronizada.
5. O dashboard usa um endpoint agregado (`/api/stats`) para evitar composicao pesada no cliente.

## Caracteristicas arquiteturais

- Contratos compartilhados em `shared/schema.ts`, reduzindo divergencia entre frontend e backend
- Banco embarcado com `SQLite`, adequado para setup local e prototipacao rapida
- API CRUD simples, sem camada de autenticacao neste momento
- Cliente SPA com roteamento baseado em hash, o que simplifica o fallback de deploy estatico
- Build separado: `Vite` para o cliente e `esbuild` para o bundle do servidor

## Limitacoes atuais

- Nao ha autenticacao nem multiusuario
- Nao existem testes automatizados no estado atual do projeto
- O banco e local ao ambiente de execucao
- Parte da logica de negocio fica concentrada na classe `DatabaseStorage`
- O endpoint `/api/stats` faz agregacoes em memoria, o que funciona bem em pequeno volume, mas exigiria revisao para escalar

## Documentacao tecnica

O aprofundamento arquitetural esta em [docs/architecture.md](./docs/architecture.md), incluindo:

- organizacao por camadas
- fluxo de dados de ponta a ponta
- modelo de persistencia
- detalhes de build e runtime
- decisoes arquiteturais e trade-offs
- oportunidades de evolucao

Ha tambem uma proposta de publicacao na AWS em [docs/aws-deployment.md](./docs/aws-deployment.md), cobrindo:

- opcao de menor esforco com `EC2 + EBS`
- arquitetura recomendada com `ECS Fargate + RDS`
- limites atuais do uso de `SQLite`
- operacao, backup, seguranca e proximos passos
