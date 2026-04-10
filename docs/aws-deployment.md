# Deploy na AWS

## Objetivo

Este documento descreve como publicar o FinTrack na AWS considerando o estado atual do projeto e tambem qual seria a evolucao recomendada para um ambiente mais proximo de producao.

O ponto mais importante e este: hoje a aplicacao usa `SQLite` em arquivo local (`data.db`). Isso funciona muito bem para desenvolvimento e para uma instancia unica, mas limita escalabilidade horizontal, alta disponibilidade real e operacao stateless.

## Resumo executivo

Existem dois caminhos viaveis para a AWS.

### Opcao 1: publicar rapido com a arquitetura atual

Usar:

- `EC2` para executar a aplicacao Node.js
- `EBS` para persistir o arquivo `data.db`
- `Application Load Balancer` opcional
- `Route 53` para DNS
- `ACM` para certificado TLS
- `CloudWatch` para logs e alertas
- `AWS Backup` ou snapshots de `EBS`

Esse e o caminho mais simples porque exige poucas mudancas no codigo.

### Opcao 2: arquitetura recomendada para producao

Migrar o banco para `PostgreSQL` no `Amazon RDS` e usar:

- `ECS Fargate` para rodar a aplicacao em container
- `Application Load Balancer`
- `RDS PostgreSQL`
- `Secrets Manager` ou `SSM Parameter Store`
- `CloudWatch`
- `Route 53` + `ACM`

Esse e o caminho recomendado se a aplicacao for crescer, precisar de ambiente mais resiliente ou suportar mais de uma replica.

## Como o projeto esta hoje

Pelo codigo atual, a aplicacao possui estas caracteristicas operacionais:

- frontend React e API Express servidos pelo mesmo processo Node.js
- build de producao em `dist/index.cjs`
- servidor HTTP escutando em `PORT` e por padrao `5000`
- persistencia local em `SQLite` com arquivo `data.db`
- criacao inicial de tabelas em runtime por `ensureSchema()`
- sem autenticacao e sem dependencia externa obrigatoria

Na pratica, isso significa que a aplicacao pode ser publicada como um unico servico Node.js.

## Arquitetura AWS recomendada por fase

## Fase 1: menor esforco de implantacao

### Desenho

```text
Usuario
  -> Route 53
    -> ALB
      -> EC2
        -> Node.js + Express + frontend build
        -> data.db
      -> EBS volume
```

### Quando usar

- MVP
- ambiente interno
- homologacao
- primeira versao em producao com baixo trafego
- quando o objetivo e publicar sem refatorar persistencia

### Vantagens

- praticamente nenhuma mudanca de arquitetura
- menor custo operacional inicial
- simples de depurar
- `SQLite` continua funcionando de forma segura em disco local da instancia

### Limitacoes

- uma unica instancia ativa
- se a instancia cair, a aplicacao fica indisponivel ate recuperacao
- nao e adequado para autoscaling horizontal
- deploy exige cuidado com o arquivo `data.db`

## Fase 2: arquitetura recomendada para producao

### Desenho

```text
Usuario
  -> Route 53
    -> ALB
      -> ECS Fargate service
        -> container FinTrack
          -> RDS PostgreSQL
          -> CloudWatch Logs
          -> Secrets Manager / Parameter Store
```

### Quando usar

- necessidade de alta disponibilidade melhor
- mais de uma replica da API
- pipeline de deploy mais previsivel
- ambiente com crescimento de volume e uso

### Vantagens

- aplicacao stateless
- deploy e rollback mais seguros
- escalabilidade horizontal
- banco gerenciado e com backup nativo

### Limitacoes

- exige migracao de `SQLite` para `PostgreSQL`
- demanda ajuste em configuracao do Drizzle e na estrategia de bootstrap de schema

## Recomendacao objetiva para este projeto

Se o objetivo for publicar agora, a recomendacao e:

1. subir em `EC2 + EBS`
2. estabilizar operacao, observabilidade e backup
3. depois migrar para `RDS PostgreSQL`
4. por fim mover o runtime para `ECS Fargate`

Isso reduz risco e evita uma refatoracao de infraestrutura e banco ao mesmo tempo.

## Detalhamento da Opcao 1: EC2 + EBS

## Componentes AWS

- `EC2` com `Amazon Linux 2023` ou `Ubuntu`
- `EBS gp3` para armazenar o sistema e o `data.db`
- `Security Group` liberando `80` e `443` no load balancer e somente trafego interno para a porta da app
- `ALB` opcional, mas recomendado se houver dominio e TLS
- `ACM` para certificado HTTPS
- `Route 53` para DNS
- `CloudWatch Agent` ou logs do systemd enviados ao CloudWatch

## Fluxo de deploy

1. criar uma instancia EC2
2. instalar `Node.js 18+`
3. copiar o codigo para a maquina
4. executar `npm install`
5. executar `npm run build`
6. iniciar com `npm start`
7. registrar o processo no `systemd`
8. expor a aplicacao via `Nginx` ou via `ALB`

## Variaveis de ambiente

Hoje a aplicacao depende principalmente de:

- `NODE_ENV=production`
- `PORT=5000`

Variaveis recomendadas para futura evolucao:

- `DATABASE_URL` para sair de arquivo local e ir para banco gerenciado
- `LOG_LEVEL`
- `APP_BASE_URL`

## Exemplo de servico systemd

```ini
[Unit]
Description=FinTrack
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/fintrack
Environment=NODE_ENV=production
Environment=PORT=5000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
User=ec2-user

[Install]
WantedBy=multi-user.target
```

## Estrategia de persistencia

O arquivo `data.db` deve ficar em volume persistente da EC2. O ideal e:

- manter o banco fora da pasta que e trocada em deploy, se possivel
- criar rotina de backup do arquivo
- gerar snapshots do volume `EBS`

Uma organizacao simples seria:

```text
/opt/fintrack/app      # codigo da release
/opt/fintrack/data     # data.db
```

Observacao: no estado atual, `server/storage.ts` abre `new Database("data.db")`, entao o processo espera o banco no diretorio corrente. Para separar codigo e dados com mais seguranca, vale ajustar a aplicacao para aceitar um caminho por variavel de ambiente, por exemplo `SQLITE_PATH`.

## Proxy reverso

Ha dois modelos aceitaveis:

### Com ALB na frente da EC2

- `ALB` recebe `443`
- encaminha para a EC2 na porta `5000`
- TLS termina no load balancer

### Com Nginx na EC2

- `Nginx` recebe `80/443`
- faz proxy para `localhost:5000`
- gzip, cache de assets e headers podem ser configurados no proxy

Se o objetivo for seguir padrao AWS, `ALB + ACM` costuma simplificar o HTTPS.

## Observabilidade minima

Para nao operar no escuro, o ideal e configurar:

- logs da aplicacao no `CloudWatch Logs`
- alarme de CPU
- alarme de memoria via agente
- alarme de status check da EC2
- alarme de espaco em disco

## Backup e recuperacao

Como o dado esta em `SQLite`, backup precisa ser tratado com cuidado.

Recomendacoes:

- snapshots recorrentes de `EBS`
- copia periodica do `data.db` para `S3`
- procedimento documentado de restauracao

Risco importante: backup de arquivo SQLite nao deve ser tratado como simples copia arbitraria em qualquer momento sem validar consistencia. Em producao, o processo ideal precisa considerar janela segura ou estrategia apropriada de snapshot.

## CI/CD sugerido para a Opcao 1

Um pipeline simples pode usar `GitHub Actions`:

1. instalar dependencias
2. executar `npm run check`
3. executar `npm run build`
4. gerar artefato
5. publicar na EC2 por `SSH` ou `SSM`
6. reiniciar o servico `systemd`

## Detalhamento da Opcao 2: ECS Fargate + RDS

## Mudancas necessarias na aplicacao

Para essa arquitetura ser correta, o projeto precisa deixar de depender de `SQLite` local.

Mudancas recomendadas:

- trocar `better-sqlite3` por driver de `PostgreSQL`
- ajustar o `Drizzle` para `pg`
- substituir `ensureSchema()` por migrations versionadas
- parametrizar conexao por `DATABASE_URL`
- revisar tipos SQL e defaults no schema

## Componentes AWS

- `ECR` para armazenar a imagem do container
- `ECS Fargate` para executar a aplicacao
- `ALB` para entrada HTTP/HTTPS
- `RDS PostgreSQL` para persistencia
- `Secrets Manager` para segredos
- `CloudWatch Logs` para logs
- `Route 53` e `ACM`

## Fluxo de deploy

1. build da imagem Docker
2. push para `ECR`
3. atualizacao do service no `ECS`
4. novas tasks sobem
5. health checks validam
6. tasks antigas sao encerradas

## Beneficio tecnico principal

Depois da migracao do banco, a aplicacao deixa de depender do filesystem local e passa a aceitar replicas, rolling deploy e recuperacao com menos acoplamento ao host.

## O que eu nao recomendo neste momento

### Lambda

Nao e a melhor opcao para o estado atual porque:

- a aplicacao foi desenhada para processo Node.js persistente
- `SQLite` local nao combina bem com execucao efemera
- servir SPA e API no mesmo pacote ficaria mais trabalhoso sem ganho claro aqui

### ECS com SQLite em volume compartilhado

Tambem nao e uma boa recomendacao de producao. Mesmo que existam formas de montar volume, o desenho continua fraco para concorrencia, failover e operacao confiavel.

## Seguranca

Antes de ir para internet publica, vale incluir pelo menos:

- `HTTPS`
- `Security Groups` restritivos
- acesso administrativo via `SSM Session Manager` em vez de SSH aberto, se possivel
- segredo e configuracoes fora do codigo
- rotinas de backup testadas

E um ponto importante de produto: hoje a aplicacao nao tem autenticacao. Publicar sem auth significa expor dados financeiros para qualquer pessoa que acesse a URL.

## Checklist de prontidao para AWS

- a aplicacao builda com `npm run build`
- a aplicacao sobe com `npm start`
- a porta e configurada por `PORT`
- existe estrategia de persistencia do banco
- existe estrategia de backup
- logs estao centralizados
- HTTPS esta habilitado
- o acesso publico esta protegido por autenticacao, se o ambiente for externo

## Proximos passos recomendados no proprio codigo

Se quisermos preparar melhor o projeto para AWS, os ajustes de maior valor seriam:

1. adicionar suporte a `SQLITE_PATH` para desacoplar o banco do diretorio da release
2. criar `Dockerfile`
3. mover bootstrap de schema para migrations versionadas
4. preparar a camada de banco para `PostgreSQL`
5. adicionar autenticacao
6. adicionar health check explicito, por exemplo `/health`

## Conclusao

O FinTrack pode ser publicado hoje na AWS sem grandes alteracoes usando `EC2 + EBS`, porque sua arquitetura atual e de processo unico com banco local. Para um ambiente realmente escalavel e mais resiliente, a trilha natural e migrar de `SQLite` para `RDS PostgreSQL` e depois executar a aplicacao em `ECS Fargate`.

Se a decisao for entre "subir rapido" e "subir do jeito mais correto para crescer", a melhor estrategia e subir primeiro em instancia unica e planejar a migracao de banco como a principal etapa de amadurecimento da plataforma.
