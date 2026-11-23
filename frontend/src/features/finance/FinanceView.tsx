import React, { useState, useEffect } from 'react';
import {
  Landmark,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  RotateCcw,
  Receipt,
  FileSpreadsheet,
  PieChart,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building,
  CreditCard,
  Banknote,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import {
  FinancialAccount,
  FinancialTransaction,
  Invoice,
  AccountsPayable,
  FinancialBudget,
  ExpenseRequest,
  FinancialOverviewStats,
} from '../../types';
import { useAuth } from '../../context/AuthContext';

export const FinanceView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'transactions' | 'invoices' | 'payables' | 'budgets' | 'approvals' | 'accounts'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<FinancialOverviewStats | null>(null);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [budgets, setBudgets] = useState<FinancialBudget[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<ExpenseRequest[]>([]);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Filters
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('all');
  const [payableStatusFilter, setPayableStatusFilter] = useState('all');

  // Modals state
  const [isRecordTxOpen, setIsRecordTxOpen] = useState(false);
  const [isReverseTxOpen, setIsReverseTxOpen] = useState(false);
  const [targetTx, setTargetTx] = useState<FinancialTransaction | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isInvoicePaymentOpen, setIsInvoicePaymentOpen] = useState(false);
  const [targetInvoice, setTargetInvoice] = useState<Invoice | null>(null);

  const [isCreatePayableOpen, setIsCreatePayableOpen] = useState(false);
  const [isPayablePaymentOpen, setIsPayablePaymentOpen] = useState(false);
  const [targetPayable, setTargetPayable] = useState<AccountsPayable | null>(null);

  const [isCreateBudgetOpen, setIsCreateBudgetOpen] = useState(false);
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [isReviewRequestOpen, setIsReviewRequestOpen] = useState(false);
  const [isPayRequestOpen, setIsPayRequestOpen] = useState(false);
  const [targetRequest, setTargetRequest] = useState<ExpenseRequest | null>(null);
  const [reviewComments, setReviewComments] = useState('');

  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);

  // Form inputs - Transaction
  const [txType, setTxType] = useState('expense');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txAccount, setTxAccount] = useState('');
  const [txDestAccount, setTxDestAccount] = useState('');
  const [txCategory, setTxCategory] = useState('Operations');
  const [txMethod, setTxMethod] = useState('bank_transfer');
  const [txNotes, setTxNotes] = useState('');

  // Form inputs - Invoice
  const [invNumber, setInvNumber] = useState('');
  const [invClientId, setInvClientId] = useState('c-1');
  const [invClientName, setInvClientName] = useState('Meridian Global Logistics');
  const [invIssueDate, setInvIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [invDueDate, setInvDueDate] = useState('');
  const [invTaxRate, setInvTaxRate] = useState(16.0);
  const [invNotes, setInvNotes] = useState('');
  const [invItems, setInvItems] = useState([
    { description: 'Enterprise Telemetry Architecture Deployment', quantity: 1, unit_price: 1500000, subtotal: 1500000 },
  ]);

  // Form inputs - Payment
  const [payAmount, setPayAmount] = useState('');
  const [payAccount, setPayAccount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payRef, setPayRef] = useState('');

  // Form inputs - Payable
  const [paySupplier, setPaySupplier] = useState('');
  const [payBillDesc, setPayBillDesc] = useState('');
  const [payBillCategory, setPayBillCategory] = useState('Operations');
  const [payBillAmount, setPayBillAmount] = useState('');
  const [payBillDueDate, setPayBillDueDate] = useState('');

  // Form inputs - Budget
  const [bgtName, setBgtName] = useState('');
  const [bgtPeriod, setBgtPeriod] = useState('quarterly');
  const [bgtStartDate, setBgtStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [bgtEndDate, setBgtEndDate] = useState('');
  const [bgtCategory, setBgtCategory] = useState('Technology');
  const [bgtAllocated, setBgtAllocated] = useState('');

  // Form inputs - Expense Request
  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqCategory, setReqCategory] = useState('Operations');
  const [reqAmount, setReqAmount] = useState('');
  const [reqUrgency, setReqUrgency] = useState<'normal' | 'urgent' | 'critical'>('normal');

  // Form inputs - Account
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState('bank');
  const [accNumber, setAccNumber] = useState('');
  const [accOpening, setAccOpening] = useState('');
  const [accDesc, setAccDesc] = useState('');

  const formatKES = (amount?: number) => {
    if (amount === undefined || amount === null) return 'KES 0.00';
    return (
      'KES ' +
      Number(amount).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [ov, accs, txs, invs, pays, bgts, reqs] = await Promise.all([
        SolianApiClient.getFinancialOverview(),
        SolianApiClient.getFinancialAccounts(),
        SolianApiClient.getFinancialTransactions({ limit: 150 }),
        SolianApiClient.getInvoices(),
        SolianApiClient.getPayables(),
        SolianApiClient.getBudgets(),
        SolianApiClient.getExpenseRequests(),
      ]);
      setOverview(ov);
      setAccounts(accs);
      setTransactions(txs);
      setInvoices(invs);
      setPayables(pays);
      setBudgets(bgts);
      setExpenseRequests(reqs);

      if (accs.length > 0 && !txAccount) {
        setTxAccount(accs[0].id);
        setPayAccount(accs[0].id);
      }
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotice = (msg: string) => {
    setFeedbackNotice(msg);
    setTimeout(() => setFeedbackNotice(null), 5000);
  };

  // 1. Submit New Transaction
  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txAmount || !txDesc) return;
    try {
      await SolianApiClient.createFinancialTransaction({
        transaction_type: txType,
        date: txDate,
        description: txDesc,
        amount: parseFloat(txAmount),
        currency: 'KES',
        account_id: txAccount,
        destination_account_id: txType === 'transfer' ? txDestAccount : undefined,
        category: txCategory,
        payment_method: txMethod,
        notes: txNotes || undefined,
      });
      setIsRecordTxOpen(false);
      setTxDesc('');
      setTxAmount('');
      setTxNotes('');
      showNotice('Transaction recorded and treasury balance reconciled atomically.');
      await loadData();
    } catch (err: any) {
      alert(`Error creating transaction: ${err.message || 'Validation failed'}`);
    }
  };

  // 2. Reverse Transaction
  const handleReverseTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTx || !reverseReason.trim()) return;
    try {
      await SolianApiClient.reverseFinancialTransaction(targetTx.id, reverseReason);
      setIsReverseTxOpen(false);
      setTargetTx(null);
      setReverseReason('');
      showNotice(`Transaction ${targetTx.reference} reversed and balances restored.`);
      await loadData();
    } catch (err: any) {
      alert(`Reversal failed: ${err.message || 'Unauthorized'}`);
    }
  };

  // 3. Create Invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await SolianApiClient.createInvoice({
        invoice_number: invNumber.trim() || undefined,
        client_id: invClientId,
        client_name: invClientName,
        issue_date: invIssueDate,
        due_date: invDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        items: invItems,
        tax_rate: invTaxRate,
        currency: 'KES',
        notes: invNotes,
      });
      setIsCreateInvoiceOpen(false);
      setInvNumber('');
      setInvNotes('');
      showNotice('Customer invoice generated and logged to Accounts Receivable.');
      await loadData();
    } catch (err: any) {
      alert(`Invoice generation failed: ${err.message}`);
    }
  };

  // 4. Record Invoice Payment
  const handleRecordInvoicePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInvoice || !payAmount) return;
    try {
      await SolianApiClient.recordInvoicePayment(targetInvoice.id, {
        amount: parseFloat(payAmount),
        account_id: payAccount,
        payment_method: payMethod,
        payment_reference: payRef || undefined,
        date: payDate,
      });
      setIsInvoicePaymentOpen(false);
      setTargetInvoice(null);
      setPayAmount('');
      setPayRef('');
      showNotice(`Payment recorded on invoice. Account balance updated.`);
      await loadData();
    } catch (err: any) {
      alert(`Payment recording failed: ${err.message}`);
    }
  };

  // 5. Create Payable
  const handleCreatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paySupplier || !payBillAmount) return;
    try {
      await SolianApiClient.createPayable({
        supplier_name: paySupplier,
        description: payBillDesc,
        category: payBillCategory,
        amount_due: parseFloat(payBillAmount),
        currency: 'KES',
        due_date: payBillDueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      });
      setIsCreatePayableOpen(false);
      setPaySupplier('');
      setPayBillDesc('');
      setPayBillAmount('');
      showNotice('Supplier obligation logged to Accounts Payable.');
      await loadData();
    } catch (err: any) {
      alert(`Failed to record bill: ${err.message}`);
    }
  };

  // 6. Record Payable Payment
  const handleRecordPayablePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPayable || !payAmount) return;
    try {
      await SolianApiClient.recordPayablePayment(targetPayable.id, {
        amount: parseFloat(payAmount),
        account_id: payAccount,
        payment_method: payMethod,
        payment_reference: payRef || undefined,
        date: payDate,
      });
      setIsPayablePaymentOpen(false);
      setTargetPayable(null);
      setPayAmount('');
      setPayRef('');
      showNotice(`Bill payment executed. Treasury account deducted.`);
      await loadData();
    } catch (err: any) {
      alert(`Failed to settle bill: ${err.message}`);
    }
  };

  // 7. Create Budget
  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bgtName || !bgtAllocated) return;
    try {
      await SolianApiClient.createBudget({
        name: bgtName,
        period: bgtPeriod,
        start_date: bgtStartDate,
        end_date: bgtEndDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        category: bgtCategory,
        allocated_amount: parseFloat(bgtAllocated),
        currency: 'KES',
      });
      setIsCreateBudgetOpen(false);
      setBgtName('');
      setBgtAllocated('');
      showNotice('Operational budget initialized.');
      await loadData();
    } catch (err: any) {
      alert(`Budget creation failed: ${err.message}`);
    }
  };

  // 8. Submit Expense Request
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqTitle || !reqAmount) return;
    try {
      await SolianApiClient.createExpenseRequest({
        title: reqTitle,
        description: reqDesc,
        category: reqCategory,
        amount: parseFloat(reqAmount),
        currency: 'KES',
        urgency: reqUrgency,
      });
      setIsCreateRequestOpen(false);
      setReqTitle('');
      setReqDesc('');
      setReqAmount('');
      showNotice('Expense request submitted for executive review.');
      await loadData();
    } catch (err: any) {
      alert(`Request submission failed: ${err.message}`);
    }
  };

  // 9. Review Request
  const handleReviewRequest = async (action: 'approve' | 'reject') => {
    if (!targetRequest) return;
    try {
      await SolianApiClient.reviewExpenseRequest(targetRequest.id, {
        action,
        comments: reviewComments || undefined,
      });
      setIsReviewRequestOpen(false);
      setTargetRequest(null);
      setReviewComments('');
      showNotice(`Request marked as ${action}d.`);
      await loadData();
    } catch (err: any) {
      alert(`Review action failed: ${err.message}`);
    }
  };

  // 10. Pay Request
  const handlePayRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRequest) return;
    try {
      await SolianApiClient.payExpenseRequest(targetRequest.id, {
        account_id: payAccount,
        payment_method: payMethod,
        date: payDate,
        payment_reference: payRef || undefined,
      });
      setIsPayRequestOpen(false);
      setTargetRequest(null);
      showNotice('Approved request disbursed and transaction logged.');
      await loadData();
    } catch (err: any) {
      alert(`Disbursement failed: ${err.message}`);
    }
  };

  // 11. Create Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName) return;
    try {
      await SolianApiClient.createFinancialAccount({
        name: accName,
        account_type: accType,
        account_number: accNumber || undefined,
        currency: 'KES',
        opening_balance: parseFloat(accOpening || '0'),
        description: accDesc || undefined,
      });
      setIsCreateAccountOpen(false);
      setAccName('');
      setAccNumber('');
      setAccOpening('');
      setAccDesc('');
      showNotice('Treasury account registered.');
      await loadData();
    } catch (err: any) {
      alert(`Account creation failed: ${err.message}`);
    }
  };

  // Filtered transactions
  const filteredTxs = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(txSearch.toLowerCase()) ||
      t.reference.toLowerCase().includes(txSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(txSearch.toLowerCase());
    const matchesType = txTypeFilter === 'all' || t.transactionType === txTypeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Feedback Notice */}
      {feedbackNotice && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-lg flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">{feedbackNotice}</span>
          </div>
          <button onClick={() => setFeedbackNotice(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1F2633] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37]">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Financial Intelligence & Company Records
                <span className="text-xs uppercase px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] font-semibold">
                  Solian Wolves Treasury
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Multi-account cash flow reconciliation, statutory treasury ledgers, receivables, payables, and budget governance.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsRecordTxOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#D4AF37] text-black font-semibold text-sm hover:bg-[#E5C158] transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            Record Transaction
          </button>
          <button
            onClick={() => setIsCreateInvoiceOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#181F2C] border border-[#2B3545] text-slate-200 font-medium text-sm hover:bg-[#20293A] transition-all"
          >
            <Receipt className="w-4 h-4 text-emerald-400" />
            New Invoice
          </button>
          <button
            onClick={() => setIsCreateRequestOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#181F2C] border border-[#2B3545] text-slate-200 font-medium text-sm hover:bg-[#20293A] transition-all"
          >
            <Banknote className="w-4 h-4 text-[#D4AF37]" />
            Request Funds
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex overflow-x-auto gap-2 border-b border-[#1F2633] pb-2 scrollbar-thin">
        {[
          { id: 'overview', label: 'Treasury Overview', icon: PieChart },
          { id: 'transactions', label: 'Transaction Ledger', icon: FileSpreadsheet, count: transactions.length },
          { id: 'invoices', label: 'Invoices (Receivables)', icon: Receipt, count: invoices.length },
          { id: 'payables', label: 'Accounts Payable', icon: Clock, count: payables.length },
          { id: 'budgets', label: 'Budgets & Allocations', icon: Landmark, count: budgets.length },
          { id: 'approvals', label: 'Approvals & Procurement', icon: ShieldCheck, count: expenseRequests.length },
          { id: 'accounts', label: 'Treasury Accounts', icon: CreditCard, count: accounts.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-[#181F2C] border border-[#D4AF37]/50 text-[#D4AF37] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#13171F]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-[#181F2C] text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Executive Telemetry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Balance */}
            <div className="p-4 rounded-xl bg-[#13171F] border border-[#1F2633] space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Active Treasury Balance</span>
                <Landmark className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {formatKES(overview?.totalRecordedBalances)}
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="text-emerald-400 font-medium">Reconciled across {accounts.length} active holding accounts</span>
              </div>
            </div>

            {/* Monthly Inflow */}
            <div className="p-4 rounded-xl bg-[#13171F] border border-[#1F2633] space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Monthly Cash Inflow</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                +{formatKES(overview?.monthlyIncome)}
              </div>
              <div className="text-xs text-slate-400">Total cleared client & operational receipts this month</div>
            </div>

            {/* Monthly Outflow */}
            <div className="p-4 rounded-xl bg-[#13171F] border border-[#1F2633] space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Monthly Expenditure</span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-rose-400 tracking-tight">
                -{formatKES(overview?.monthlyExpenditure)}
              </div>
              <div className="text-xs text-slate-400">Total cleared disbursements and vendor obligations</div>
            </div>

            {/* Net Movement */}
            <div className="p-4 rounded-xl bg-[#13171F] border border-[#1F2633] space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Outstanding Receivables</span>
                <ArrowUpRight className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-400 tracking-tight">
                {formatKES(overview?.outstandingReceivables)}
              </div>
              <div className="text-xs text-slate-400">
                Pending client invoice balances (Accrual ledger)
              </div>
            </div>
          </div>

          {/* Secondary Telemetry: Payables & Budgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#13171F] border border-[#1F2633] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">Pending Payables (Bills)</div>
                <div className="text-xl font-bold text-amber-400 mt-1">{formatKES(overview?.outstandingPayables)}</div>
                <div className="text-xs text-slate-400 mt-0.5">Short-term vendor obligations</div>
              </div>
              <Clock className="w-8 h-8 text-amber-400/40" />
            </div>

            <div className="p-4 rounded-xl bg-[#13171F] border border-[#1F2633] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">Budget Spent / Allocated</div>
                <div className="text-xl font-bold text-white mt-1">
                  {overview?.budgetUtilizationPercentage || 0}%
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {formatKES(overview?.budgetTotalSpent)} of {formatKES(overview?.budgetTotalAllocated)}
                </div>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-[#D4AF37] flex items-center justify-center font-bold text-xs text-[#D4AF37]">
                {Math.round(overview?.budgetUtilizationPercentage || 0)}%
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#13171F] border border-[#1F2633] flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">Pending Approvals</div>
                <div className="text-xl font-bold text-[#D4AF37] mt-1">
                  {overview?.pendingApprovalsCount || 0} Request(s)
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Require CFO / CEO sign-off</div>
              </div>
              <ShieldCheck className="w-8 h-8 text-[#D4AF37]/40" />
            </div>
          </div>

          {/* Treasury Accounts Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#D4AF37]" />
                Company Statutory & Operating Accounts
              </h2>
              <button
                onClick={() => setIsCreateAccountOpen(true)}
                className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Account
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {accounts.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-400 text-xs bg-[#13171F] rounded-xl border border-[#1F2633] space-y-2">
                  <Landmark className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-sm font-bold text-white">No Corporate Accounts Recorded</div>
                  <p className="text-slate-400 max-w-sm mx-auto">
                    Add verified corporate bank accounts, mobile business tills, or escrow safes to begin automated cash flow tracking.
                  </p>
                </div>
              ) : (
                accounts.map((acc) => (
                  <div key={acc.id} className="p-4 rounded-xl bg-[#13171F] border border-[#1F2633] space-y-3 hover:border-[#D4AF37]/40 transition-all">
                    <div className="flex items-center justify-between">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#181F2C] border border-[#2B3545] text-slate-300 uppercase font-medium">
                        {acc.accountType}
                      </span>
                      <span className="text-xs text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        {acc.status}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-white">{acc.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{acc.accountNumber || 'Primary Operational Safe'}</div>
                    </div>
                    <div className="border-t border-[#1F2633] pt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Current Balance:</span>
                      <span className="text-base font-bold text-[#D4AF37]">{formatKES(acc.currentBalance)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cash Flow Trends & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cash Flow Trend */}
            <div className="p-5 rounded-xl bg-[#13171F] border border-[#1F2633] space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Monthly Cash Flow Performance
              </h3>
              <div className="space-y-3">
                {overview?.cashFlowTrend.map((cft, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[#0D0F12] border border-[#1F2633] space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span>{cft.month}</span>
                      <span className={cft.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        Net: {formatKES(cft.net)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-emerald-400">Inflow: +{formatKES(cft.income)}</div>
                      <div className="text-rose-400 text-right">Outflow: -{formatKES(cft.expense)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenditure by Category */}
            <div className="p-5 rounded-xl bg-[#13171F] border border-[#1F2633] space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#D4AF37]" />
                Expenditure by Operating Category
              </h3>
              <div className="space-y-2.5">
                {overview?.expenseByCategory.length === 0 && (
                  <div className="text-sm text-slate-400 py-6 text-center">No categorized expenses recorded yet.</div>
                )}
                {overview?.expenseByCategory.map((cat, idx) => {
                  const maxExpense = Math.max(...(overview?.expenseByCategory.map((c) => c.amount) || [1]));
                  const pct = Math.round((cat.amount / maxExpense) * 100);
                  return (
                    <div key={idx} className="p-2.5 rounded-lg bg-[#0D0F12] border border-[#1F2633] space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200">{cat.category}</span>
                        <span className="font-semibold text-rose-400">{formatKES(cat.amount)}</span>
                      </div>
                      <div className="w-full bg-[#1F2633] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#13171F] border border-[#1F2633]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by reference, description, category..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#0D0F12] border border-[#1F2633] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="bg-[#0D0F12] border border-[#1F2633] rounded-lg text-xs py-1.5 px-3 text-slate-200 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="all">All Types</option>
                <option value="income">Income Only</option>
                <option value="expense">Expense Only</option>
                <option value="transfer">Transfers Only</option>
              </select>
            </div>
          </div>

          {/* Mobile Transaction Cards (Hidden on Desktop) */}
          <div className="md:hidden space-y-2.5">
            {filteredTxs.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-[#13171F] rounded-xl border border-[#1F2633]">
                No transactions found matching criteria.
              </div>
            ) : (
              filteredTxs.map((t) => {
                const isIncome = t.transactionType === 'income';
                const isExpense = t.transactionType === 'expense';
                const isTransfer = t.transactionType === 'transfer';
                const isReversed = t.status === 'reversed';
                return (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-xl bg-[#13171F] border border-[#1F2633] space-y-2 min-h-[48px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">{t.reference}</span>
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full ${
                              isReversed
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : t.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-200 mt-1 truncate">{t.description}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`font-mono font-bold text-sm ${
                            isReversed
                              ? 'line-through text-slate-500'
                              : isIncome
                              ? 'text-emerald-400'
                              : isExpense
                              ? 'text-rose-400'
                              : 'text-blue-400'
                          }`}
                        >
                          {isIncome ? '+' : isExpense ? '-' : ''}
                          {formatKES(t.amount)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{t.date}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#1F2633]/60 text-slate-400">
                      <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                        <span className="truncate">{t.accountName || t.accountId}</span>
                        {isTransfer && t.destinationAccountName && (
                          <span className="text-blue-400 flex items-center gap-0.5 shrink-0">
                            → {t.destinationAccountName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#181F2C] border border-[#2B3545] text-slate-300">
                          {t.category}
                        </span>
                        {!isReversed && (user?.role === 'admin' || user?.role === 'owner') && (
                          <button
                            onClick={() => {
                              setTargetTx(t);
                              setIsReverseTxOpen(true);
                            }}
                            className="p-1.5 rounded text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                            title="Reverse Transaction"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Ledger Table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-[#1F2633] bg-[#13171F]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0D0F12] text-slate-400 uppercase text-[11px] font-semibold border-b border-[#1F2633]">
                <tr>
                  <th className="py-3 px-4">Ref & Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Account Flow</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2633]">
                {filteredTxs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No transactions found matching criteria.
                    </td>
                  </tr>
                )}
                {filteredTxs.map((t) => {
                  const isIncome = t.transactionType === 'income';
                  const isExpense = t.transactionType === 'expense';
                  const isTransfer = t.transactionType === 'transfer';
                  const isReversed = t.status === 'reversed';
                  return (
                    <tr key={t.id} className="hover:bg-[#181F2C]/50 transition-colors">
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-white">{t.reference}</div>
                        <div className="text-slate-400 text-[10px]">{t.date}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-200 truncate">{t.description}</div>
                        {t.notes && <div className="text-[10px] text-slate-400 truncate">{t.notes}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-[#181F2C] border border-[#2B3545] text-[10px] text-slate-300">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-200">{t.accountName || t.accountId}</div>
                        {isTransfer && t.destinationAccountName && (
                          <div className="text-[10px] text-blue-400 flex items-center gap-1 mt-0.5">
                            <ArrowRightLeft className="w-3 h-3" />
                            To: {t.destinationAccountName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span
                          className={
                            isReversed
                              ? 'line-through text-slate-500'
                              : isIncome
                              ? 'text-emerald-400'
                              : isExpense
                              ? 'text-rose-400'
                              : 'text-blue-400'
                          }
                        >
                          {isIncome ? '+' : isExpense ? '-' : ''}
                          {formatKES(t.amount)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            isReversed
                              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                              : t.status === 'completed'
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-500/10 border border-slate-500/30 text-slate-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isReversed && (user?.role === 'admin' || user?.role === 'owner') && (
                          <button
                            onClick={() => {
                              setTargetTx(t);
                              setIsReverseTxOpen(true);
                            }}
                            className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Reverse Transaction"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INVOICES (RECEIVABLES) */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#13171F] border border-[#1F2633]">
              <div className="text-xs text-slate-400 uppercase font-semibold">Total Invoiced</div>
              <div className="text-xl font-bold text-white mt-1">
                {formatKES(invoices.reduce((acc, inv) => acc + inv.totalAmount, 0))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#13171F] border border-[#1F2633]">
              <div className="text-xs text-slate-400 uppercase font-semibold">Total Collected</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                {formatKES(invoices.reduce((acc, inv) => acc + inv.amountPaid, 0))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#13171F] border border-[#1F2633]">
              <div className="text-xs text-slate-400 uppercase font-semibold">Outstanding Balance</div>
              <div className="text-xl font-bold text-blue-400 mt-1">
                {formatKES(invoices.reduce((acc, inv) => acc + inv.balanceDue, 0))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {invoices.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-[#13171F] rounded-xl border border-[#1F2633] space-y-2">
                <Receipt className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-sm font-bold text-white">No Invoices Issued</div>
                <p className="text-slate-400 max-w-sm mx-auto">
                  Issue customer invoices to monitor accounts receivable, track due dates, and record payments.
                </p>
              </div>
            ) : (
              invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-5 rounded-xl bg-[#13171F] border border-[#1F2633] hover:border-[#D4AF37]/30 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#1F2633] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-base">{inv.invoiceNumber}</span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            inv.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : inv.status === 'partially_paid'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Client: <span className="text-slate-200 font-medium">{inv.clientName}</span> | Due: {inv.dueDate}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {inv.status !== 'paid' && (
                        <button
                          onClick={() => {
                            setTargetInvoice(inv);
                            setPayAmount(String(inv.balanceDue));
                            setIsInvoicePaymentOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
                        >
                          Record Payment
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400">Total Billed:</span>
                      <div className="text-white font-mono font-bold text-sm">{formatKES(inv.totalAmount)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Amount Paid:</span>
                      <div className="text-emerald-400 font-mono font-bold text-sm">{formatKES(inv.amountPaid)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Balance Due:</span>
                      <div className="text-blue-400 font-mono font-bold text-sm">{formatKES(inv.balanceDue)}</div>
                    </div>
                  </div>

                  {inv.notes && (
                    <div className="p-2.5 rounded-lg bg-[#0D0F12] text-xs text-slate-400 border border-[#1F2633]">
                      {inv.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ACCOUNTS PAYABLE (BILLS) */}
      {activeTab === 'payables' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase text-slate-400">Company Supplier Obligations</h2>
            <button
              onClick={() => setIsCreatePayableOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-black font-semibold text-xs hover:bg-[#E5C158] transition-all"
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              Record Supplier Bill
            </button>
          </div>

          <div className="space-y-3">
            {payables.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-[#13171F] rounded-xl border border-[#1F2633] space-y-2">
                <CreditCard className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-sm font-bold text-white">No Supplier Bills Recorded</div>
                <p className="text-slate-400 max-w-sm mx-auto">
                  Record supplier obligations, vendor invoices, and track accounts payable settlements.
                </p>
              </div>
            ) : (
              payables.map((p) => (
                <div
                  key={p.id}
                  className="p-5 rounded-xl bg-[#13171F] border border-[#1F2633] hover:border-amber-500/30 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#1F2633] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{p.reference}</span>
                        <span className="text-xs text-slate-400">|</span>
                        <span className="font-semibold text-slate-200">{p.supplierName}</span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            p.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {p.description} (Category: {p.category}) — Due: {p.dueDate}
                      </div>
                    </div>

                    {p.status !== 'paid' && (
                      <button
                        onClick={() => {
                          setTargetPayable(p);
                          setPayAmount(String(p.balanceDue));
                          setIsPayablePaymentOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-all"
                      >
                        Settle Bill
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-slate-400">Obligation: </span>
                      <span className="text-white font-bold">{formatKES(p.amountDue)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Paid: </span>
                      <span className="text-emerald-400 font-bold">{formatKES(p.amountPaid)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Balance: </span>
                      <span className="text-amber-400 font-bold">{formatKES(p.balanceDue)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: BUDGETS */}
      {activeTab === 'budgets' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase text-slate-400">Operational Budgets & Spending Caps</h2>
            <button
              onClick={() => setIsCreateBudgetOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-black font-semibold text-xs hover:bg-[#E5C158] transition-all"
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              New Budget
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-400 text-xs bg-[#13171F] rounded-xl border border-[#1F2633] space-y-2">
                <PieChart className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-sm font-bold text-white">No Departmental Budgets Configured</div>
                <p className="text-slate-400 max-w-sm mx-auto">
                  Create departmental operating budgets with allocated spending caps and utilization tracking.
                </p>
              </div>
            ) : (
              budgets.map((b) => (
                <div key={b.id} className="p-5 rounded-xl bg-[#13171F] border border-[#1F2633] space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white text-base">{b.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Period: <span className="text-slate-300 capitalize">{b.period}</span> ({b.startDate} to {b.endDate})
                      </div>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#181F2C] border border-[#2B3545] text-[#D4AF37] font-semibold">
                      {b.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>Spent: {formatKES(b.spentAmount)}</span>
                      <span className="font-bold">{b.utilizationPercentage}%</span>
                    </div>
                    <div className="w-full bg-[#0D0F12] h-2 rounded-full overflow-hidden border border-[#1F2633]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          b.utilizationPercentage > 90
                            ? 'bg-rose-500'
                            : b.utilizationPercentage > 70
                            ? 'bg-amber-500'
                            : 'bg-[#D4AF37]'
                        }`}
                        style={{ width: `${Math.min(100, b.utilizationPercentage)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Remaining: {formatKES(b.remainingAmount)}</span>
                      <span>Cap: {formatKES(b.allocatedAmount)}</span>
                    </div>
                  </div>

                  {b.notes && <div className="text-xs text-slate-400 italic">{b.notes}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: APPROVALS & PROCUREMENT */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase text-slate-400">Expense Requisitions & Disbursements</h2>
            <button
              onClick={() => setIsCreateRequestOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-black font-semibold text-xs hover:bg-[#E5C158] transition-all"
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              Submit Request
            </button>
          </div>

          <div className="space-y-3">
            {expenseRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs bg-[#13171F] rounded-xl border border-[#1F2633] space-y-2">
                <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-sm font-bold text-white">No Expense Requisitions Submitted</div>
                <p className="text-slate-400 max-w-sm mx-auto">
                  Submit internal expense requests and procurement requisitions for management approval and disbursement.
                </p>
              </div>
            ) : (
              expenseRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-xl bg-[#13171F] border border-[#1F2633] hover:border-[#D4AF37]/30 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#1F2633] pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base">{req.title}</span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            req.urgency === 'critical'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : req.urgency === 'urgent'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                          }`}
                        >
                          {req.urgency}
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            req.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : req.status === 'paid'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                              : req.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Requested by <span className="text-slate-200 font-medium">{req.requestedByName}</span> | Category: {req.category}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {req.status === 'submitted' && (user?.role === 'admin' || user?.role === 'owner') && (
                        <button
                          onClick={() => {
                            setTargetRequest(req);
                            setIsReviewRequestOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs font-semibold hover:bg-[#D4AF37]/30 transition-all"
                        >
                          Review Sign-Off
                        </button>
                      )}
                      {req.status === 'approved' && (user?.role === 'admin' || user?.role === 'owner') && (
                        <button
                          onClick={() => {
                            setTargetRequest(req);
                            setIsPayRequestOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition-all"
                        >
                          Disburse Funds
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-slate-300">{req.description}</div>
                  <div className="flex items-center justify-between text-xs border-t border-[#1F2633] pt-2">
                    <span className="text-slate-400">Required Amount:</span>
                    <span className="font-mono font-bold text-white text-sm">{formatKES(req.amount)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 7: STATUTORY ACCOUNTS */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase text-slate-400">Institutional Holding & Merchant Accounts</h2>
            <button
              onClick={() => setIsCreateAccountOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#D4AF37] text-black font-semibold text-xs hover:bg-[#E5C158] transition-all"
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              New Account
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {accounts.length === 0 ? (
              <div className="col-span-full p-8 text-center text-slate-400 text-xs bg-[#13171F] rounded-xl border border-[#1F2633] space-y-2">
                <Landmark className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-sm font-bold text-white">No Corporate Accounts Registered</div>
                <p className="text-slate-400 max-w-sm mx-auto">
                  Click 'New Account' above to register company banking or treasury holding accounts.
                </p>
              </div>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="p-5 rounded-xl bg-[#13171F] border border-[#1F2633] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-[#0D0F12] border border-[#1F2633] text-[#D4AF37]">
                      {acc.accountType === 'bank' ? (
                        <Building className="w-5 h-5" />
                      ) : acc.accountType === 'mobile_money' ? (
                        <CreditCard className="w-5 h-5" />
                      ) : (
                        <Banknote className="w-5 h-5" />
                      )}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold uppercase">
                      {acc.status}
                    </span>
                  </div>

                  <div>
                    <div className="font-bold text-white text-base">{acc.name}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">{acc.accountNumber || 'Non-banking ledger'}</div>
                  </div>

                  <div className="text-xs text-slate-400">{acc.description}</div>

                  <div className="border-t border-[#1F2633] pt-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Opening Balance:</span>
                      <span className="font-mono text-slate-300">{formatKES(acc.openingBalance)}</span>
                    </div>
                    <div className="flex justify-between text-slate-200 font-bold">
                      <span>Reconciled Balance:</span>
                      <span className="font-mono text-[#D4AF37] text-sm">{formatKES(acc.currentBalance)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Record Transaction Modal */}
      {isRecordTxOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#13171F] border border-[#1F2633] border-t sm:border rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F2633] pb-3">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#D4AF37]" />
                Record Financial Transaction
              </h3>
              <button onClick={() => setIsRecordTxOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTx} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Type</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="expense">Expense (Outflow)</option>
                    <option value="income">Income (Inflow)</option>
                    <option value="transfer">Internal Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Date</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Amount (KES)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 150000"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Description</label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of payment or receipt"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">
                    {txType === 'transfer' ? 'Source Account' : 'Account'}
                  </label>
                  <select
                    value={txAccount}
                    onChange={(e) => setTxAccount(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatKES(a.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>

                {txType === 'transfer' ? (
                  <div>
                    <label className="text-xs text-slate-400 font-medium">Destination Account</label>
                    <select
                      value={txDestAccount}
                      onChange={(e) => setTxDestAccount(e.target.value)}
                      className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="">Select Destination</option>
                      {accounts
                        .filter((a) => a.id !== txAccount)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({formatKES(a.currentBalance)})
                          </option>
                        ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-slate-400 font-medium">Category</label>
                    <input
                      type="text"
                      value={txCategory}
                      onChange={(e) => setTxCategory(e.target.value)}
                      className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Payment Method</label>
                <select
                  value={txMethod}
                  onChange={(e) => setTxMethod(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="bank_transfer">Bank Transfer (RTGS / EFT)</option>
                  <option value="mobile_money">M-Pesa Business Till / Paybill</option>
                  <option value="cash">Petty Cash Voucher</option>
                  <option value="card">Corporate Card</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#1F2633]">
                <button
                  type="button"
                  onClick={() => setIsRecordTxOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#181F2C] text-slate-300 text-sm font-medium hover:bg-[#20293A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#D4AF37] text-black text-sm font-bold hover:bg-[#E5C158]"
                >
                  Confirm & Post Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Reverse Transaction Modal */}
      {isReverseTxOpen && targetTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#13171F] border border-[#1F2633] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base flex items-center gap-2 text-rose-400">
              <RotateCcw className="w-5 h-5" />
              Reverse Transaction: {targetTx.reference}
            </h3>
            <p className="text-xs text-slate-400">
              This action will mark the transaction as reversed and atomically rollback the impact of {formatKES(targetTx.amount)} on account balances.
            </p>

            <form onSubmit={handleReverseTx} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Audit Reason for Reversal</label>
                <textarea
                  required
                  rows={3}
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  placeholder="e.g. Duplicate entry, erroneous disbursement, or client request"
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReverseTxOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181F2C] text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-500"
                >
                  Confirm Reversal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Record Payment on Invoice Modal */}
      {isInvoicePaymentOpen && targetInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#13171F] border border-[#1F2633] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base flex items-center gap-2 text-emerald-400">
              <Receipt className="w-5 h-5" />
              Record Payment on {targetInvoice.invoiceNumber}
            </h3>
            <div className="text-xs text-slate-400">
              Client: <span className="text-white font-medium">{targetInvoice.clientName}</span> | Outstanding:{' '}
              <span className="text-blue-400 font-bold">{formatKES(targetInvoice.balanceDue)}</span>
            </div>

            <form onSubmit={handleRecordInvoicePayment} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Amount Received (KES)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Receiving Account</label>
                <select
                  value={payAccount}
                  onChange={(e) => setPayAccount(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Date</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="bank_transfer">Bank Transfer (RTGS)</option>
                    <option value="mobile_money">M-Pesa Business Till</option>
                    <option value="cheque">Cheque Deposit</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInvoicePaymentOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181F2C] text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Settle Bill / Payable Modal */}
      {isPayablePaymentOpen && targetPayable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#13171F] border border-[#1F2633] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base flex items-center gap-2 text-amber-400">
              <Clock className="w-5 h-5" />
              Settle Supplier Bill: {targetPayable.reference}
            </h3>
            <div className="text-xs text-slate-400">
              Supplier: <span className="text-white font-medium">{targetPayable.supplierName}</span> | Balance Due:{' '}
              <span className="text-amber-400 font-bold">{formatKES(targetPayable.balanceDue)}</span>
            </div>

            <form onSubmit={handleRecordPayablePayment} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Settlement Amount (KES)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Disbursing Account</label>
                <select
                  value={payAccount}
                  onChange={(e) => setPayAccount(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatKES(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayablePaymentOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181F2C] text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-500"
                >
                  Execute Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Create Invoice Modal */}
      {isCreateInvoiceOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#13171F] border border-[#1F2633] border-t sm:border rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F2633] pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                Issue Enterprise Client Invoice
              </h3>
              <button onClick={() => setIsCreateInvoiceOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Invoice Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-003"
                    value={invNumber}
                    onChange={(e) => setInvNumber(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Client Name</label>
                  <input
                    type="text"
                    required
                    value={invClientName}
                    onChange={(e) => setInvClientName(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Issue Date</label>
                  <input
                    type="date"
                    value={invIssueDate}
                    onChange={(e) => setInvIssueDate(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Due Date</label>
                  <input
                    type="date"
                    value={invDueDate}
                    onChange={(e) => setInvDueDate(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Item Description</label>
                <input
                  type="text"
                  required
                  value={invItems[0]?.description}
                  onChange={(e) => {
                    const updated = [...invItems];
                    updated[0].description = e.target.value;
                    setInvItems(updated);
                  }}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Unit Price (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={invItems[0]?.unit_price}
                    onChange={(e) => {
                      const updated = [...invItems];
                      const val = parseFloat(e.target.value || '0');
                      updated[0].unit_price = val;
                      updated[0].subtotal = val * updated[0].quantity;
                      setInvItems(updated);
                    }}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">VAT Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={invTaxRate}
                    onChange={(e) => setInvTaxRate(parseFloat(e.target.value || '0'))}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateInvoiceOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181F2C] text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#D4AF37] text-black font-bold text-xs hover:bg-[#E5C158]"
                >
                  Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Create Payable Modal */}
      {isCreatePayableOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#13171F] border border-[#1F2633] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base flex items-center gap-2 text-amber-400">
              <Clock className="w-5 h-5" />
              Record Supplier Payable / Bill
            </h3>
            <form onSubmit={handleCreatePayable} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Supplier / Vendor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS EMEA / Safaricom"
                  value={paySupplier}
                  onChange={(e) => setPaySupplier(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud server monthly reserved instance"
                  value={payBillDesc}
                  onChange={(e) => setPayBillDesc(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Amount Due (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={payBillAmount}
                    onChange={(e) => setPayBillAmount(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Due Date</label>
                  <input
                    type="date"
                    value={payBillDueDate}
                    onChange={(e) => setPayBillDueDate(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePayableOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181F2C] text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-xs hover:bg-amber-400"
                >
                  Record Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Create Budget Modal */}
      {isCreateBudgetOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#13171F] border border-[#1F2633] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base flex items-center gap-2 text-[#D4AF37]">
              <Landmark className="w-5 h-5" />
              Create Operational Budget
            </h3>
            <form onSubmit={handleCreateBudget} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Budget Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q1 2027 R&D Compute Scaling"
                  value={bgtName}
                  onChange={(e) => setBgtName(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Period</label>
                  <select
                    value={bgtPeriod}
                    onChange={(e) => setBgtPeriod(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Allocated Cap (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={bgtAllocated}
                    onChange={(e) => setBgtAllocated(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateBudgetOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181F2C] text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#D4AF37] text-black font-bold text-xs hover:bg-[#E5C158]"
                >
                  Create Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Submit Expense Request Modal */}
      {isCreateRequestOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#13171F] border border-[#1F2633] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base flex items-center gap-2 text-[#D4AF37]">
              <Banknote className="w-5 h-5" />
              Requisition / Expense Approval Request
            </h3>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Requisition Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Regional Field Travel Fuel & Per Diem"
                  value={reqTitle}
                  onChange={(e) => setReqTitle(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Operational Justification</label>
                <textarea
                  required
                  rows={2}
                  value={reqDesc}
                  onChange={(e) => setReqDesc(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Amount (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={reqAmount}
                    onChange={(e) => setReqAmount(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Urgency</label>
                  <select
                    value={reqUrgency}
                    onChange={(e) => setReqUrgency(e.target.value as any)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateRequestOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181F2C] text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#D4AF37] text-black font-bold text-xs hover:bg-[#E5C158]"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Review Sign-off Modal */}
      {isReviewRequestOpen && targetRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#13171F] border border-[#1F2633] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base flex items-center gap-2 text-[#D4AF37]">
              <ShieldCheck className="w-5 h-5" />
              Executive Review: {targetRequest.title}
            </h3>
            <div className="text-xs text-slate-400">
              Requested: <span className="text-[#D4AF37] font-bold">{formatKES(targetRequest.amount)}</span> by{' '}
              <span className="text-white font-medium">{targetRequest.requestedByName}</span>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">Review Comments</label>
              <textarea
                rows={2}
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                placeholder="Approval rationale or rejection feedback..."
                className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-[#D4AF37]"
              ></textarea>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setIsReviewRequestOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#181F2C] text-slate-300 text-xs"
              >
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleReviewRequest('reject')}
                  className="px-3 py-1.5 rounded-lg bg-rose-600/20 border border-rose-600/40 text-rose-300 text-xs font-semibold hover:bg-rose-600/30"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewRequest('approve')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500"
                >
                  Approve Sign-Off
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 10. Disburse Funds Modal */}
      {isPayRequestOpen && targetRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#13171F] border border-[#1F2633] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base flex items-center gap-2 text-emerald-400">
              <Banknote className="w-5 h-5" />
              Disburse Funds: {targetRequest.title}
            </h3>
            <div className="text-xs text-slate-400">
              Amount to Disburse: <span className="text-emerald-400 font-bold">{formatKES(targetRequest.amount)}</span>
            </div>

            <form onSubmit={handlePayRequest} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Disbursing Account</label>
                <select
                  value={payAccount}
                  onChange={(e) => setPayAccount(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatKES(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="bank_transfer">Bank Transfer (RTGS / EFT)</option>
                  <option value="mobile_money">M-Pesa Business Till</option>
                  <option value="cash">Executive Petty Cash</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayRequestOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181F2C] text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500"
                >
                  Disburse & Deduct Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 11. Add Account Modal */}
      {isCreateAccountOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-[#13171F] border border-[#1F2633] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base flex items-center gap-2 text-[#D4AF37]">
              <CreditCard className="w-5 h-5" />
              Register Treasury Account
            </h3>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-medium">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stanbic Corporate USD Treasury"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-medium">Account Type</label>
                  <select
                    value={accType}
                    onChange={(e) => setAccType(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="bank">Commercial Bank</option>
                    <option value="mobile_money">Merchant Mobile Till</option>
                    <option value="cash">Petty Cash Safe</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-medium">Opening Balance (KES)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={accOpening}
                    onChange={(e) => setAccOpening(e.target.value)}
                    className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Account Number / Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. •••• 9812 or Till 982142"
                  value={accNumber}
                  onChange={(e) => setAccNumber(e.target.value)}
                  className="w-full mt-1 bg-[#0D0F12] border border-[#1F2633] rounded-lg p-2 text-sm text-slate-200 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateAccountOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#181F2C] text-slate-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#D4AF37] text-black font-bold text-xs hover:bg-[#E5C158]"
                >
                  Register Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
