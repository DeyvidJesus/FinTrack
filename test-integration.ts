import { storage } from "./server/storage";

console.log("🧪 Testando integração entre transações e controle diário\n");

// Limpar dados de teste anteriores (se existirem)
const testAccountName = "Test Account - Integration";

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

// 2. Buscar uma categoria de despesa (Food & Dining)
const categories = storage.getCategories();
const foodCategory = categories.find(c => c.name === "Food & Dining");
console.log(`2️⃣ Categoria encontrada: ${foodCategory?.name} (ID: ${foodCategory?.id})\n`);

// 3. Criar uma transação de despesa
console.log("3️⃣ Criando transação de despesa...");
const transaction = storage.createTransaction({
  description: "Almoço no restaurante",
  amount: 50.00,
  type: "expense",
  date: "2026-04-13",
  accountId: account.id,
  categoryId: foodCategory?.id || null,
  notes: "Teste de integração"
});
console.log(`   ✅ Transação criada: ${transaction.description} - R$ ${transaction.amount}`);
console.log(`   💰 Saldo da conta: ${storage.getAccount(account.id)?.balance}\n`);

// 4. Verificar se a entrada diária foi criada
console.log("4️⃣ Verificando entrada diária...");
const dailyEntries = storage.getDailyEntries(account.id, 2026, 4);
console.log(`   📊 Total de entradas diárias: ${dailyEntries.length}`);
dailyEntries.forEach(entry => {
  console.log(`   📅 Dia ${entry.day}: ${entry.category} = R$ ${entry.amount}`);
});
console.log();

// 5. Criar uma transação de receita
console.log("5️⃣ Criando transação de receita...");
const salaryCategory = categories.find(c => c.name === "Salary");
const incomeTransaction = storage.createTransaction({
  description: "Salário",
  amount: 5000.00,
  type: "income",
  date: "2026-04-13",
  accountId: account.id,
  categoryId: salaryCategory?.id || null,
  notes: "Teste de integração"
});
console.log(`   ✅ Transação criada: ${incomeTransaction.description} - R$ ${incomeTransaction.amount}`);
console.log(`   💰 Saldo da conta: ${storage.getAccount(account.id)?.balance}\n`);

// 6. Verificar entradas diárias atualizadas
console.log("6️⃣ Verificando entradas diárias atualizadas...");
const updatedEntries = storage.getDailyEntries(account.id, 2026, 4);
console.log(`   📊 Total de entradas diárias: ${updatedEntries.length}`);
updatedEntries.forEach(entry => {
  console.log(`   📅 Dia ${entry.day}: ${entry.category} = R$ ${entry.amount}`);
});
console.log();

// 7. Atualizar uma transação
console.log("7️⃣ Atualizando transação...");
const updated = storage.updateTransaction(transaction.id, {
  amount: 75.00,
  description: "Almoço no restaurante (atualizado)"
});
console.log(`   ✅ Transação atualizada: ${updated?.description} - R$ ${updated?.amount}`);
console.log(`   💰 Saldo da conta: ${storage.getAccount(account.id)?.balance}\n`);

// 8. Verificar entradas diárias após atualização
console.log("8️⃣ Verificando entradas diárias após atualização...");
const afterUpdateEntries = storage.getDailyEntries(account.id, 2026, 4);
afterUpdateEntries.forEach(entry => {
  console.log(`   📅 Dia ${entry.day}: ${entry.category} = R$ ${entry.amount}`);
});
console.log();

// 9. Deletar uma transação
console.log("9️⃣ Deletando transação de despesa...");
storage.deleteTransaction(transaction.id);
console.log(`   ✅ Transação deletada`);
console.log(`   💰 Saldo da conta: ${storage.getAccount(account.id)?.balance}\n`);

// 10. Verificar entradas diárias após deleção
console.log("🔟 Verificando entradas diárias após deleção...");
const afterDeleteEntries = storage.getDailyEntries(account.id, 2026, 4);
console.log(`   📊 Total de entradas diárias: ${afterDeleteEntries.length}`);
afterDeleteEntries.forEach(entry => {
  console.log(`   📅 Dia ${entry.day}: ${entry.category} = R$ ${entry.amount}`);
});
console.log();

// 11. Limpar dados de teste
console.log("🧹 Limpando dados de teste...");
storage.deleteAccount(account.id);
console.log("   ✅ Conta de teste removida\n");

console.log("✨ Teste de integração concluído com sucesso!");
