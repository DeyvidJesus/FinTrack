import { storage } from "./server/storage";

console.log("🧪 Testando integração completa com saldo do mês anterior\n");

// Limpar dados de teste anteriores
const testAccountName = "Test Account - Full Integration";

// 1. Criar uma conta de teste
console.log("1️⃣ Criando conta de teste...");
const account = storage.createAccount({
  name: testAccountName,
  type: "personal",
  currency: "BRL",
  balance: 0,
  color: "#4F98A3"
});
console.log(`   ✅ Conta criada: ${account.name} (ID: ${account.id})\n`);

// 2. Criar transações em março de 2026
console.log("2️⃣ Criando transações em março de 2026...");
const categories = storage.getCategories();
const salaryCategory = categories.find(c => c.name === "Salary");
const foodCategory = categories.find(c => c.name === "Food & Dining");

storage.createTransaction({
  description: "Salário de Março",
  amount: 5000.00,
  type: "income",
  date: "2026-03-01",
  accountId: account.id,
  categoryId: salaryCategory?.id || null,
  notes: null
});

storage.createTransaction({
  description: "Almoço",
  amount: 50.00,
  type: "expense",
  date: "2026-03-15",
  accountId: account.id,
  categoryId: foodCategory?.id || null,
  notes: null
});

console.log("   ✅ Transações de março criadas\n");

// 3. Verificar entradas diárias de março
console.log("3️⃣ Verificando entradas diárias de março...");
const marchEntries = storage.getDailyEntries(account.id, 2026, 3);
console.log(`   📊 Total de entradas: ${marchEntries.length}`);
marchEntries.forEach(entry => {
  console.log(`   📅 ${entry.year}-${entry.month}-${entry.day}: ${entry.category} = R$ ${entry.amount}`);
});
console.log();

// 4. Criar transações em abril de 2026
console.log("4️⃣ Criando transações em abril de 2026...");

storage.createTransaction({
  description: "Salário de Abril",
  amount: 5000.00,
  type: "income",
  date: "2026-04-01",
  accountId: account.id,
  categoryId: salaryCategory?.id || null,
  notes: null
});

storage.createTransaction({
  description: "Jantar",
  amount: 80.00,
  type: "expense",
  date: "2026-04-10",
  accountId: account.id,
  categoryId: foodCategory?.id || null,
  notes: null
});

console.log("   ✅ Transações de abril criadas\n");

// 5. Buscar saldo do mês anterior (março)
console.log("5️⃣ Verificando saldo acumulado até março...");
const entriesBeforeApril = storage.getDailyEntriesBeforeMonth(account.id, 2026, 4);
console.log(`   📊 Total de entradas antes de abril: ${entriesBeforeApril.length}`);
const saldoMesAnterior = entriesBeforeApril.reduce((sum, e) => sum + e.amount, 0);
console.log(`   💰 Saldo acumulado até março: R$ ${saldoMesAnterior}`);
console.log(`   💵 Esperado: R$ ${5000 - 50} (5000 entrada - 50 despesa)\n`);

// 6. Verificar entradas diárias de abril
console.log("6️⃣ Verificando entradas diárias de abril...");
const aprilEntries = storage.getDailyEntries(account.id, 2026, 4);
console.log(`   📊 Total de entradas: ${aprilEntries.length}`);
aprilEntries.forEach(entry => {
  console.log(`   📅 ${entry.year}-${entry.month}-${entry.day}: ${entry.category} = R$ ${entry.amount}`);
});
const saldoAbril = aprilEntries.reduce((sum, e) => sum + e.amount, 0);
console.log(`   💰 Saldo de abril: R$ ${saldoAbril}`);
console.log(`   💵 Esperado: R$ ${5000 - 80} (5000 entrada - 80 despesa)\n`);

// 7. Calcular saldo projetado
console.log("7️⃣ Calculando projeções...");
const saldoProximoMes = saldoMesAnterior + saldoAbril;
console.log(`   📈 Saldo para maio: R$ ${saldoProximoMes}`);
console.log(`   💵 Esperado: R$ ${(5000 - 50) + (5000 - 80)}\n`);

// 8. Limpar dados de teste
console.log("8️⃣ Limpando dados de teste...");
storage.deleteAccount(account.id);
console.log("   ✅ Conta removida\n");

console.log("✨ Teste completo concluído!");

// Verificações
const expectedMarch = 5000 - 50;
const expectedApril = 5000 - 80;
const expectedTotal = expectedMarch + expectedApril;

if (saldoMesAnterior === expectedMarch) {
  console.log("✅ Saldo de março CORRETO!");
} else {
  console.log(`❌ Saldo de março INCORRETO! Esperado: ${expectedMarch}, Obtido: ${saldoMesAnterior}`);
}

if (saldoAbril === expectedApril) {
  console.log("✅ Saldo de abril CORRETO!");
} else {
  console.log(`❌ Saldo de abril INCORRETO! Esperado: ${expectedApril}, Obtido: ${saldoAbril}`);
}

if (saldoProximoMes === expectedTotal) {
  console.log("✅ Projeção para maio CORRETA!");
} else {
  console.log(`❌ Projeção para maio INCORRETA! Esperado: ${expectedTotal}, Obtido: ${saldoProximoMes}`);
}
