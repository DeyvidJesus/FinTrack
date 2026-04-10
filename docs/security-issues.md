# Achados Principais

Problema: API sem autenticação e sem autorização
Severidade: Crítica
Descrição: Todas as rotas de leitura e escrita em server/routes.ts (line 12) estão públicas, e não existe uso real de JWT, sessão ou middleware de identidade, apesar de dependências sugestivas em package.json (line 53). Isso é Broken Access Control/Authentication na prática.
Exemplo de Exploração: Qualquer pessoa com acesso HTTP ao host consegue executar DELETE /api/accounts/1, GET /api/transactions ou PATCH /api/goals/1 sem login, exfiltrando ou destruindo todos os dados financeiros.
Solução (Code Snippet):
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

type AuthReq = Request & { user: { sub: string } };

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.header("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = auth.slice("Bearer ".length);
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    (req as AuthReq).user = payload as { sub: string };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.use("/api", requireAuth);
// Depois disso, filtre dados por owner/userId no storage.
Problema: PATCH sem validação estrita permite adulteração de saldo e payloads inválidos
Severidade: Alta
Descrição: As rotas PATCH em server/routes.ts (line 30) passam req.body direto para o storage, sem safeParse, sem .strict() e sem whitelist. Em server/storage.ts (line 169), PATCH /api/accounts/:id permite alterar balance diretamente, contornando toda a lógica de transações. O mesmo padrão aceita valores inválidos em goals/transactions/investments.
Exemplo de Exploração: Um atacante envia PATCH /api/accounts/1 {"balance":999999999} e manipula o saldo sem registrar transação. Outro caso: PATCH /api/goals/1 {"currentAmount": NaN} pode corromper cálculos e UI.
Solução (Code Snippet):
import { z } from "zod";

const idSchema = z.coerce.number().int().positive();

const updateAccountSchema = insertAccountSchema
  .pick({ name: true, type: true, currency: true, color: true })
  .partial()
  .strict();

app.patch("/api/accounts/:id", (req, res) => {
  const id = idSchema.parse(req.params.id);
  const parsed = updateAccountSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.message });
  }

  const account = storage.updateAccount(id, parsed.data);
  if (!account) return res.status(404).json({ error: "Account not found" });
  res.json(account);
});
Problema: Atualização financeira não transacional pode deixar saldo e razão divergentes
Severidade: Alta
Descrição: Em server/storage.ts (line 200), a transação é gravada e o saldo da conta é ajustado em operações separadas. Em update/delete ocorre o mesmo. Se houver exceção, crash ou corrida futura entre requests, a tabela transactions e o campo materializado accounts.balance podem divergir.
Exemplo de Exploração: Uma falha após insert into transactions mas antes do update accounts deixa a movimentação persistida sem refletir no saldo. Em sistema financeiro isso vira inconsistência silenciosa.
Solução (Code Snippet):
private createTransactionAtomic = sqlite.transaction((data: InsertTransaction) => {
  const tx = db.insert(transactions).values(data).returning().get();

  const account = db.select().from(accounts)
    .where(eq(accounts.id, data.accountId))
    .get();

  if (!account) throw new Error("Account not found");

  db.update(accounts)
    .set({ balance: account.balance + getTransactionDelta(data.type, data.amount) })
    .where(eq(accounts.id, data.accountId))
    .run();

  return tx;
});

createTransaction(data: InsertTransaction): Transaction {
  return this.createTransactionAtomic(data);
}
Problema: Respostas completas da API são gravadas em log
Severidade: Média
Descrição: O middleware em server/index.ts (line 36) serializa o corpo JSON de toda resposta /api. Isso inclui saldos, transações, metas e possivelmente notes, o que expõe dados financeiros em logs.
Exemplo de Exploração: Qualquer operador com acesso a stdout, CloudWatch, container logs ou backups de log consegue ler dados sensíveis sem passar pela camada da aplicação.
Solução (Code Snippet):
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`);
    }
  });

  next();
});
Problema: Estado e infraestrutura chumbados ao arquivo local data.db
Severidade: Média
Descrição: O banco é aberto com caminho fixo em server/storage.ts (line 12), e não há .env.example nem validação central de ambiente. Isso quebra a premissa stateless, dificulta scaling horizontal e pode criar bancos “fantasma” se o processo subir em outro diretório.
Exemplo de Exploração: Um deploy em outro cwd sobe com um data.db vazio; outra réplica lê outro arquivo; rollback perde consistência operacional.
Solução (Code Snippet):
import path from "path";
import { z } from "zod";

const env = z.object({
  PORT: z.coerce.number().default(5000),
  SQLITE_PATH: z.string().default(path.join(process.cwd(), "data.db")),
  JWT_SECRET: z.string().min(32),
}).parse(process.env);

const sqlite = new Database(env.SQLITE_PATH);
Problema: Gargalos de performance no dashboard e nas listas React
Severidade: Média
Descrição: O endpoint server/routes.ts (line 135) faz várias passagens completas sobre allTransactions e allCategories a cada request. No frontend, há buscas lineares por linha em client/src/pages/transactions.tsx (line 82), client/src/pages/investments.tsx (line 89) e client/src/pages/goals.tsx (line 78).
Exemplo de Exploração: Com dezenas de milhares de transações, abrir o dashboard ou renderizar listas longas pode bloquear CPU no backend e deixar a UI lenta por lookup O(n*m).
Solução (Code Snippet):
const accountById = useMemo(
  () => new Map(accounts.map((a) => [a.id, a])),
  [accounts],
);

const getAccountName = (id: number) => accountById.get(id)?.name ?? "Unknown";
const getAccountType = (id: number) => accountById.get(id)?.type ?? "personal";
const monthly = new Map<string, { income: number; expense: number }>();

for (const tx of allTransactions) {
  const month = tx.date.slice(0, 7);
  const bucket = monthly.get(month) ?? { income: 0, expense: 0 };
  if (tx.type === "income") bucket.income += tx.amount;
  if (tx.type === "expense") bucket.expense += tx.amount;
  monthly.set(month, bucket);
}
Notas rápidas

SQL Injection clássica: não encontrei evidência forte no código revisado; o acesso principal usa Drizzle e não há SQL dinâmico com input do usuário fora do bootstrap fixo.

XSS: não encontrei XSS refletido/armazenado óbvio. React escapa strings por padrão, e o dangerouslySetInnerHTML em client/src/components/ui/chart.tsx (line 80) usa configuração interna, não input do usuário.

CSRF e CORS: não há middleware cors() e também não existe autenticação por cookie/sessão; hoje o problema dominante é a API estar pública. Se vocês adicionarem auth baseada em cookies, será obrigatório incluir política explícita de CORS e proteção CSRF.

Validação final: npm run check passou. npm run build não pôde ser validado integralmente porque o sandbox bloqueou um pipe IPC do tsx com EPERM.

Se quiser, no próximo passo eu posso transformar estes achados em um plano de remediação priorizado por sprint, ou aplicar as correções diretamente no código.