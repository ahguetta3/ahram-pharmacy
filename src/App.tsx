import React, { useState, useEffect, useCallback } from 'react';
import {
  PlusCircle, Wallet, Banknote, History, LayoutDashboard,
  ArrowRightLeft, ChevronRight, AlertCircle, CheckCircle2,
  LogOut, Download, RefreshCw, X
} from 'lucide-react';
import {
  getCurrentShift, startShift, closeShift, getShiftHistory,
  addExpense, getExpenses, addTransfer, getTransfers,
  getMonthlyExpenses, getLastClosedShift
} from './services';
import { Shift, Expense, Transfer, ALL_FUNDS, CATEGORIES, DIGITAL_PROVIDERS, FUND_LABELS } from './types';

type View = 'home' | 'expense' | 'close' | 'dashboard' | 'money-details' | 'transfer' | 'history' | 'start-shift';

function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-white text-sm font-medium ${type === 'success' ? 'bg-emerald-600' : 'bg-red-500'}`}>
      {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span className="flex-1">{msg}</span>
      <button onClick={onClose}><X size={16} /></button>
    </div>
  );
}

export default function App() {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [view, setView] = useState<View>('home');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expenseSource, setExpenseSource] = useState<'Cash' | 'Digital'>('Cash');
  const [monthlyExpenses, setMonthlyExpenses] = useState<Expense[]>([]);
  const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [tempActualTotal, setTempActualTotal] = useState<number | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

  const loadShiftData = useCallback(async (shift: Shift) => {
    const [exp, trans] = await Promise.all([getExpenses(shift.id), getTransfers(shift.id)]);
    setExpenses(exp);
    setTransfers(trans);
  }, []);

  const loadCurrentShift = useCallback(async () => {
    setLoading(true);
    try {
      const shift = await getCurrentShift();
      setCurrentShift(shift);
      if (shift) {
        await loadShiftData(shift);
        setView('home');
      } else {
        setView('start-shift');
      }
    } catch (err: any) {
      showToast('خطأ في الاتصال: ' + (err?.message || 'تحقق من الإنترنت'), 'error');
    } finally {
      setLoading(false);
    }
  }, [loadShiftData]);

  useEffect(() => { loadCurrentShift(); }, [loadCurrentShift]);

  useEffect(() => {
    if (view === 'dashboard') getMonthlyExpenses().then(setMonthlyExpenses).catch(() => {});
    if (view === 'history') getShiftHistory().then(setShiftHistory).catch(() => {});
  }, [view]);

  const getFundBalance = (fund: string): number => {
    if (!currentShift) return 0;
    const openingMap: Record<string, number> = {
      Cash: currentShift.openingCash, Bankily: currentShift.openingBankily,
      Masrvi: currentShift.openingMasrvi, Sedad: currentShift.openingSedad, BimBank: currentShift.openingBimbank,
    };
    const opening = openingMap[fund] || 0;
    const spent = expenses
      .filter(e => (e.source === 'Cash' && fund === 'Cash') || (e.source === 'Digital' && e.digitalProvider === fund))
      .reduce((s, e) => s + e.amount, 0);
    const inFlow = transfers.filter(t => t.toFund === fund).reduce((s, t) => s + t.amount, 0);
    const outFlow = transfers.filter(t => t.fromFund === fund).reduce((s, t) => s + t.amount, 0);
    return opening - spent + inFlow - outFlow;
  };

  const activeExpenses = expenses.filter(e => !e.isFromOpening).reduce((s, e) => s + e.amount, 0);
  const openingExpenses = expenses.filter(e => e.isFromOpening).reduce((s, e) => s + e.amount, 0);
  const totalExpenses = activeExpenses + openingExpenses;
  const openingTotal = currentShift
    ? currentShift.openingCash + currentShift.openingBankily + currentShift.openingMasrvi + currentShift.openingSedad + currentShift.openingBimbank
    : 0;
  const currentCalculatedTotal = ALL_FUNDS.reduce((s, f) => s + getFundBalance(f), 0);
  const shiftIncome = tempActualTotal !== null ? (tempActualTotal + totalExpenses - openingTotal) : null;

  const handleStartShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    try {
      const lastShift = await getLastClosedShift();
      await startShift({
        type: f.get('type') as 'Morning' | 'Evening',
        openingCash: lastShift?.closedCash ?? parseFloat(f.get('opening_cash') as string || '0'),
        openingBankily: lastShift?.closedBankily ?? parseFloat(f.get('opening_bankily') as string || '0'),
        openingMasrvi: lastShift?.closedMasrvi ?? parseFloat(f.get('opening_masrvi') as string || '0'),
        openingSedad: lastShift?.closedSedad ?? parseFloat(f.get('opening_sedad') as string || '0'),
        openingBimbank: lastShift?.closedBimbank ?? parseFloat(f.get('opening_bimbank') as string || '0'),
      });
      showToast('تم فتح الوردية ✓');
      await loadCurrentShift();
    } catch (err: any) {
      showToast('فشل فتح الوردية: ' + (err?.message || ''), 'error');
    } finally { setSubmitting(false); }
  };

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentShift) return;
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    try {
      const source = f.get('source') as 'Cash' | 'Digital';
      const amount = parseFloat(f.get('amount') as string);

      if (!amount || isNaN(amount) || amount <= 0) {
        showToast('أدخل مبلغاً صحيحاً', 'error');
        return;
      }

      const data: Record<string, any> = {
        shiftId: currentShift.id,
        category: f.get('category') as string,
        amount,
        source,
        isFromOpening: f.get('expense_type') === 'Opening',
        description: (f.get('description') as string) || '',
      };

      if (source === 'Digital') {
        const provider = f.get('digital_provider') as string;
        if (provider) data['digitalProvider'] = provider;
      }

      await addExpense(data);
      await loadShiftData(currentShift);
      showToast('تم تسجيل المصروف ✓');
      setView('home');
    } catch (err: any) {
      showToast('فشل التسجيل: ' + (err?.message || ''), 'error');
    } finally { setSubmitting(false); }
  };

  const handleAddTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentShift) return;
    const f = new FormData(e.currentTarget);
    const from = f.get('from_fund') as string;
    const to = f.get('to_fund') as string;
    if (from === to) { showToast('لا يمكن التحويل لنفس الصندوق', 'error'); return; }
    setSubmitting(true);
    try {
      await addTransfer({ shiftId: currentShift.id, fromFund: from, toFund: to, amount: parseFloat(f.get('amount') as string) });
      await loadShiftData(currentShift);
      showToast('تم التحويل ✓');
      setView('money-details');
    } catch (err: any) {
      showToast('فشل التحويل: ' + (err?.message || ''), 'error');
    } finally { setSubmitting(false); }
  };

  const handleCloseShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentShift) return;
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    try {
      await closeShift(currentShift.id, {
        closedCash: parseFloat(f.get('cash') as string || '0'),
        closedBankily: parseFloat(f.get('bankily') as string || '0'),
        closedMasrvi: parseFloat(f.get('masrvi') as string || '0'),
        closedSedad: parseFloat(f.get('sedad') as string || '0'),
        closedBimbank: parseFloat(f.get('bimbank') as string || '0'),
      });
      showToast('تم إغلاق الوردية ✓');
      await loadCurrentShift();
    } catch (err: any) {
      showToast('فشل الإغلاق: ' + (err?.message || ''), 'error');
    } finally { setSubmitting(false); }
  };

  const exportCSV = () => {
    if (!expenses.length) { showToast('لا توجد بيانات', 'error'); return; }
    const rows = [
      ['التاريخ', 'الفئة', 'المبلغ', 'المصدر', 'التطبيق', 'من العهدة', 'الوصف'],
      ...expenses.map(e => [
        new Date(e.timestamp).toLocaleString('ar-EG'),
        e.category, e.amount, e.source,
        e.digitalProvider || '', e.isFromOpening ? 'نعم' : 'لا', e.description
      ])
    ];
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `مصاريف_${new Date().toLocaleDateString('ar-EG').replace(/\//g, '-')}.csv`;
    a.click();
  };

  const dailyBreakdown = monthlyExpenses.reduce((acc, e) => {
    const day = e.timestamp.slice(0, 10);
    acc[day] = (acc[day] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-stone-500 text-sm">جاري التحميل...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24" dir="rtl">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <header className="bg-white border-b border-stone-200 px-5 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-center max-w-lg mx-auto">
          <div>
            <h1 className="text-lg font-bold">صيدلية الأهرام</h1>
            <p className="text-xs text-stone-400">
              {currentShift?.type === 'Morning' ? '☀️ صباحية' : '🌙 مسائية'} · {new Date().toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadCurrentShift} className="p-2 hover:bg-stone-100 rounded-full">
              <RefreshCw size={16} className="text-stone-400" />
            </button>
            {currentShift && <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-100">نشط</span>}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-5">

        {/* ── START SHIFT ── */}
        {view === 'start-shift' && (
          <div className="space-y-5 pt-2">
            <div className="text-center py-4 space-y-1">
              <div className="text-4xl mb-3">🏥</div>
              <h2 className="text-xl font-bold">بدء وردية جديدة</h2>
              <p className="text-stone-400 text-sm">لا توجد وردية نشطة حالياً</p>
            </div>
            <form onSubmit={handleStartShift} className="space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">نوع الوردية</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Morning', 'Evening'] as const).map(t => (
                      <label key={t} className="relative">
                        <input type="radio" name="type" value={t} defaultChecked={t === 'Morning'} className="peer sr-only" />
                        <div className="p-3 text-center rounded-xl border border-stone-200 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 cursor-pointer text-sm font-medium transition-all">
                          {t === 'Morning' ? '☀️ صباحية' : '🌙 مسائية'}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-stone-400 bg-stone-50 p-3 rounded-xl">💡 إذا كانت هناك وردية سابقة، ستُرحَّل أرصدتها تلقائياً. وإلا أدخلها يدوياً:</p>
                {[['opening_cash','💵 النقدي'],['opening_bankily','📱 بنكيلي'],['opening_masrvi','📱 مصرفي'],['opening_sedad','📱 سداد'],['opening_bimbank','📱 بيم بنك']].map(([name, label]) => (
                  <div key={name}>
                    <label className="text-xs font-medium text-stone-500">{label}</label>
                    <input type="number" name={name} defaultValue="0" step="0.01" className="w-full mt-1 p-3 bg-stone-50 rounded-xl border border-stone-200 text-sm outline-none focus:border-emerald-400" />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold shadow-lg disabled:opacity-60 active:scale-[0.98] transition-transform">
                {submitting ? 'جاري الفتح...' : 'فتح الوردية'}
              </button>
            </form>
          </div>
        )}

        {/* ── HOME ── */}
        {view === 'home' && currentShift && (
          <div className="space-y-4">
            <button onClick={() => setView('money-details')} className="w-full text-right active:scale-[0.98] transition-transform">
              <div className="bg-stone-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-stone-400 text-xs">اضغط لتفاصيل الصناديق</p>
                    <ChevronRight size={16} className="text-stone-500 rotate-180" />
                  </div>
                  <p className="text-stone-400 text-sm mb-1">الرصيد المتوقع</p>
                  <h2 className="text-4xl font-light tracking-tighter mb-5">
                    {currentCalculatedTotal.toLocaleString('ar-EG')} <span className="text-lg opacity-40">أوقية</span>
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-2xl p-3">
                      <p className="text-[10px] text-stone-400 mb-1">مصاريف الوردية</p>
                      <p className="text-lg font-semibold text-red-300">{activeExpenses.toLocaleString('ar-EG')}</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-3">
                      <p className="text-[10px] text-stone-400 mb-1">سحب من العهدة</p>
                      <p className="text-lg font-semibold text-amber-300">{openingExpenses.toLocaleString('ar-EG')}</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -left-8 -bottom-8 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
              </div>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setView('expense')} className="flex flex-col items-center justify-center bg-white p-5 rounded-2xl border border-stone-200 active:scale-[0.96] transition-transform group">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
                  <PlusCircle size={24} className="text-emerald-600" />
                </div>
                <span className="font-semibold text-sm">إضافة مصروف</span>
              </button>
              <button onClick={() => setView('close')} className="flex flex-col items-center justify-center bg-white p-5 rounded-2xl border border-stone-200 active:scale-[0.96] transition-transform group">
                <div className="w-12 h-12 bg-stone-50 rounded-xl flex items-center justify-center mb-3">
                  <LogOut size={24} className="text-stone-600" />
                </div>
                <span className="font-semibold text-sm">إغلاق الوردية</span>
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-base px-1">آخر المصاريف</h3>
              {expenses.length === 0
                ? <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-stone-300"><p className="text-stone-400 text-sm">لا توجد مصاريف بعد</p></div>
                : <div className="space-y-2">
                  {expenses.slice(0, 15).map(exp => (
                    <div key={exp.id} className="bg-white p-4 rounded-2xl border border-stone-100 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${exp.source === 'Cash' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                        {exp.source === 'Cash' ? <Banknote size={18} className="text-amber-600" /> : <Wallet size={18} className="text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{exp.category}</p>
                          {exp.isFromOpening && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">عهدة</span>}
                        </div>
                        <p className="text-xs text-stone-400 truncate">{exp.digitalProvider ? `${exp.digitalProvider} · ` : ''}{exp.description || 'بدون وصف'}</p>
                      </div>
                      <div className="shrink-0 text-left">
                        <p className="font-bold text-red-500 text-sm">-{exp.amount.toLocaleString('ar-EG')}</p>
                        <p className="text-[10px] text-stone-400">{new Date(exp.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>
          </div>
        )}

        {/* ── MONEY DETAILS ── */}
        {view === 'money-details' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setView('home')} className="p-2 hover:bg-stone-100 rounded-full"><ChevronRight size={22} /></button>
                <h2 className="text-lg font-bold">تفاصيل الصناديق</h2>
              </div>
              <button onClick={() => setView('transfer')} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                <ArrowRightLeft size={15} />تحويل
              </button>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-3">
              <p className="text-xs font-bold text-stone-400 uppercase">حساب دخل الوردية</p>
              <input type="number" placeholder="أدخل الجرد الفعلي الحالي..."
                className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 text-sm outline-none focus:border-emerald-400"
                onChange={e => setTempActualTotal(e.target.value ? parseFloat(e.target.value) : null)} />
              {shiftIncome !== null && (
                <div className={`p-4 rounded-xl flex justify-between items-center ${shiftIncome >= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                  <span className="text-sm font-medium">صافي دخل الوردية:</span>
                  <span className={`text-xl font-bold ${shiftIncome >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{shiftIncome.toLocaleString('ar-EG')}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {ALL_FUNDS.map(fund => (
                <div key={fund} className="bg-white p-4 rounded-2xl border border-stone-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${fund === 'Cash' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                      {fund === 'Cash' ? <Banknote size={22} className="text-amber-600" /> : <Wallet size={22} className="text-blue-600" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{FUND_LABELS[fund]}</p>
                      <p className="text-xs text-stone-400">الرصيد</p>
                    </div>
                  </div>
                  <p className="text-xl font-medium">{getFundBalance(fund).toLocaleString('ar-EG')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TRANSFER ── */}
        {view === 'transfer' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('money-details')} className="p-2 hover:bg-stone-100 rounded-full"><ChevronRight size={22} /></button>
              <h2 className="text-lg font-bold">تحويل بين الصناديق</h2>
            </div>
            <form onSubmit={handleAddTransfer} className="bg-white rounded-2xl p-5 border border-stone-200 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {['from_fund', 'to_fund'].map((name, i) => (
                  <div key={name}>
                    <label className="text-xs font-bold text-stone-400">{i === 0 ? 'من' : 'إلى'}</label>
                    <select name={name} className="w-full mt-1 p-3 bg-stone-50 rounded-xl border border-stone-200 text-sm outline-none" required>
                      {ALL_FUNDS.map(f => <option key={f} value={f}>{FUND_LABELS[f]}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400">المبلغ</label>
                <input type="number" name="amount" placeholder="0" step="0.01" className="w-full mt-1 p-4 bg-stone-50 rounded-xl border border-stone-200 text-2xl font-light outline-none focus:border-emerald-400" required />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-stone-900 text-white p-4 rounded-xl font-bold disabled:opacity-60 active:scale-[0.98] transition-transform">
                {submitting ? 'جاري التحويل...' : 'تأكيد التحويل'}
              </button>
            </form>
          </div>
        )}

        {/* ── ADD EXPENSE ── */}
        {view === 'expense' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('home')} className="p-2 hover:bg-stone-100 rounded-full"><ChevronRight size={22} /></button>
              <h2 className="text-lg font-bold">تسجيل مصروف جديد</h2>
            </div>
            <form onSubmit={handleAddExpense} className="bg-white rounded-2xl p-5 border border-stone-200 space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase">الفئة</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat, i) => (
                    <label key={cat} className="relative">
                      <input type="radio" name="category" value={cat} defaultChecked={i === 0} className="peer sr-only" required />
                      <div className="p-3 text-center rounded-xl border border-stone-200 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 cursor-pointer text-sm font-medium transition-all">{cat}</div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase">مصدر المال</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'Active', l: '🟢 الصندوق النشط' }, { v: 'Opening', l: '🟡 من العهدة' }].map(({ v, l }) => (
                    <label key={v} className="relative">
                      <input type="radio" name="expense_type" value={v} defaultChecked={v === 'Active'} className="peer sr-only" required />
                      <div className="p-3 text-center rounded-xl border border-stone-200 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 cursor-pointer text-sm font-medium transition-all">{l}</div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase">المبلغ (أوقية)</label>
                <input type="number" name="amount" placeholder="0" step="0.01" min="1" className="w-full mt-1 p-4 bg-stone-50 rounded-xl border border-stone-200 text-3xl font-light outline-none focus:border-emerald-400" required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-400 uppercase">طريقة الدفع</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 'Cash', l: '💵 نقدي' }, { v: 'Digital', l: '📱 رقمي' }].map(({ v, l }) => (
                    <label key={v} className="relative">
                      <input type="radio" name="source" value={v} checked={expenseSource === v} onChange={() => setExpenseSource(v as any)} className="peer sr-only" required />
                      <div className="p-3 text-center rounded-xl border border-stone-200 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 cursor-pointer text-sm font-medium transition-all">{l}</div>
                    </label>
                  ))}
                </div>
              </div>
              {expenseSource === 'Digital' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-400 uppercase">التطبيق</label>
                  <div className="grid grid-cols-2 gap-2">
                    {DIGITAL_PROVIDERS.map((p, i) => (
                      <label key={p} className="relative">
                        <input type="radio" name="digital_provider" value={p} defaultChecked={i === 0} className="peer sr-only" required />
                        <div className="p-3 text-center rounded-xl border border-stone-200 peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 cursor-pointer text-sm font-medium transition-all">{FUND_LABELS[p]}</div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-stone-400 uppercase">الوصف (اختياري)</label>
                <textarea name="description" rows={2} className="w-full mt-1 p-3 bg-stone-50 rounded-xl border border-stone-200 text-sm outline-none focus:border-emerald-400 resize-none" placeholder="تفاصيل إضافية..." />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-stone-900 text-white p-4 rounded-xl font-bold shadow-lg disabled:opacity-60 active:scale-[0.98] transition-transform">
                {submitting ? 'جاري الحفظ...' : 'تأكيد المصروف'}
              </button>
            </form>
          </div>
        )}

        {/* ── CLOSE SHIFT ── */}
        {view === 'close' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('home')} className="p-2 hover:bg-stone-100 rounded-full"><ChevronRight size={22} /></button>
              <h2 className="text-lg font-bold">إغلاق الوردية والجرد</h2>
            </div>
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
              <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-amber-800 leading-relaxed">أدخل المبالغ الفعلية الموجودة الآن. ستُرحَّل للوردية القادمة تلقائياً.</p>
            </div>
            <form onSubmit={handleCloseShift} className="space-y-3">
              <div className="bg-white rounded-2xl p-5 border border-stone-200 space-y-3">
                {[['cash','💵 النقدي (كاش)'],['bankily','📱 بنكيلي'],['masrvi','📱 مصرفي'],['sedad','📱 سداد'],['bimbank','📱 بيم بنك']].map(([name, label]) => (
                  <div key={name} className="flex items-center gap-3">
                    <label className="text-sm text-stone-600 w-32 shrink-0">{label}</label>
                    <input type="number" name={name} defaultValue="0" step="0.01" className="flex-1 p-3 bg-stone-50 rounded-xl border border-stone-200 text-sm outline-none focus:border-emerald-400" required />
                  </div>
                ))}
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-stone-900 text-white p-4 rounded-xl font-bold shadow-xl disabled:opacity-60 active:scale-[0.98] transition-transform">
                {submitting ? 'جاري الإغلاق...' : 'إغلاق الوردية وترحيل العهدة'}
              </button>
            </form>
          </div>
        )}

        {/* ── HISTORY ── */}
        {view === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('home')} className="p-2 hover:bg-stone-100 rounded-full"><ChevronRight size={22} /></button>
              <h2 className="text-lg font-bold">سجل الورديات</h2>
            </div>
            <div className="space-y-3">
              {shiftHistory.length === 0
                ? <div className="text-center p-12 text-stone-400 bg-white rounded-2xl border border-stone-200">لا توجد ورديات سابقة</div>
                : shiftHistory.map(shift => {
                  const opening = shift.openingCash + shift.openingBankily + shift.openingMasrvi + shift.openingSedad + shift.openingBimbank;
                  const closing = (shift.closedCash || 0) + (shift.closedBankily || 0) + (shift.closedMasrvi || 0) + (shift.closedSedad || 0) + (shift.closedBimbank || 0);
                  return (
                    <div key={shift.id} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-sm">{shift.type === 'Morning' ? '☀️ صباحية' : '🌙 مسائية'}</p>
                          <p className="text-xs text-stone-400">{new Date(shift.startTime).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                        </div>
                        <span className="bg-stone-100 text-stone-500 text-[10px] font-bold px-2 py-1 rounded">مغلقة</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone-50">
                        <div><p className="text-[10px] text-stone-400">الافتتاحي</p><p className="text-sm font-medium">{opening.toLocaleString('ar-EG')}</p></div>
                        <div className="text-left"><p className="text-[10px] text-stone-400">الإغلاق</p><p className="text-sm font-bold text-emerald-600">{closing.toLocaleString('ar-EG')}</p></div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {view === 'dashboard' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setView('home')} className="p-2 hover:bg-stone-100 rounded-full"><ChevronRight size={22} /></button>
                <h2 className="text-lg font-bold">التقارير الشهرية</h2>
              </div>
              <button onClick={exportCSV} className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <Download size={14} />تصدير
              </button>
            </div>
            <div className="bg-stone-900 text-white p-5 rounded-2xl shadow-xl">
              <p className="text-stone-400 text-xs mb-1">إجمالي عمليات هذا الشهر</p>
              <p className="text-3xl font-light mb-4">{monthlyExpenses.length} <span className="text-sm opacity-40">عملية</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-[10px] text-stone-400 mb-1">مصاريف الورديات</p>
                  <p className="text-lg font-semibold text-red-300">{monthlyExpenses.filter(e => !e.isFromOpening).reduce((s, e) => s + e.amount, 0).toLocaleString('ar-EG')}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <p className="text-[10px] text-stone-400 mb-1">سحب من العهدة</p>
                  <p className="text-lg font-semibold text-amber-300">{monthlyExpenses.filter(e => e.isFromOpening).reduce((s, e) => s + e.amount, 0).toLocaleString('ar-EG')}</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-stone-500 px-1">التفصيل اليومي</h3>
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden divide-y divide-stone-50">
                {Object.entries(dailyBreakdown).length === 0
                  ? <div className="p-8 text-center text-stone-400 text-sm">لا توجد بيانات</div>
                  : Object.entries(dailyBreakdown).sort(([a], [b]) => b.localeCompare(a)).map(([date, total]) => (
                    <div key={date} className="p-4 flex justify-between items-center">
                      <p className="text-sm font-medium">{new Date(date).toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      <p className="font-bold text-stone-900">{total.toLocaleString('ar-EG')}</p>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-10" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-lg mx-auto flex justify-around items-center py-3 px-4">
          {[
            { v: 'home', icon: <ArrowRightLeft size={20} />, label: 'الرئيسية' },
            { v: 'dashboard', icon: <LayoutDashboard size={20} />, label: 'التقارير' },
            { v: 'history', icon: <History size={20} />, label: 'السجل' },
          ].map(({ v, icon, label }) => (
            <button key={v} onClick={() => setView(v as View)} className={`flex flex-col items-center gap-1 transition-colors ${view === v ? 'text-emerald-600' : 'text-stone-400'}`}>
              {icon}
              <span className="text-[10px] font-bold">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
