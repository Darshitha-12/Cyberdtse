
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { 
  Shield, 
  Lock, 
  Key, 
  Fingerprint, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  LogOut,
  ShieldCheck,
  AlertCircle,
  Info,
  X,
  RefreshCw,
  Copy,
  Check,
  LifeBuoy,
  RotateCcw,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { VaultService, VaultItem } from './services/VaultService';

enum AppState {
  LOADING = 'LOADING',
  SETUP = 'SETUP',
  LOCKED = 'LOCKED',
  RECOVERY_SUCCESS = 'RECOVERY_SUCCESS',
  UNLOCKED = 'UNLOCKED'
}

const SOCIAL_MEDIA_OPTIONS = [
  "Google", "Facebook", "Instagram", "X (Twitter)", "TikTok", 
  "LinkedIn", "Discord", "WhatsApp", "Telegram", "Snapchat", 
  "Reddit", "Pinterest", "Netflix", "Spotify", "Amazon", "Binance"
];

// Helper to allow UI to update before heavy crypto
const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 100));

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.LOADING);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  const handleLock = useCallback(() => {
    setItems([]);
    setAppState(AppState.LOCKED);
    setError(null);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && appState === AppState.UNLOCKED) {
        handleLock();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [appState, handleLock]);

  useEffect(() => {
    const checkState = async () => {
      const hasVault = await VaultService.hasExistingVault();
      setAppState(hasVault ? AppState.LOCKED : AppState.SETUP);
    };
    checkState();
  }, []);

  const handleSetup = async (pwd: string) => {
    setError(null);
    await yieldToUI();
    try {
      const rKey = await VaultService.initializeVault(pwd);
      setRecoveryKey(rKey);
      setItems([]);
      setAppState(AppState.UNLOCKED);
    } catch (e) { setError("Failed to initialize vault."); }
  };

  const handleUnlock = async (pwd: string) => {
    setError(null);
    await yieldToUI();
    try {
      const decryptedItems = await VaultService.unlockVault(pwd);
      setItems(decryptedItems);
      setAppState(AppState.UNLOCKED);
    } catch (e) { setError("Invalid master password."); }
  };

  const handleRecover = async (rKey: string) => {
    setError(null);
    await yieldToUI();
    try {
      const decryptedItems = await VaultService.recoverVault(rKey);
      setItems(decryptedItems);
      setAppState(AppState.RECOVERY_SUCCESS);
    } catch (e) { setError("Invalid recovery key."); }
  };

  const handlePasswordReset = async (newPwd: string) => {
    setError(null);
    await yieldToUI();
    try {
      await VaultService.resetMasterPassword(newPwd);
      setAppState(AppState.UNLOCKED);
    } catch (e) { 
      setError("Failed to update master password. Hardware key error."); 
      throw e;
    }
  };

  const handleAdd = async (title: string, user: string, pass: string) => {
    const newItem: VaultItem = { id: crypto.randomUUID(), title, username: user, password: pass };
    const updated = [...items, newItem];
    setItems(updated);
    await VaultService.saveVault(updated);
  };

  const handleDelete = async (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    await VaultService.saveVault(updated);
  };

  const toggleVisibility = useCallback((id: string) => {
    setShowPassword(p => ({...p, [id]: !p[id]}));
  }, []);

  if (appState === AppState.LOADING) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center p-4 md:p-8 lg:p-16 overflow-x-hidden antialiased">
      <div className="flex items-center gap-3 mb-8 transition-opacity duration-500">
        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
          <Shield className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-black text-2xl tracking-tight text-white italic leading-none">CYBER DT VAULT</h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Zero-Knowledge Secure</p>
        </div>
      </div>

      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-[2rem] shadow-2xl flex flex-col relative overflow-hidden min-h-[550px] transition-all duration-300">
        <div className="flex-1 flex flex-col p-5 md:p-10">
          {appState === AppState.SETUP && <SetupScreen onComplete={handleSetup} />}
          {/* Fix: Pass onClearError to LoginScreen */}
          {appState === AppState.LOCKED && <LoginScreen onUnlock={handleUnlock} onRecover={handleRecover} error={error} onClearError={() => setError(null)} />}
          {appState === AppState.RECOVERY_SUCCESS && <ResetPasswordScreen onComplete={handlePasswordReset} error={error} />}
          {appState === AppState.UNLOCKED && (
            <VaultScreen 
              items={items} onAdd={handleAdd} onDelete={handleDelete} onLock={handleLock}
              toggleVisibility={toggleVisibility}
              showPassword={showPassword} recoveryKey={recoveryKey} onCloseRecovery={() => setRecoveryKey(null)}
            />
          )}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-slate-500 text-[10px] font-bold uppercase tracking-widest text-center opacity-40 hover:opacity-100 transition-opacity">
        <span className="flex items-center gap-2 text-emerald-500"><ShieldCheck size={12} /> Hardware-Isolated VMK</span>
        <span className="w-1 h-1 bg-slate-800 rounded-full" />
        <span className="flex items-center gap-2"><Lock size={12} /> Auto-Lock Session</span>
      </div>
    </div>
  );
};

// Memoized individual item for maximum list performance
const VaultItemCard = memo(({ item, isVisible, toggle, onDelete }: { 
  item: VaultItem, 
  isVisible: boolean, 
  toggle: () => void, 
  onDelete: () => void 
}) => {
  return (
    <div className="bg-slate-800/20 border border-slate-800/50 p-6 rounded-3xl hover:border-emerald-500/30 group relative transition-all duration-300 transform hover:-translate-y-1">
      <button onClick={onDelete} className="absolute top-4 right-4 p-2 text-slate-600 hover:text-red-400 bg-slate-900/50 rounded-xl border border-slate-800/50 transition-colors">
        <Trash2 size={16} />
      </button>
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center shrink-0 border border-slate-800"><Key size={24} className="text-emerald-500" /></div>
        <div className="min-w-0 pr-8">
          <h3 className="font-bold text-lg text-slate-100 truncate">{item.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{item.username || "Vault Entry"}</p>
        </div>
      </div>
      <div className="bg-slate-950/80 rounded-2xl px-5 py-4 border border-slate-800/30 flex justify-between items-center group-hover:bg-slate-950 transition-colors">
        <span className="text-base mono text-slate-300 tracking-[0.25em] font-bold truncate pr-2">
          {isVisible ? item.password : '••••••••'}
        </span>
        <button onClick={toggle} className="text-slate-500 hover:text-emerald-400 p-2 bg-slate-900/50 rounded-xl transition-colors shrink-0">
          {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
});

const SetupScreen: React.FC<{ onComplete: (pwd: string) => Promise<void> }> = ({ onComplete }) => {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  
  const strength = useMemo(() => {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 12) s += 25;
    if (/[A-Z]/.test(pwd)) s += 25;
    if (/[0-9]/.test(pwd)) s += 25;
    if (/[^A-Za-z0-9]/.test(pwd)) s += 25;
    return s;
  }, [pwd]);

  const isValid = strength >= 75 && pwd === confirm;

  const handleSubmit = async () => {
    setLoading(true);
    await onComplete(pwd);
    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center">
        <div className="bg-emerald-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
          <Shield className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">Vault Setup</h2>
        <p className="text-slate-500 mt-2">Create a master password to encrypt your hardware vault.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <InputGroup label="Master Password" val={pwd} set={setPwd} type="password" placeholder="Min 12 characters" />
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div className={`h-full transition-all duration-700 ${strength < 50 ? 'bg-red-500' : strength < 100 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${strength}%` }} />
          </div>
          <InputGroup label="Confirm Password" val={confirm} set={setConfirm} type="password" placeholder="Repeat password" />
        </div>
        <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-3xl flex flex-col gap-3 justify-center">
          <div className="flex items-center gap-2 text-blue-400">
            <Info className="w-5 h-5" />
            <h4 className="font-black text-xs uppercase tracking-widest">Security Note</h4>
          </div>
          <p className="text-xs text-blue-200/60 leading-relaxed italic">
            This password derives your unique encryption key. It cannot be reset. Lose this, and you lose your data.
          </p>
        </div>
      </div>
      <button 
        disabled={!isValid || loading} 
        onClick={handleSubmit} 
        className="w-full bg-emerald-600 disabled:opacity-20 hover:bg-emerald-500 text-white font-black text-lg py-5 rounded-3xl transition-all shadow-xl shadow-emerald-500/20 active:scale-[0.99] flex items-center justify-center gap-3"
      >
        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Create Hardware Vault'}
      </button>
    </div>
  );
};

const ResetPasswordScreen: React.FC<{ onComplete: (pwd: string) => Promise<void>, error: string | null }> = ({ onComplete, error }) => {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (pwd !== confirm) return;
    setLoading(true);
    try { await onComplete(pwd); } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto w-full animate-in slide-in-from-bottom-8 duration-700 text-center py-6">
      <div className="bg-emerald-500/10 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
        <RotateCcw className="w-10 h-10 text-emerald-400" />
      </div>
      <h2 className="text-3xl font-black text-white tracking-tight">Set New Password</h2>
      <p className="text-slate-500">Recovery key accepted. Secure your vault with a new master key.</p>
      <div className="space-y-4 text-left">
        <InputGroup label="New Master Password" val={pwd} set={setPwd} type="password" placeholder="New master key" />
        <InputGroup label="Confirm Password" val={confirm} set={setConfirm} type="password" placeholder="Repeat key" />
        {error && <p className="text-center text-red-400 text-xs font-black uppercase tracking-widest pt-2 animate-pulse">{error}</p>}
        <button 
          disabled={!pwd || pwd !== confirm || loading} 
          onClick={handleSubmit} 
          className="w-full bg-emerald-600 disabled:opacity-20 text-white font-black py-5 rounded-3xl mt-4 flex items-center justify-center gap-3 transition-all"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Update & Unlock'}
        </button>
      </div>
    </div>
  );
};

// Fix: Added onClearError to LoginScreen props to fix setError reference error
const LoginScreen: React.FC<{ onUnlock: (pwd: string) => void; onRecover: (key: string) => void; error: string | null; onClearError: () => void }> = ({ onUnlock, onRecover, error, onClearError }) => {
  const [pwd, setPwd] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUnlockClick = async () => {
    setLoading(true);
    onUnlock(pwd);
  };

  const handleRecoverClick = async () => {
    setLoading(true);
    onRecover(pwd);
  };

  if (isRecovering) {
    return (
      <div className="flex flex-col gap-8 max-w-lg mx-auto w-full animate-in fade-in duration-500 h-full justify-center py-6 text-center">
        <div className="bg-blue-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20"><LifeBuoy className="w-10 h-10 text-blue-400" /></div>
        <h2 className="text-3xl font-black text-white tracking-tight">Recovery</h2>
        <p className="text-slate-500">Enter your 48-character emergency key.</p>
        <div className="space-y-4 text-left">
          <InputGroup label="Recovery Key" val={pwd} set={setPwd} placeholder="HEX KEY" />
          {error && <p className="text-center text-red-400 text-xs font-black uppercase">{error}</p>}
          <div className="flex gap-4">
            {/* Fix: Call onClearError when canceling recovery */}
            <button disabled={loading} onClick={() => { setIsRecovering(false); setPwd(''); onClearError(); }} className="flex-1 py-4 text-slate-500 font-bold hover:text-slate-300 transition-colors">Cancel</button>
            <button disabled={!pwd || loading} onClick={handleRecoverClick} className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3">
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Restore Access'}
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-10 max-w-lg mx-auto w-full animate-in fade-in duration-500 h-full justify-center py-6 text-center">
      <div className="bg-slate-950 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-800"><Lock className="w-10 h-10 text-emerald-400" /></div>
      <h2 className="text-4xl font-black text-white tracking-tight text-emerald-500 leading-tight">CYBER DT VAULT</h2>
      <p className="text-slate-500">Encrypted with hardware-backed master key.</p>
      <div className="space-y-6 text-left">
        <div className="relative group">
          <input type="password" autoFocus className={`w-full bg-slate-950 border-2 ${error ? 'border-red-500/50' : 'border-slate-800'} rounded-3xl px-8 py-6 text-center text-3xl tracking-[0.3em] outline-none focus:border-emerald-500/50 transition-all font-bold placeholder:tracking-normal placeholder:text-slate-800 shadow-inner`} placeholder="MASTER KEY" value={pwd} onChange={(e) => setPwd(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlockClick()} />
          {error && <p className="text-center text-red-400 text-xs mt-4 font-black uppercase animate-pulse">{error}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button disabled={loading} onClick={handleUnlockClick} className="bg-white hover:bg-slate-200 text-slate-950 font-black text-lg py-5 rounded-3xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg">
            {loading ? <Loader2 className="animate-spin text-emerald-600" /> : 'Unlock Vault'} 
          </button>
          <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-lg py-5 rounded-3xl transition-all flex items-center justify-center gap-3 border border-slate-700">
            <Fingerprint className="w-6 h-6 text-emerald-500" /> Biometric
          </button>
        </div>
        {/* Fix: Replaced setError(null) with onClearError() call */}
        <button onClick={() => { setIsRecovering(true); setPwd(''); onClearError(); }} className="w-full text-slate-600 hover:text-slate-400 transition-colors text-xs font-black uppercase tracking-widest pt-4">Forgot Password? Recovery Key</button>
      </div>
    </div>
  );
};

const VaultScreen: React.FC<{ items: VaultItem[]; onAdd: (t: string, u: string, p: string) => void; onDelete: (id: string) => void; onLock: () => void; toggleVisibility: (id: string) => void; showPassword: Record<string, boolean>; recoveryKey: string | null; onCloseRecovery: () => void; }> = ({ items, onAdd, onDelete, onLock, toggleVisibility, showPassword, recoveryKey, onCloseRecovery }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  // Smooth item list rendering
  const renderedItems = useMemo(() => items.map(item => (
    <VaultItemCard 
      key={item.id} 
      item={item} 
      isVisible={!!showPassword[item.id]} 
      toggle={() => toggleVisibility(item.id)} 
      onDelete={() => onDelete(item.id)}
    />
  )), [items, showPassword, toggleVisibility, onDelete]);

  if (recoveryKey) {
    return (
      <div className="flex flex-col gap-8 max-w-2xl mx-auto w-full animate-in slide-in-from-bottom-8 duration-700 text-center">
        <div className="bg-amber-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20"><LifeBuoy className="w-10 h-10 text-amber-400" /></div>
        <h2 className="text-2xl font-black text-white uppercase">Emergency Key Created</h2>
        <p className="text-slate-400 text-sm">Save this key <span className="text-amber-400 font-bold">OFFLINE</span>. Without it, your data cannot be recovered if you forget your password.</p>
        <div className="bg-slate-950 border-2 border-slate-800 p-6 rounded-3xl relative break-all mono text-emerald-400 font-bold text-sm tracking-widest transition-all">
          {recoveryKey}
          <button onClick={() => { navigator.clipboard.writeText(recoveryKey); setCopiedRecovery(true); setTimeout(() => setCopiedRecovery(false), 2000); }} className="absolute top-2 right-2 p-2 text-slate-600 hover:text-white transition-colors">
            {copiedRecovery ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        <button onClick={onCloseRecovery} className="bg-emerald-600 text-white font-black py-4 rounded-3xl hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 transition-all">I HAVE SECURED THIS KEY</button>
      </div>
    );
  }

  if (isAdding) {
    return (
      <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full animate-in slide-in-from-right-8 duration-400">
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <h2 className="text-2xl font-black text-white">New Vault Entry</h2>
          <button onClick={() => setIsAdding(false)} className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
        </div>
        <div className="space-y-6">
          <div className="space-y-3 relative">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-2">Provider</label>
            <div className="relative group">
              <input 
                type="text" 
                list="social-media-list"
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500/50 transition-all text-slate-100 placeholder:text-slate-800 text-lg font-bold shadow-inner" 
                placeholder="Select service..." 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)} 
              />
              <datalist id="social-media-list">
                {SOCIAL_MEDIA_OPTIONS.map(opt => <option key={opt} value={opt} />)}
              </datalist>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup label="Username" val={newUser} set={setNewUser} placeholder="your@email.com" />
            <div className="relative">
              <InputGroup label="Secure Password" val={newPass} set={setNewPass} type="password" placeholder="••••••••" />
              <button onClick={() => setNewPass(VaultService.generateSecurePassword())} className="absolute right-2 bottom-2 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-emerald-500 border border-slate-700 transition-all active:scale-95" title="Generate Secure"><RefreshCw size={16} /></button>
            </div>
          </div>
        </div>
        <button disabled={!newTitle || !newPass} onClick={() => { onAdd(newTitle, newUser, newPass); setIsAdding(false); setNewTitle(''); setNewUser(''); setNewPass(''); }} className="bg-emerald-600 py-5 rounded-3xl font-black text-lg text-white shadow-xl shadow-emerald-500/20 mt-4 transition-all hover:bg-emerald-500 active:scale-[0.99]">Save to Hardware Vault</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-950/40 p-5 rounded-[2rem] border border-slate-800/50 gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">ENCRYPTED STORAGE</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[9px] text-emerald-500 font-black uppercase tracking-[0.2em]">Hardware Root-of-Trust Active</p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={() => setIsAdding(true)} className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-emerald-600/10 transition-all hover:bg-emerald-500"><Plus size={18} /> New</button>
          <button onClick={onLock} className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-400 border border-slate-700 transition-colors"><LogOut size={20} /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6 overflow-y-auto max-h-[calc(100vh-400px)] custom-scrollbar">
        {items.length === 0 ? (
          <div className="col-span-full h-72 border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center justify-center opacity-40">
            <Shield size={40} className="text-slate-600 mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No records found</p>
          </div>
        ) : renderedItems}
      </div>
    </div>
  );
};

const InputGroup: React.FC<{ label: string; val: string; set: (v: string) => void; placeholder: string; type?: string }> = ({ label, val, set, placeholder, type = 'text' }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] px-2">{label}</label>
    <input 
      type={type} 
      className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl px-5 py-3.5 outline-none focus:border-emerald-500/50 transition-all text-slate-100 placeholder:text-slate-800 text-base font-bold shadow-inner" 
      placeholder={placeholder} 
      value={val} 
      onChange={(e) => set(e.target.value)} 
    />
  </div>
);

export default App;
