const STORAGE_KEY = "my-money-records";

const form = document.querySelector("#entry-form");
const amountInput = document.querySelector("#amount");
const categoryInput = document.querySelector("#category");
const dateInput = document.querySelector("#date");
const dateDisplay = document.querySelector("#date-display");
const noteInput = document.querySelector("#note");
const list = document.querySelector("#record-list");
const emptyState = document.querySelector("#empty-state");
const sortButton = document.querySelector("#sort-records");
const clearButton = document.querySelector("#clear-all");
const monthFilter = document.querySelector("#month-filter");
const balanceLabel = document.querySelector("#balance-label");
const recordsHeading = document.querySelector("#records-heading");
const saveButton = document.querySelector("#save-entry");
const cancelEditButton = document.querySelector("#cancel-edit");
const exportButton = document.querySelector("#export-backup");
const importInput = document.querySelector("#import-backup");
const backupStatus = document.querySelector("#backup-status");
const typeButtons = [...document.querySelectorAll(".type-button")];

let entryType = "expense";
let sortByAmount = false;
let records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let editingId = null;

const today = new Date();
const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
  .toISOString()
  .slice(0, 10);
const currentMonth = localDate.slice(0, 7);
let selectedMonth = currentMonth;
dateInput.value = localDate;
document.querySelector("#today").textContent = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
}).format(today);

function updateDateDisplay() {
  const [, month, day] = dateInput.value.split("-");
  dateDisplay.textContent = month && day ? `${month}/${day}` : "选择日期";
}

dateInput.addEventListener("change", updateDateDisplay);
updateDateDisplay();

const money = (value) => `¥${Number(value).toFixed(2)}`;

function saveRecords(nextRecords) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
  } catch {
    backupStatus.textContent = "保存失败，请检查设备剩余空间。";
    return false;
  }
  records = nextRecords;
  render();
  return true;
}

function monthName(month) {
  const [year, number] = month.split("-");
  return `${year}年${Number(number)}月`;
}

function renderMonthOptions() {
  const months = [...new Set([currentMonth, selectedMonth, ...records.map((record) => record.date.slice(0, 7))])]
    .sort((a, b) => b.localeCompare(a));
  monthFilter.replaceChildren();
  months.forEach((month) => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = monthName(month);
    monthFilter.append(option);
  });
  monthFilter.value = selectedMonth;
}

function setEntryType(type) {
  entryType = type;
  typeButtons.forEach((button) => button.classList.toggle("active", button.dataset.type === type));
}

function resetEntryForm() {
  editingId = null;
  form.reset();
  dateInput.value = localDate;
  updateDateDisplay();
  setEntryType("expense");
  saveButton.textContent = "记一笔";
  cancelEditButton.hidden = true;
}

function ensureCategoryOption(category) {
  if ([...categoryInput.options].some((option) => option.value === category)) return;
  const option = document.createElement("option");
  option.value = category;
  option.textContent = category;
  categoryInput.append(option);
}

function editRecord(record) {
  editingId = record.id;
  setEntryType(record.type);
  amountInput.value = record.amount;
  ensureCategoryOption(record.category);
  categoryInput.value = record.category;
  dateInput.value = record.date;
  updateDateDisplay();
  noteInput.value = record.note || "";
  saveButton.textContent = "保存修改";
  cancelEditButton.hidden = false;
  form.scrollIntoView({ behavior: "smooth", block: "start" });
  amountInput.focus();
}

function deleteRecord(record) {
  if (!confirm(`确定删除这笔${record.category} ${money(record.amount)}吗？`)) return;
  if (saveRecords(records.filter((item) => item.id !== record.id)) && editingId === record.id) {
    resetEntryForm();
  }
}

function render() {
  renderMonthOptions();
  balanceLabel.textContent = selectedMonth === currentMonth ? "本月结余" : `${monthName(selectedMonth)}结余`;
  recordsHeading.textContent = selectedMonth === currentMonth ? "本月记录" : `${monthName(selectedMonth)}记录`;
  const monthlyRecords = records.filter((record) => record.date.startsWith(selectedMonth));
  const income = monthlyRecords
    .filter((record) => record.type === "income")
    .reduce((sum, record) => sum + record.amount, 0);
  const expense = monthlyRecords
    .filter((record) => record.type === "expense")
    .reduce((sum, record) => sum + record.amount, 0);

  document.querySelector("#total-income").textContent = money(income);
  document.querySelector("#total-expense").textContent = money(expense);
  document.querySelector("#balance").textContent = money(income - expense);

  list.replaceChildren();
  [...monthlyRecords]
    .sort((a, b) =>
      sortByAmount
        ? b.amount - a.amount || b.date.localeCompare(a.date) || b.createdAt - a.createdAt
        : b.date.localeCompare(a.date) || b.createdAt - a.createdAt
    )
    .forEach((record) => {
      const item = document.createElement("li");
      item.className = "record-item";
      const main = document.createElement("div");
      main.className = "record-main";
      const title = document.createElement("strong");
      title.textContent = record.category;
      const detail = document.createElement("small");
      detail.textContent = `${record.date}${record.note ? ` · ${record.note}` : ""}`;
      const amount = document.createElement("strong");
      amount.className = `record-amount ${record.type}`;
      amount.textContent = `${record.type === "income" ? "+" : "−"}${money(record.amount)}`;
      const side = document.createElement("div");
      side.className = "record-side";
      const actions = document.createElement("div");
      actions.className = "item-actions";
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "编辑";
      editButton.setAttribute("aria-label", `编辑${record.category}${money(record.amount)}`);
      editButton.addEventListener("click", () => editRecord(record));
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-entry";
      deleteButton.textContent = "删除";
      deleteButton.setAttribute("aria-label", `删除${record.category}${money(record.amount)}`);
      deleteButton.addEventListener("click", () => deleteRecord(record));
      actions.append(editButton, deleteButton);
      side.append(amount, actions);
      main.append(title, detail);
      item.append(main, side);
      list.append(item);
    });

  const hasMonthlyRecords = monthlyRecords.length > 0;
  emptyState.hidden = hasMonthlyRecords;
  emptyState.textContent = records.length ? "这个月还没有记录。" : "还没有记录，先记下第一笔吧。";
  sortButton.hidden = !hasMonthlyRecords;
  clearButton.hidden = records.length === 0;
}

monthFilter.addEventListener("change", () => {
  selectedMonth = monthFilter.value;
  render();
});

sortButton.addEventListener("click", () => {
  sortByAmount = !sortByAmount;
  sortButton.textContent = sortByAmount ? "按日期排" : "金额排序";
  sortButton.setAttribute("aria-pressed", String(sortByAmount));
  render();
});

typeButtons.forEach((button) => {
  button.addEventListener("click", () => setEntryType(button.dataset.type));
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(amountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const entry = {
    id: editingId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    type: entryType,
    amount,
    category: categoryInput.value,
    date: dateInput.value,
    note: noteInput.value.trim(),
    createdAt: editingId ? records.find((record) => record.id === editingId)?.createdAt || Date.now() : Date.now(),
  };
  const nextRecords = editingId
    ? records.map((record) => (record.id === editingId ? entry : record))
    : [...records, entry];
  const previousMonth = selectedMonth;
  selectedMonth = entry.date.slice(0, 7);
  if (saveRecords(nextRecords)) {
    resetEntryForm();
    amountInput.focus();
  } else {
    selectedMonth = previousMonth;
  }
});

cancelEditButton.addEventListener("click", resetEntryForm);

clearButton.addEventListener("click", () => {
  if (confirm("确定清空全部记账记录吗？")) {
    const previousMonth = selectedMonth;
    selectedMonth = currentMonth;
    if (saveRecords([])) resetEntryForm();
    else selectedMonth = previousMonth;
  }
});

function validBackupRecord(record) {
  if (!record || typeof record !== "object") return false;
  if (typeof record.id !== "string" || !record.id || !["income", "expense"].includes(record.type)) return false;
  if (!Number.isFinite(record.amount) || record.amount <= 0) return false;
  if (typeof record.category !== "string" || !record.category.trim() || record.category.length > 20) return false;
  if (typeof record.note !== "string" || record.note.length > 30 || !Number.isFinite(record.createdAt)) return false;
  if (typeof record.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) return false;
  const parsed = new Date(`${record.date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === record.date;
}

function downloadBackup(file) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

exportButton.addEventListener("click", async () => {
  const backup = { app: "my-money", version: 1, exportedAt: new Date().toISOString(), records };
  const file = new File([JSON.stringify(backup, null, 2)], `my-money-backup-${localDate}.json`, {
    type: "application/json",
  });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "小账本备份" });
      backupStatus.textContent = "备份已交给分享菜单，请保存到“文件”。";
      return;
    }
  } catch (error) {
    if (error.name === "AbortError") return;
  }
  downloadBackup(file);
  backupStatus.textContent = "备份文件已开始下载，请妥善保存。";
});

importInput.addEventListener("change", async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error("备份文件超过 10 MB。");
    const backup = JSON.parse(await file.text());
    if (backup?.app !== "my-money" || backup.version !== 1 || !Array.isArray(backup.records)) {
      throw new Error("这不是小账本导出的备份文件。");
    }
    if (!backup.records.every(validBackupRecord)) throw new Error("备份中的记录格式不正确。");
    const importedIds = backup.records.map((record) => record.id);
    if (new Set(importedIds).size !== importedIds.length) throw new Error("备份中有重复记录。");
    const merged = new Map(records.map((record) => [record.id, record]));
    let added = 0;
    let updated = 0;
    backup.records.forEach((record) => {
      const existing = merged.get(record.id);
      if (!existing) added += 1;
      else if (JSON.stringify(existing) !== JSON.stringify(record)) updated += 1;
      merged.set(record.id, record);
    });
    if (updated && !confirm(`备份中有 ${updated} 条与本机不同的同名记录，导入后会用备份版本替换。继续吗？`)) return;
    if (added || updated) {
      if (!saveRecords([...merged.values()])) return;
      if (editingId) resetEntryForm();
    }
    backupStatus.textContent = `导入完成：新增 ${added} 条，更新 ${updated} 条。`;
  } catch (error) {
    backupStatus.textContent = `导入失败：${error.message}`;
  } finally {
    importInput.value = "";
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}

render();
