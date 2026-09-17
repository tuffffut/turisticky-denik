import React, { useState, useEffect } from 'react';
import { HikingRoute } from '../types';
import {
  X,
  Key,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  Download,
  Upload,
  Shield,
  Github,
  Lock,
  Smartphone,
  CheckCircle,
  Send,
  Cloud,
} from 'lucide-react';

interface ApiAndBackupModalProps {
  onClose: () => void;
  routes: HikingRoute[];
  onImportSuccess: () => void;
}

export const ApiAndBackupModal: React.FC<ApiAndBackupModalProps> = ({
  onClose,
  routes,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'security' | 'telegram' | 'api' | 'firebase' | 'backup'>('security');
  const [apiToken, setApiToken] = useState<string>('hd_load...');
  const [isPinLockEnabled, setIsPinLockEnabled] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinStatusMsg, setPinStatusMsg] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedAppsScript, setCopiedAppsScript] = useState(false);
  const [copiedDirectLink, setCopiedDirectLink] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Fetch token and PIN config
  const fetchConfig = () => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.apiToken) setApiToken(data.apiToken);
        setIsPinLockEnabled(!!data.isPinLockEnabled);
      })
      .catch((err) => console.error('Failed to load token:', err));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinStatusMsg(null);
    if (!pinInput || pinInput.length < 4) {
      setPinStatusMsg('Chyba: PIN musí mít alespoň 4 znaky');
      return;
    }
    try {
      const res = await fetch('/api/config/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', newPin: pinInput }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('hd_user_pin', pinInput);
        sessionStorage.setItem('hd_unlocked', 'true');
        setIsPinLockEnabled(true);
        setPinStatusMsg('✅ PIN byl úspěšně aktivován!');
        setPinInput('');
      } else {
        setPinStatusMsg(data.error || 'Chyba při ukládání PINu');
      }
    } catch (err) {
      setPinStatusMsg('Chyba komunikace se serverem');
    }
  };

  const handleDisablePin = async () => {
    const entered = prompt('Pro vypnutí ochrany zadejte aktuální PIN:');
    if (!entered) return;
    try {
      const res = await fetch('/api/config/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable', pin: entered }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('hd_user_pin');
        setIsPinLockEnabled(false);
        setPinStatusMsg('Ochrana PINem byla deaktivována');
      } else {
        alert(data.error || 'Nesprávný PIN');
      }
    } catch (err) {
      alert('Chyba komunikace se serverem');
    }
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Opravdu chcete vygenerovat nový API token? Původní token přestane fungovat.')) return;
    try {
      const res = await fetch('/api/config/token', { method: 'POST' });
      const data = await res.json();
      if (data.apiToken) setApiToken(data.apiToken);
    } catch (err) {
      console.error('Failed to regen token:', err);
    }
  };

  const handleCopy = (text: string, setCopiedState: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const handleExportBackup = () => {
    window.location.href = '/api/backup/export';
  };

  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const routesToImport = json.routes || (Array.isArray(json) ? json : null);
        if (!routesToImport) {
          setImportStatus('Chyba: Soubor neobsahuje platný seznam tras.');
          return;
        }

        const res = await fetch('/api/backup/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ routes: routesToImport }),
        });
        const data = await res.json();
        if (data.success) {
          setImportStatus(`Úspěšně obnoveno! Naimportováno ${routesToImport.length} tras.`);
          onImportSuccess();
        } else {
          setImportStatus(data.error || 'Chyba při importu.');
        }
      } catch (err) {
        setImportStatus('Chyba při čtení JSON souboru.');
      }
    };
    reader.readAsText(file);
  };

  const exampleCurlAddRoute = `curl -X POST "${window.location.origin}/api/routes" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiToken}" \\
  -d '{
    "title": "Výstup na Sněžku z Pece",
    "description": "Nádherná ranní hřebenovka s výhledy.",
    "date": "2024-07-14",
    "region": "Královéhradecký kraj",
    "mountainRange": "Krkonoše",
    "distanceKm": 18.2,
    "elevationGainM": 985,
    "highestPointM": 1603,
    "durationMinutes": 345,
    "rating": 5,
    "difficulty": "hard",
    "wantToVisitAgain": "yes",
    "highlights": ["Vrchol Sněžky 1603 m", "Obří důl"],
    "companions": ["Martin", "Lenka"]
  }'`;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/50">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-emerald-400" />
            <h2 className="font-display font-bold text-xl text-white">
              API, GitHub & Soukromí deníku
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-800 bg-stone-950/30 px-4 sm:px-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Zabezpečení & PIN</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('telegram')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'telegram'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Telegram & AppsScript
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'api'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            REST API & Zkratky
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('firebase')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'firebase'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Google Firebase Cloud
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-3 sm:px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'backup'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Zálohy & Export
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* TAB: SECURITY & PIN */}
          {activeTab === 'security' && (
            <div className="space-y-5 text-xs text-stone-300 leading-relaxed">
              <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-stone-100 text-sm">
                    Soukromí & Ochrana PINem (Způsob 1)
                  </h4>
                  <p className="text-stone-400">
                    Deník je přístupný pouze vám. Na novém zařízení zadáte váš 4–6místný PIN. 
                    Zařízení si odemčení bezpečně pamatuje. Kdokoliv cizí uvidí pouze zamykací obrazovku.
                  </p>
                </div>
              </div>

              {/* Status and Configuration */}
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-850">
                  <div>
                    <span className="font-semibold text-stone-200">Stav ochrany PINem:</span>
                    <p className="text-stone-400 text-[11px]">
                      {isPinLockEnabled ? 'Aktivní — deník je zamčený pro nepovolané osoby' : 'Vypnuto — deník se otevírá bez výzvy k PINu'}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      isPinLockEnabled
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : 'bg-stone-800 text-stone-400'
                    }`}
                  >
                    {isPinLockEnabled ? '🔒 Zabezpečeno' : '🔓 Nechráněno'}
                  </span>
                </div>

                {/* Form to set / change PIN */}
                <form onSubmit={handleSetPin} className="space-y-3">
                  <label className="block text-stone-300 font-semibold text-xs">
                    {isPinLockEnabled ? 'Změnit bezpečnostní PIN:' : 'Nastavit nový bezpečnostní PIN:'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      maxLength={8}
                      inputMode="numeric"
                      placeholder="Zadejte 4–8místný PIN..."
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all cursor-pointer shadow"
                    >
                      {isPinLockEnabled ? 'Uložit nový PIN' : 'Aktivovat PIN'}
                    </button>
                    {isPinLockEnabled && (
                      <button
                        type="button"
                        onClick={handleDisablePin}
                        className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl transition-colors cursor-pointer text-xs"
                      >
                        Vypnout ochranu
                      </button>
                    )}
                  </div>
                  {pinStatusMsg && (
                    <p className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/50">
                      {pinStatusMsg}
                    </p>
                  )}
                </form>
              </div>

              {/* Direct Access Link for Telegram */}
              <div className="bg-stone-950/70 p-4 rounded-xl border border-stone-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-200 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    Přímý odkaz z Telegramu (automatické odemčení bez zadávání PINu):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const directUrl = `${window.location.origin}/?key=${apiToken}`;
                      handleCopy(directUrl, setCopiedDirectLink);
                    }}
                    className="text-xs text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedDirectLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDirectLink ? 'Zkopírováno' : 'Kopírovat odkaz'}</span>
                  </button>
                </div>
                <p className="text-stone-400 text-[11px]">
                  Když v Telegram notifikaci použijete tento odkaz s vaším tokenem, po kliknutí na mobilu se deník automaticky sám odemkne a vy se nemusíte zdržovat žádným zadáváním PINu!
                </p>
                <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 font-mono text-[11px] text-emerald-400 truncate select-all">
                  {`${window.location.origin}/?key=${apiToken}`}
                </div>
              </div>
            </div>
          )}

          {/* TAB: TELEGRAM & APP SCRIPT */}
          {activeTab === 'telegram' && (
            <div className="space-y-4 text-xs text-stone-300 leading-relaxed">
              <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/30 flex items-start gap-3">
                <Send className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-emerald-300 text-sm mb-1">
                    Automatické propojení: Garmin ➔ GitHub ➔ Telegram ➔ Horský deník
                  </h4>
                  <p className="text-stone-300">
                    Váš stávající Python skript stáhne aktivitu z Garminu. Zde je hotový kód do Google Apps Scriptu nebo Pythonu, který vám na Telegram pošle zprávu s přímým odkazem do deníku s předvyplněným GPX a AI asistentem!
                  </p>
                </div>
              </div>

              {/* Ready-to-paste Google Apps Script snippet */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-200 text-xs flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Kód do Google Apps Scriptu (poslání notifikace do Telegramu):
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `function sendTelegramNotification(activity) {
  const BOT_TOKEN = "VAS_TELEGRAM_BOT_TOKEN";
  const CHAT_ID = "VASE_CHAT_ID";
  const APP_URL = "${window.location.origin}";

  const text = "🌲 *Nová aktivita z Garminu: " + activity.title + "*\\n" +
               "📏 Vzdálenost: " + activity.distanceKm + " km\\n" +
               "⛰️ Nastoupáno: +" + activity.elevationGainM + " m\\n\\n" +
               "Chcete tuto túru uložit do Horského deníku?\\n" +
               "👉 [Otevřít a doplnit zápis s AI](" + APP_URL + ")";

  const payload = {
    chat_id: CHAT_ID,
    text: text,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "📝 Otevřít a doplnit s AI", url: APP_URL }
      ]]
    }
  };

  UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });
}`,
                        setCopiedAppsScript
                      )
                    }
                    className="text-xs text-stone-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedAppsScript ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedAppsScript ? 'Zkopírováno' : 'Kopírovat Apps Script'}</span>
                  </button>
                </div>

                <pre className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 text-[11px] font-mono text-stone-300 overflow-x-auto leading-relaxed">
{`function sendTelegramNotification(activity) {
  const BOT_TOKEN = "VAS_TELEGRAM_BOT_TOKEN";
  const CHAT_ID = "VASE_CHAT_ID";
  const APP_URL = "${window.location.origin}";

  const text = "🌲 *Nová aktivita z Garminu: " + activity.title + "*\\n" +
               "📏 Vzdálenost: " + activity.distanceKm + " km\\n" +
               "⛰️ Nastoupáno: +" + activity.elevationGainM + " m\\n\\n" +
               "Chcete tuto túru uložit do Horského deníku?\\n" +
               "👉 [Otevřít a doplnit zápis s AI](" + APP_URL + ")";

  const payload = {
    chat_id: CHAT_ID,
    text: text,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "📝 Otevřít a doplnit s AI", url: APP_URL }
      ]]
    }
  };

  UrlFetchApp.fetch("https://api.telegram.org/bot" + BOT_TOKEN + "/sendMessage", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });
}`}
                </pre>
              </div>

              <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 space-y-2">
                <h5 className="font-semibold text-stone-100 text-xs">Jak funguje AI Asistent ve formuláři:</h5>
                <p className="text-stone-400">
                  Když v aplikaci otevřete <strong>Přidat trasu</strong>, stačí kliknout na tlačítko <strong>„Napsat zápis pomocí AI“</strong>. Do pole jen v heslech napíšete vaše myšlenky (např.: <em>„ráno mlha, na hřebeni slunko, borůvkový knedlík, bolavá kolena, viděli jsme kamzíka“</em>) a AI vytvoří krásný, čtivý a autentický příběh bez klišé!
                </p>
              </div>
            </div>
          )}

          {/* TAB: FIREBASE CLOUD */}
          {activeTab === 'firebase' && (
            <div className="space-y-4 text-xs text-stone-300 leading-relaxed">
              <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 flex items-start gap-3">
                <Cloud className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-stone-100 text-sm">
                    Google Firebase Firestore & Cloud Databáze
                  </h4>
                  <p className="text-stone-400">
                    Pro váš projekt byla úspěšně vytvořena cloudová databáze v projektu Google Firebase s bezplatným limitem <strong>Google Spark</strong> (5 GB na fotky, 1 GB pro databázi Firestore, 50 000 čtení denně zdarma).
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-stone-950/40 rounded-xl border border-stone-800">
                  <h5 className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Nezávislost na vašem Google Disku</span>
                  </h5>
                  <p className="text-stone-400">
                    Úložiště Firebase Spark běží na Google Cloudu a je zcela oddělené od vašeho osobního 15GB Google Disku. Z vašeho disku neubírá ani bajt.
                  </p>
                </div>

                <div className="p-3.5 bg-stone-950/40 rounded-xl border border-stone-800">
                  <h5 className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Dvojí zálohování (Cloud + Lokální JSON)</span>
                  </h5>
                  <p className="text-stone-400">
                    Všechny vaše trasy jsou uloženy jak v online databázi, tak v lokálním souboru <code className="text-stone-200">hiking-routes-storage.json</code>. O své vzpomínky z hor tak nikdy nepřijdete ani offline.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: REST API */}
          {activeTab === 'api' && (
            <div className="space-y-5">
              <div>
                <h4 className="font-semibold text-stone-100 text-sm mb-1">
                  Váš osobní API Token
                </h4>
                <p className="text-xs text-stone-400 mb-2">
                  Tento klíč přiložte do HTTP hlavičky <code className="text-emerald-400">Authorization: Bearer YOUR_TOKEN</code> nebo <code className="text-emerald-400">x-api-key: YOUR_TOKEN</code>.
                </p>

                <div className="flex items-center gap-2 bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                  <code className="text-xs font-mono text-emerald-300 flex-1 truncate select-all">
                    {apiToken}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy(apiToken, setCopiedToken)}
                    className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedToken ? 'Zkopírováno' : 'Kopírovat'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerateToken}
                    className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded-lg text-xs cursor-pointer"
                    title="Vygenerovat nový token"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* cURL Example */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-semibold text-stone-100 text-sm flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>Příklad: Přidání trasy přes cURL / Python / Zkratky</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleCopy(exampleCurlAddRoute, setCopiedCurl)}
                    className="text-xs text-stone-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedCurl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Kopírovat cURL</span>
                  </button>
                </div>

                <pre className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 text-[11px] font-mono text-stone-300 overflow-x-auto leading-relaxed">
                  {exampleCurlAddRoute}
                </pre>
              </div>

              {/* Mobile shortcuts advice */}
              <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-stone-300 space-y-1">
                  <p className="font-semibold text-stone-100">
                    Tip: Mobilní automatizace (Apple Zkratky / Android Tasker)
                  </p>
                  <p className="text-stone-400">
                    V aplikaci <em>Apple Zkratky (Shortcuts)</em> nebo <em>Tasker</em> můžete vytvořit akci &quot;Načíst obsah z URL&quot; s metodou POST a hlavičkou <code className="text-emerald-400">Authorization: Bearer {apiToken}</code>. Jakmile dokončíte túru, můžete jedním kliknutím na domovské obrazovce odeslat záznam do svého deníku!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GITHUB & PRIVACY */}
          {activeTab === 'github' && (
            <div className="space-y-4 text-xs text-stone-300 leading-relaxed">
              <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800 flex items-start gap-3">
                <Github className="w-6 h-6 text-stone-100 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-stone-100 text-sm">
                    Doporučená architektura pro GitHub & Soukromé nasazení
                  </h4>
                  <p>
                    Váš požadavek: <em>&quot;Stránky budou uložené na githubu. Ideálně nějak soukromě, sice tam nebudou citlivé údaje, ale nemusí se tam dostat každý.&quot;</em>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-stone-950/40 rounded-xl border border-stone-800">
                  <h5 className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>1. Privátní GitHub repozitář (Private Repository)</span>
                  </h5>
                  <p className="text-stone-400">
                    Vytvořte si na GitHubu repozitář s nastavením <strong>Private</strong>. Kód i vaše trasy budou bezpečně uloženy pod vaším účtem a nikdo cizí je neuvidí.
                  </p>
                </div>

                <div className="p-3.5 bg-stone-950/40 rounded-xl border border-stone-800">
                  <h5 className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>2. Soukromý hosting bez veřejného přístupu</span>
                  </h5>
                  <p className="text-stone-400">
                    Aplikaci můžete provozovat:
                  </p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-stone-400">
                    <li><strong>Lokálně na počítači</strong> (spuštění jedním příkazem <code className="text-stone-200">npm run dev</code>).</li>
                    <li><strong>Na domácím serveru / NAS</strong> přes Docker kontejner.</li>
                    <li><strong>V cloudu (Google Cloud Run / Railway)</strong> chráněné vaším osobním API tokenem nebo heslem.</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-stone-950/40 rounded-xl border border-stone-800">
                  <h5 className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>3. Automatické verzování v Gitu</span>
                  </h5>
                  <p className="text-stone-400">
                    Všechny vaše trasy jsou uloženy v přehledném JSON formátu (<code className="text-stone-200">hiking-routes-storage.json</code>). Při každém novém výletu můžete soubor commitnout do gitu: <code className="text-stone-200">git commit -m &quot;Pridana trasa na Snezku&quot;</code> a mít tak celoživotní historii svých výprav zálohovanou v bezpečí.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP & EXPORT */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="bg-stone-950/50 p-4 rounded-xl border border-stone-800 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-stone-100 text-sm">
                    Stáhnout kompletní zálohu deníku
                  </h4>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Vyexportuje všech {routes.length} tras včetně GPX souřadnic a odkazů na fotky do jednoho JSON souboru.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Stáhnout JSON</span>
                </button>
              </div>

              <div className="bg-stone-950/50 p-4 rounded-xl border border-stone-800 flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-stone-100 text-sm">
                    Obnovit / Importovat zálohu ze souboru
                  </h4>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Načtěte předchozí JSON zálohu deníku. Nové trasy budou sloučeny bez duplicit.
                  </p>
                </div>
                <label className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer border border-stone-700">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Nahrát zálohu</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleImportBackupFile}
                  />
                </label>
              </div>

              {importStatus && (
                <div className="p-3 bg-stone-950 border border-emerald-500/50 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>{importStatus}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
