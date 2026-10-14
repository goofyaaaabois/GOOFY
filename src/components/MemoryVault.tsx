import React, { useState, useEffect } from 'react';
import {
  Database,
  Search,
  Plus,
  Trash2,
  Pin,
  Bookmark,
  ShieldAlert,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { MemoryRecord } from '../types/batman.ts';

const DEFAULT_MEMORIES: MemoryRecord[] = [
  {
    id: 'mem-1',
    title: 'Arkham Perimeter Protocol',
    category: 'GOTHAM_INTEL',
    content: 'Sensors 04 through 09 detect high electromagnetic resonance around Arkham Island. Surveillance drones deployed on 30m patrol intervals.',
    createdAt: '2026-10-13 22:00',
    pinned: true,
  },
  {
    id: 'mem-2',
    title: 'Resilient Gemini Backoff Strategy',
    category: 'CODE',
    content: 'In case of HTTP 503 or 429: max 3 retries, exponential backoff (base 1s, max 8s) + full random jitter. Secondary fallback to gemini-3.1-flash-lite, tertiary to BAT-PROTO-7 local.',
    createdAt: '2026-10-13 22:15',
    pinned: true,
  },
  {
    id: 'mem-3',
    title: 'Master Wayne Assistant Preferences',
    category: 'PREFERENCE',
    content: 'Preferred title: Batman. Supports English, Tamil, and Tanglish. Spoken responses concise with dry wit. Automatic tactical confirmations enabled.',
    createdAt: '2026-10-13 22:30',
    pinned: false,
  },
];

export const MemoryVault: React.FC = () => {
  const [memories, setMemories] = useState<MemoryRecord[]>(() => {
    try {
      const stored = localStorage.getItem('bat_memory_vault');
      return stored ? JSON.parse(stored) : DEFAULT_MEMORIES;
    } catch {
      return DEFAULT_MEMORIES;
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryRecord['category']>('TACTICAL');
  const [newContent, setNewContent] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bat_memory_vault', JSON.stringify(memories));
    } catch (err) {
      console.warn('Failed to persist memories', err);
    }
  }, [memories]);

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newRecord: MemoryRecord = {
      id: `mem-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      content: newContent.trim(),
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      pinned: false,
    };

    setMemories([newRecord, ...memories]);
    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    setMemories(memories.filter((m) => m.id !== id));
  };

  const handleTogglePin = (id: string) => {
    setMemories(
      memories.map((m) => (m.id === id ? { ...m, pinned: !m.pinned } : m))
    );
  };

  const handleClearAll = () => {
    setMemories([]);
    setShowClearConfirm(false);
  };

  const handleExport = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(memories, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'bat_memory_vault_intel.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filtered = memories.filter((m) => {
    const matchesCategory = selectedCategory === 'ALL' || m.category === selectedCategory;
    const matchesSearch =
      m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-neutral-950/70 border border-neutral-800 rounded-lg p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-400" />
          <h3 className="font-hud text-xs tracking-wider font-bold text-amber-400 uppercase">
            Batcomputer Memory Vault
          </h3>
          <span className="text-[10px] font-mono-code text-neutral-400">
            ({memories.length} STORED)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-hud font-bold transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD RECORD</span>
          </button>

          <button
            onClick={handleExport}
            className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors"
            title="Export Intelligence Vault"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {memories.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
              title="Wipe Memory Vault"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="flex items-center gap-2 flex-wrap text-xs font-mono-code">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tactical memories, code, intel..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded pl-8 pr-3 py-1.5 text-neutral-200 placeholder-neutral-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center bg-neutral-900 rounded p-0.5 border border-neutral-800 overflow-x-auto text-[11px]">
          {['ALL', 'TACTICAL', 'GOTHAM_INTEL', 'CODE', 'PREFERENCE', 'REMINDER'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-black font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Add Memory Modal/Form */}
      {isAdding && (
        <form onSubmit={handleAddMemory} className="p-3 rounded-lg bg-neutral-900 border border-amber-500/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-hud text-xs text-amber-400 font-bold">
              LOG NEW TACTICAL RECORD
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-neutral-400 hover:text-neutral-200 text-xs"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Record Title (e.g., Batmobile Fuel Cell)"
              className="sm:col-span-2 bg-neutral-950 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-100 focus:border-amber-500 outline-none"
              required
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as MemoryRecord['category'])}
              className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-neutral-300 focus:border-amber-500 outline-none"
            >
              <option value="TACTICAL">TACTICAL</option>
              <option value="GOTHAM_INTEL">GOTHAM_INTEL</option>
              <option value="CODE">CODE</option>
              <option value="PREFERENCE">PREFERENCE</option>
              <option value="REMINDER">REMINDER</option>
            </select>
          </div>

          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Record content and tactical details..."
            rows={3}
            className="w-full bg-neutral-950 border border-neutral-700 rounded p-2 text-xs text-neutral-100 focus:border-amber-500 outline-none"
            required
          />

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-hud text-xs font-bold rounded"
            >
              SAVE INTO VAULT
            </button>
          </div>
        </form>
      )}

      {/* Memory List */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-neutral-400 text-xs font-mono-code">
            No memories match the filter criteria.
          </div>
        ) : (
          filtered.map((mem) => (
            <div
              key={mem.id}
              className={`p-3 rounded-lg border transition-all ${
                mem.pinned
                  ? 'bg-amber-950/20 border-amber-500/50'
                  : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-hud text-xs font-bold text-amber-300">
                    {mem.title}
                  </span>
                  <span className="text-[9px] font-mono-code px-1.5 py-0.2 rounded bg-neutral-950 border border-neutral-800 text-neutral-400">
                    {mem.category}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleTogglePin(mem.id)}
                    className={`p-1 rounded ${
                      mem.pinned ? 'text-amber-400' : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title={mem.pinned ? 'Unpin Record' : 'Pin Record'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(mem.id)}
                    className="p-1 rounded text-neutral-400 hover:text-red-400 transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs font-mono-code text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {mem.content}
              </p>

              <div className="mt-2 text-[10px] font-mono-code text-neutral-400 flex items-center justify-between">
                <span>Created: {mem.createdAt}</span>
                <span className="text-amber-400/60">Encrypted Local Vault</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-neutral-950 border border-red-500 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
              <div>
                <h4 className="font-hud text-sm font-bold text-red-400">
                  WIPE ENTIRE MEMORY VAULT?
                </h4>
                <p className="text-xs text-neutral-400 font-mono-code">
                  This action is irreversible and purges all local intel.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-xs font-mono-code text-neutral-300"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-hud font-bold"
              >
                PURGE ALL MEMORIES
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
