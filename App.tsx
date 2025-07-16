
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Transaction, TransactionType, CashDenomination, Customer, CustomerTransaction, DailyShippingRecord } from './types';
import { PlusCircle, MinusCircle, Edit, Trash2, Download, Upload, Banknote, ChevronsUpDown, X, Save, Search, Calendar, FileText, Truck, Users, ArrowLeft, Plus, DollarSign } from 'lucide-react';

// =================================================================================
// CONSTANTS
// =================================================================================

const TREASURY_DENOMINATIONS: readonly number[] = [200, 100, 50, 20, 10, 5, 1, 0.5, 0.25];
const SHIPPING_DENOMINATIONS: readonly number[] = [200, 100, 50, 20, 10, 5, 1, 0.5];
const PAYMENT_FIELDS: readonly (keyof DailyShippingRecord['payments'])[] = ['fawry', 'instapay', 'cards', 'aman', 'bedayti', 'cash', 'masary'];
const PAYMENT_LABELS: Record<keyof DailyShippingRecord['payments'], string> = {fawry: 'فوري', instapay: 'انستاباي', cards: 'كروت', aman: 'أمان', bedayti: 'بدايتي', cash: 'كاش', masary: 'مصاري'};

const DEFAULT_SHIPPING_RECORD: Omit<DailyShippingRecord, 'date'> = {
    payments: { fawry: 0, instapay: 0, cards: 0, aman: 0, bedayti: 0, cash: 0, masary: 0 },
    cashDetails: [],
    receivables: 0,
};

// =================================================================================
// HELPERS & HOOKS
// =================================================================================

const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error(`Error writing to localStorage key “${key}”:`, error);
    }
  }, [key, state]);

  return [state, setState];
};

const useClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);
  return time;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
};

const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    }).format(d);
};

const formatDateShort = (date: Date) => {
    return new Intl.DateTimeFormat('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
};

const toYyyyMmDd = (date: Date) => date.toISOString().split('T')[0];

const calculateCustomerBalance = (customer: Customer): number => {
  if (!customer || !customer.transactions) return 0;
  return customer.transactions.reduce((acc, tx) => acc + tx.amount, 0);
};

const getDaysInYear = () => {
    const year = new Date().getFullYear();
    const date = new Date(year, 0, 1);
    const days = [];
    while (date.getFullYear() === year) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
};

// =================================================================================
// UI COMPONENTS
// =================================================================================

const Logo = () => (
    <div className="flex items-center gap-3">
        <div className="bg-cyan-500 p-2 rounded-lg">
            <Banknote className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white whitespace-nowrap">مؤسسة شعبان التجارية</h1>
    </div>
);

const Header = () => {
    const currentTime = useClock();
    return (
        <header className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-b-xl shadow-lg sticky top-0 z-40">
            <div className="container mx-auto flex justify-between items-center">
                <Logo />
                <div className="text-sm md:text-lg text-gray-300 text-center hidden sm:block">
                    <div>{formatDate(currentTime)}</div>
                </div>
            </div>
        </header>
    );
};

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
};

const Modal = ({ isOpen, onClose, title, children, size = 'lg' }: ModalProps) => {
  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl',
      full: 'max-w-full h-full',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className={`bg-gray-800 rounded-xl shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};


// =================================================================================
// TREASURY PAGE & COMPONENTS
// =================================================================================
type SummaryDisplayProps = {
    income: number;
    expense: number;
    balance: number;
};

const SummaryDisplay = ({ income, expense, balance }: SummaryDisplayProps) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 p-6 rounded-xl shadow-md flex items-center gap-4">
            <PlusCircle className="w-10 h-10 text-green-400"/>
            <div>
                <p className="text-gray-400 text-sm">إجمالي الوارد</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(income)}</p>
            </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl shadow-md flex items-center gap-4">
            <MinusCircle className="w-10 h-10 text-red-400"/>
            <div>
                <p className="text-gray-400 text-sm">إجمالي المنصرف</p>
                <p className="text-2xl font-bold text-red-400">{formatCurrency(expense)}</p>
            </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl shadow-md flex items-center gap-4">
            <Banknote className="w-10 h-10 text-cyan-400"/>
            <div>
                <p className="text-gray-400 text-sm">الرصيد الحالي</p>
                <p className="text-2xl font-bold text-cyan-400">{formatCurrency(balance)}</p>
            </div>
        </div>
    </div>
);

type TransactionFormProps = {
    onAddTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
};

const TransactionForm = ({ onAddTransaction }: TransactionFormProps) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<TransactionType>(TransactionType.INCOME);
    
    const amountRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLInputElement>(null);
    const typeRef = useRef<HTMLSelectElement>(null);
    const submitRef = useRef<HTMLButtonElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, nextField: React.RefObject<HTMLElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextField.current?.focus();
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !description) {
            alert('الرجاء إدخال المبلغ والبيان');
            return;
        }
        onAddTransaction({ amount: parseFloat(amount), description, type });
        setAmount('');
        setDescription('');
        amountRef.current?.focus();
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-800 p-4 rounded-xl mb-6 flex flex-wrap items-end gap-4">
            <div className="flex-grow">
                <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1">المبلغ</label>
                <input ref={amountRef} type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, descriptionRef)}
                    className="w-full bg-gray-700 text-white rounded-md border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 p-2" required />
            </div>
            <div className="flex-grow" style={{flexBasis: '40%'}}>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">البيان</label>
                <input ref={descriptionRef} type="text" id="description" value={description} onChange={e => setDescription(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, typeRef)}
                    className="w-full bg-gray-700 text-white rounded-md border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 p-2" required />
            </div>
            <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">النوع</label>
                <select ref={typeRef} id="type" value={type} onChange={e => setType(e.target.value as TransactionType)}
                    onKeyDown={(e) => handleKeyDown(e, submitRef)}
                    className="w-full bg-gray-700 text-white rounded-md border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 h-[42px] p-2">
                    <option value={TransactionType.INCOME}>إيراد</option>
                    <option value={TransactionType.EXPENSE}>مصروف</option>
                </select>
            </div>
            <button ref={submitRef} type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md h-[42px] transition-colors">إضافة حركة</button>
        </form>
    );
};

type CashCountModalProps = {
    isOpen: boolean;
    onClose: () => void;
    systemBalance: number;
};

const CashCountModal = ({ isOpen, onClose, systemBalance }: CashCountModalProps) => {
    const [counts, setCounts] = useState<Record<number, number>>({});

    const handleCountChange = (denom: number, count: string) => {
        setCounts(prev => ({ ...prev, [denom]: parseInt(count) || 0 }));
    };

    const totalCash = useMemo(() => {
        return TREASURY_DENOMINATIONS.reduce((acc, denom) => acc + (counts[denom] || 0) * denom, 0);
    }, [counts]);

    const difference = totalCash - systemBalance;

    const getStatus = () => {
        if (difference === 0) return { text: 'مطابق', color: 'text-green-400' };
        if (difference < 0) return { text: `عجز ${formatCurrency(Math.abs(difference))}`, color: 'text-red-400' };
        return { text: `زيادة ${formatCurrency(difference)}`, color: 'text-yellow-400' };
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="جرد الخزينة (الدرج)">
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 font-bold border-b border-gray-600 pb-2">
                    <span>الفئة</span>
                    <span>العدد</span>
                    <span>المجموع</span>
                </div>
                {TREASURY_DENOMINATIONS.map(denom => (
                    <div key={denom} className="grid grid-cols-3 gap-4 items-center">
                        <span className="font-semibold text-cyan-400">{formatCurrency(denom)}</span>
                        <input type="number" min="0" 
                               className="bg-gray-700 text-white rounded-md p-2 border border-gray-600"
                               value={counts[denom] || ''}
                               onChange={e => handleCountChange(denom, e.target.value)} />
                        <span>{formatCurrency((counts[denom] || 0) * denom)}</span>
                    </div>
                ))}
                <div className="border-t border-gray-600 pt-4 mt-4 space-y-2 text-lg">
                    <div className="flex justify-between"><span>إجمالي النقدية:</span> <span className="font-bold">{formatCurrency(totalCash)}</span></div>
                    <div className="flex justify-between"><span>رصيد النظام:</span> <span className="font-bold">{formatCurrency(systemBalance)}</span></div>
                    <div className={`flex justify-between font-bold ${getStatus().color}`}><span>الفرق:</span> <span>{getStatus().text}</span></div>
                    {difference !== 0 && <p className="text-center text-orange-400 pt-4">راجع الحركات جيداً!</p>}
                </div>
            </div>
        </Modal>
    );
};

const TreasuryPage = () => {
    const [transactions, setTransactions] = usePersistentState<Transaction[]>('transactions', []);
    const [filterText, setFilterText] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');
    const [isCashCountOpen, setIsCashCountOpen] = useState(false);
    
    const { totalIncome, totalExpense, currentBalance, filteredTransactions } = useMemo(() => {
        let income = 0;
        let expense = 0;
        let runningBalance = 0;
        
        const sortedTransactions = [...transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const transactionsWithBalance = sortedTransactions.map(t => {
            if (t.type === TransactionType.INCOME) {
                runningBalance += t.amount;
            } else {
                runningBalance -= t.amount;
            }
            return { ...t, balance: runningBalance };
        });

        income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);

        const filtered = transactionsWithBalance.filter(t => {
            const transactionDate = new Date(t.date);
            const matchesText = t.description.toLowerCase().includes(filterText.toLowerCase());

            if (!filterStartDate && !filterEndDate) return matchesText;
            
            const start = filterStartDate ? new Date(filterStartDate) : null;
            if (start) start.setHours(0, 0, 0, 0);

            const end = filterEndDate ? new Date(filterEndDate) : null;
            if (end) end.setHours(23, 59, 59, 999);

            const matchesDate = (!start || transactionDate >= start) && (!end || transactionDate <= end);
            
            return matchesText && matchesDate;
        }).reverse(); // Show newest first
        
        return { totalIncome: income, totalExpense: expense, currentBalance: income - expense, filteredTransactions: filtered };
    }, [transactions, filterText, filterStartDate, filterEndDate]);


    const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>) => {
        const newTransaction: Transaction = {
            ...transaction,
            id: new Date().toISOString() + Math.random(),
            date: new Date().toISOString(),
        };
        setTransactions(prev => [...prev, newTransaction]);
    };
    
    const handleExport = () => {
      const dataStr = JSON.stringify({ transactions }, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `backup_treasury_${new Date().toISOString().split('T')[0]}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result;
          if (typeof text === 'string') {
            const importedData = JSON.parse(text);
            const importedTransactions = importedData.transactions || [];
            
            if (Array.isArray(importedTransactions) && importedTransactions.every(t => t.id && t.date && t.description && t.amount && t.type)) {
              if (window.confirm(`ستقوم باستيراد ${importedTransactions.length} حركة. هل أنت متأكد؟ سيتم دمجها مع الحركات الحالية.`)) {
                const combined = [...transactions, ...importedTransactions];
                const uniqueTransactions = Array.from(new Map(combined.map(t => [t.id, t])).values());
                uniqueTransactions.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                setTransactions(uniqueTransactions);
                alert('تم الاستيراد بنجاح!');
              }
            } else {
              throw new Error('Invalid file format');
            }
          }
        } catch (error) {
          alert('فشل استيراد الملف. تأكد من أنه ملف النسخ الاحتياطي الصحيح.');
          console.error(error);
        }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset input
    };

    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="p-4 md:p-6">
            <SummaryDisplay income={totalIncome} expense={totalExpense} balance={currentBalance} />
            <TransactionForm onAddTransaction={addTransaction} />

            <div className="bg-gray-800 p-4 rounded-xl mb-6">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <h3 className="text-xl font-bold">سجل الحركات</h3>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => setIsCashCountOpen(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition-colors"><Banknote size={18}/> جرد</button>
                        <button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition-colors"><Download size={18}/> تصدير</button>
                        <button onClick={() => inputRef.current?.click()} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2 transition-colors"><Upload size={18}/> استيراد</button>
                        <input type="file" ref={inputRef} onChange={handleImport} className="hidden" accept=".json"/>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="relative">
                       <FileText className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" size={20}/>
                       <input type="text" placeholder="فلتر بالبيان..." value={filterText} onChange={e => setFilterText(e.target.value)}
                           className="w-full bg-gray-700 text-white rounded-md border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 pr-10 p-2"/>
                    </div>
                    <div className="relative">
                        <Calendar className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" size={20}/>
                        <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)}
                            className="w-full bg-gray-700 text-white rounded-md border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 pr-10 p-2"/>
                    </div>
                    <div className="relative">
                        <Calendar className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400" size={20}/>
                        <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)}
                            className="w-full bg-gray-700 text-white rounded-md border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 pr-10 p-2"/>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto bg-gray-800 rounded-xl">
                <table className="w-full text-right">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="p-4 font-semibold">التاريخ والوقت</th>
                            <th className="p-4 font-semibold">البيان</th>
                            <th className="p-4 font-semibold">الوارد</th>
                            <th className="p-4 font-semibold">المنصرف</th>
                            <th className="p-4 font-semibold">الرصيد</th>
                            <th className="p-4 font-semibold">تعديل</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map((t, index) => (
                            <tr key={t.id} className={`border-b border-gray-700 ${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50'}`}>
                                <td className="p-4 whitespace-nowrap">{formatDate(t.date)}</td>
                                <td className="p-4">{t.description}</td>
                                <td className="p-4 text-green-400">{t.type === TransactionType.INCOME ? formatCurrency(t.amount) : '-'}</td>
                                <td className="p-4 text-red-400">{t.type === TransactionType.EXPENSE ? formatCurrency(t.amount) : '-'}</td>
                                <td className={`p-4 font-bold ${(t.balance ?? 0) >= 0 ? 'text-cyan-300' : 'text-orange-400'}`}>{formatCurrency(t.balance ?? 0)}</td>
                                <td className="p-4">
                                    <button className="text-gray-400 hover:text-white" onClick={() => alert("ميزة التعديل قيد التطوير")}><Edit size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredTransactions.length === 0 && <p className="text-center p-8 text-gray-400">لا توجد حركات مطابقة للفلتر.</p>}
            </div>
            <CashCountModal isOpen={isCashCountOpen} onClose={() => setIsCashCountOpen(false)} systemBalance={currentBalance} />
        </div>
    );
}

// =================================================================================
// SHIPPING PAGE & COMPONENTS
// =================================================================================

type ShippingCashModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSave: (cashDetails: CashDenomination[]) => void;
    initialDetails: CashDenomination[];
};

const ShippingCashModal = ({ isOpen, onClose, onSave, initialDetails }: ShippingCashModalProps) => {
    const [counts, setCounts] = useState<Record<number, number>>({});
    
    useEffect(() => {
        if (isOpen) {
            const initialCounts = initialDetails.reduce((acc, item) => {
                acc[item.value] = item.count;
                return acc;
            }, {} as Record<number, number>);
            setCounts(initialCounts);
        }
    }, [isOpen, initialDetails]);
    
    const handleSave = () => {
        const cashDetails: CashDenomination[] = SHIPPING_DENOMINATIONS
            .map(value => ({ value, count: counts[value] || 0 }))
            .filter(item => item.count > 0);
        onSave(cashDetails);
        onClose();
    };

    const totalCash = useMemo(() => SHIPPING_DENOMINATIONS.reduce((acc, denom) => acc + (counts[denom] || 0) * denom, 0), [counts]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="جرد النقدية اليومي">
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 font-bold border-b border-gray-600 pb-2">
                    <span>الفئة</span><span>العدد</span><span>المجموع</span>
                </div>
                {SHIPPING_DENOMINATIONS.map(denom => (
                    <div key={denom} className="grid grid-cols-3 gap-4 items-center">
                        <span className="font-semibold text-cyan-400">{formatCurrency(denom)}</span>
                        <input type="number" min="0" className="bg-gray-700 text-white rounded-md p-2 border border-gray-600"
                               value={counts[denom] || ''} onChange={e => setCounts(p => ({...p, [denom]: parseInt(e.target.value) || 0}))}/>
                        <span>{formatCurrency((counts[denom] || 0) * denom)}</span>
                    </div>
                ))}
                <div className="border-t border-gray-600 pt-4 mt-4 text-lg">
                    <div className="flex justify-between"><span>إجمالي النقدية:</span> <span className="font-bold">{formatCurrency(totalCash)}</span></div>
                </div>
                 <div className="flex justify-end gap-3 pt-4">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors">إلغاء</button>
                    <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md transition-colors">حفظ</button>
                </div>
            </div>
        </Modal>
    );
};

type ReceivablesModalProps = {
    isOpen: boolean;
    onClose: () => void;
    customers: Customer[];
    setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
    setDailyRecords: React.Dispatch<React.SetStateAction<Record<string, DailyShippingRecord>>>;
    currentDate: string | null;
};

const ReceivablesModal = ({ isOpen, onClose, customers, setCustomers, setDailyRecords, currentDate }: ReceivablesModalProps) => {
    const [view, setView] = useState<'list' | 'detail'>('list');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newTx, setNewTx] = useState({ description: '', amount: '' });

    const handleAddCustomer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCustomerName.trim()) return;
        const newCustomer: Customer = {
            id: new Date().toISOString() + Math.random(),
            name: newCustomerName.trim(),
            transactions: []
        };
        setCustomers(prev => [...prev, newCustomer]);
        setNewCustomerName('');
    };

    const handleSelectCustomer = (customer: Customer) => {
        setSelectedCustomer(customer);
        setView('detail');
    };
    
    const handleAddTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer || !newTx.amount || !currentDate) return;
        
        const txAmount = parseFloat(newTx.amount);
        if (isNaN(txAmount)) return;

        const newTransaction: CustomerTransaction = {
            id: new Date().toISOString() + Math.random(),
            date: new Date().toISOString(),
            description: newTx.description || 'حركة جديدة',
            amount: txAmount
        };
        
        let updatedSelectedCustomer: Customer | null = null;
        const newCustomers = customers.map(c => {
            if (c.id === selectedCustomer.id) {
                const updatedCustomer = { ...c, transactions: [...c.transactions, newTransaction] };
                updatedSelectedCustomer = updatedCustomer;
                return updatedCustomer;
            }
            return c;
        });

        setCustomers(newCustomers);

        // Propagate balance changes to daily records
        const newTotalBalance = newCustomers.reduce((sum, c) => sum + calculateCustomerBalance(c), 0);
        setDailyRecords(prevRecords => {
            const updatedRecords = { ...prevRecords };
            const modalStartDate = new Date(currentDate);
            modalStartDate.setHours(0, 0, 0, 0);

            const allDatesInYear = getDaysInYear();
            const futureDates = allDatesInYear.filter(d => d >= modalStartDate);
            
            futureDates.forEach(dateObj => {
                const dateKey = toYyyyMmDd(dateObj);
                const existingRecord = updatedRecords[dateKey] || { ...DEFAULT_SHIPPING_RECORD, date: dateKey };
                updatedRecords[dateKey] = { ...existingRecord, receivables: newTotalBalance };
            });

            return updatedRecords;
        });
        
        if (updatedSelectedCustomer) {
            setSelectedCustomer(updatedSelectedCustomer);
        }
        
        setNewTx({ description: '', amount: '' });
    };

    const customerBalance = selectedCustomer ? calculateCustomerBalance(selectedCustomer) : 0;
    
    const sortedCustomers = useMemo(() => [...customers].sort((a,b) => a.name.localeCompare(b.name)), [customers]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="إدارة المديونيات" size="xl">
            {view === 'list' && (
                <div>
                    <form onSubmit={handleAddCustomer} className="flex gap-2 mb-4">
                        <input type="text" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} placeholder="اسم العميل الجديد" className="flex-grow bg-gray-700 text-white rounded-md p-2 border border-gray-600" />
                        <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md flex items-center gap-2"><Plus size={18}/> إضافة</button>
                    </form>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-700/50 sticky top-0"><tr><th className="p-3">اسم العميل</th><th className="p-3">الرصيد الحالي</th></tr></thead>
                            <tbody>
                                {sortedCustomers.map(c => (
                                    <tr key={c.id} onClick={() => handleSelectCustomer(c)} className="cursor-pointer hover:bg-gray-700 border-b border-gray-700">
                                        <td className="p-3">{c.name}</td>
                                        <td className={`p-3 font-bold ${calculateCustomerBalance(c) > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(calculateCustomerBalance(c))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {view === 'detail' && selectedCustomer && (
                <div>
                    <button onClick={() => setView('list')} className="mb-4 flex items-center gap-2 text-cyan-400 hover:text-cyan-300"><ArrowLeft size={18}/> العودة لقائمة العملاء</button>
                    <div className="flex justify-between items-center mb-4 bg-gray-700 p-3 rounded-lg">
                        <h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
                        <div className="text-lg">الرصيد: <span className={`font-bold ${customerBalance > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(customerBalance)}</span></div>
                    </div>
                    <form onSubmit={handleAddTransaction} className="flex flex-wrap items-end gap-3 mb-4 p-3 bg-gray-900/50 rounded-lg">
                        <div className="flex-grow"><label className="text-sm">البيان</label><input type="text" value={newTx.description} onChange={e => setNewTx(p => ({...p, description: e.target.value}))} placeholder="سداد / بضاعة جديدة" className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 mt-1"/></div>
                        <div className="flex-grow"><label className="text-sm">المبلغ</label><input type="number" step="any" value={newTx.amount} onChange={e => setNewTx(p => ({...p, amount: e.target.value}))} placeholder="موجب للدين, سالب للسداد" className="w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-cyan-500 focus:border-cyan-500 mt-1" required/></div>
                        <button type="submit" className="bg-cyan-600 h-[42px] hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-md">إضافة حركة</button>
                    </form>
                    <div className="max-h-[40vh] overflow-y-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-700/50 sticky top-0"><tr><th className="p-2">التاريخ</th><th className="p-2">البيان</th><th className="p-2">المبلغ</th></tr></thead>
                            <tbody>
                                {[...selectedCustomer.transactions].reverse().map(tx => (
                                    <tr key={tx.id} className="border-b border-gray-700">
                                        <td className="p-2 text-sm text-gray-400 whitespace-nowrap">{formatDate(tx.date)}</td>
                                        <td className="p-2">{tx.description}</td>
                                        <td className={`p-2 font-mono ${tx.amount > 0 ? 'text-red-400' : 'text-green-400'}`}>{formatCurrency(tx.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Modal>
    );
};


const ShippingPage = () => {
    const [dailyRecords, setDailyRecords] = usePersistentState<Record<string, DailyShippingRecord>>('shippingRecords', {});
    const [customers, setCustomers] = usePersistentState<Customer[]>('customers', []);
    const [modalState, setModalState] = useState<{type: 'cash' | 'receivables' | null, date: string | null}>({ type: null, date: null });
    
    const daysInYear = useMemo(() => getDaysInYear(), []);

    const handlePaymentChange = useCallback((date: string, field: keyof DailyShippingRecord['payments'], value: string) => {
        const numericValue = parseFloat(value) || 0;
        setDailyRecords(prev => {
            const currentRecord = prev[date] || { ...DEFAULT_SHIPPING_RECORD, date };
            const updatedPayments = { ...currentRecord.payments, [field]: numericValue };
            return { ...prev, [date]: { ...currentRecord, payments: updatedPayments } };
        });
    }, [setDailyRecords]);

    const handleSaveCashDetails = useCallback((date: string, cashDetails: CashDenomination[]) => {
        setDailyRecords(prev => {
            const currentRecord = prev[date] || { ...DEFAULT_SHIPPING_RECORD, date };
            return { ...prev, [date]: { ...currentRecord, cashDetails } };
        });
    }, [setDailyRecords]);
    
    const getRecordCalculations = (date: string) => {
        const record = dailyRecords[date] || { ...DEFAULT_SHIPPING_RECORD, date };
        const totalBalances = Object.values(record.payments).reduce((sum, val) => sum + val, 0);
        const cashTotal = record.cashDetails.reduce((sum, item) => sum + (item.value * item.count), 0);
        const grandTotal = totalBalances + cashTotal + record.receivables;
        return { totalBalances, cashTotal, grandTotal };
    };

    const todayString = toYyyyMmDd(new Date());

    return (
        <div className="p-4 md:p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-3"><Truck size={28} className="text-cyan-400"/> حساب الشحن</h2>
            <div className="overflow-auto bg-gray-800 rounded-xl shadow-lg max-h-[calc(100vh-250px)]">
                <table className="w-full text-right border-collapse">
                    <thead className="bg-gray-700 sticky top-0 z-10">
                        <tr>
                            <th className="p-2 font-semibold whitespace-nowrap">اليوم</th>
                            {PAYMENT_FIELDS.map(f => <th key={f} className="p-2 font-semibold whitespace-nowrap">{PAYMENT_LABELS[f]}</th>)}
                            <th className="p-2 font-semibold whitespace-nowrap bg-gray-700">إجمالي الأرصدة</th>
                            <th className="p-2 font-semibold whitespace-nowrap text-cyan-300">النقدية</th>
                            <th className="p-2 font-semibold whitespace-nowrap text-amber-300">المديونيات</th>
                            <th className="p-2 font-semibold whitespace-nowrap bg-gray-700">الإجمالي</th>
                            <th className="p-2 font-semibold whitespace-nowrap">الفرق</th>
                        </tr>
                    </thead>
                    <tbody>
                        {daysInYear.map((day, index) => {
                            const dateStr = toYyyyMmDd(day);
                            const record = dailyRecords[dateStr] || { ...DEFAULT_SHIPPING_RECORD, date: dateStr };
                            const { totalBalances, cashTotal, grandTotal } = getRecordCalculations(dateStr);
                            
                            const prevDate = new Date(day);
                            prevDate.setDate(prevDate.getDate() - 1);
                            const prevDateStr = toYyyyMmDd(prevDate);
                            const { grandTotal: prevGrandTotal } = getRecordCalculations(prevDateStr);
                            const difference = grandTotal - prevGrandTotal;

                            return (
                                <tr key={dateStr} className={`border-b border-gray-700 ${dateStr === todayString ? 'bg-cyan-900/50' : ''}`}>
                                    <td className="px-2 py-1 font-semibold whitespace-nowrap">{formatDateShort(day)}</td>
                                    {PAYMENT_FIELDS.map(field => (
                                        <td key={field} className="p-1">
                                            <input type="number" value={record.payments[field] || ''} onChange={e => handlePaymentChange(dateStr, field, e.target.value)} className="w-full bg-gray-900/50 rounded px-2 py-1 text-center focus:bg-gray-700"/>
                                        </td>
                                    ))}
                                    <td className="px-2 py-1 font-bold bg-gray-700 text-center whitespace-nowrap">{formatCurrency(totalBalances)}</td>
                                    <td onClick={() => setModalState({type: 'cash', date: dateStr})} className="px-2 py-1 font-bold text-cyan-300 cursor-pointer hover:bg-gray-700 text-center whitespace-nowrap">{formatCurrency(cashTotal)}</td>
                                    <td onClick={() => setModalState({type: 'receivables', date: dateStr})} className="px-2 py-1 font-bold text-amber-300 cursor-pointer hover:bg-gray-700 text-center whitespace-nowrap">{formatCurrency(record.receivables)}</td>
                                    <td className="px-2 py-1 font-bold bg-gray-700 text-center whitespace-nowrap">{formatCurrency(grandTotal)}</td>
                                    <td className={`px-2 py-1 font-bold text-center whitespace-nowrap ${difference > 0 ? 'text-green-400' : difference < 0 ? 'text-red-400' : ''}`}>{difference === 0 ? '-' : formatCurrency(difference)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {modalState.type === 'cash' && modalState.date && (
                <ShippingCashModal isOpen={true} onClose={() => setModalState({type:null, date:null})}
                    initialDetails={dailyRecords[modalState.date]?.cashDetails || []}
                    onSave={(details) => handleSaveCashDetails(modalState.date!, details)}
                />
            )}
            
             {modalState.type === 'receivables' && modalState.date && (
                <ReceivablesModal isOpen={true} onClose={() => setModalState({type:null, date:null})}
                    customers={customers} setCustomers={setCustomers}
                    setDailyRecords={setDailyRecords}
                    currentDate={modalState.date}
                />
            )}
        </div>
    );
};


// =================================================================================
// MAIN APP COMPONENT
// =================================================================================

const App = () => {
  return (
    <HashRouter>
        <div className="min-h-screen bg-gray-900 text-white">
            <Header />
            <nav className="bg-gray-800">
                <div className="container mx-auto flex items-center justify-center border-b border-gray-700">
                    <NavLink to="/"
                        className={({ isActive }) =>`py-3 px-6 text-lg font-semibold border-b-4 transition-colors duration-300 ${isActive ? 'text-cyan-400 border-cyan-400' : 'text-gray-400 border-transparent hover:text-white'}`}>
                        <div className="flex items-center gap-2"><DollarSign size={20}/> الخزينة الرئيسية</div>
                    </NavLink>
                    <NavLink to="/shipping"
                        className={({ isActive }) =>`py-3 px-6 text-lg font-semibold border-b-4 transition-colors duration-300 ${isActive ? 'text-cyan-400 border-cyan-400' : 'text-gray-400 border-transparent hover:text-white'}`}>
                        <div className="flex items-center gap-2"><Truck size={20}/> حساب الشحن</div>
                    </NavLink>
                </div>
            </nav>
            <main>
                <Routes>
                    <Route path="/" element={<TreasuryPage />} />
                    <Route path="/shipping" element={<ShippingPage />} />
                </Routes>
            </main>
        </div>
    </HashRouter>
  );
}

export default App;
