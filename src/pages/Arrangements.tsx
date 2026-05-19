import React, { useState } from "react";
import { usePreferences } from "@/settings/preferences";
import { cn } from "@/lib/utils";

type ArrangementState = "todo" | "completed" | "later";

interface ArrangementItem {
  id: string;
  text: string;
  state: ArrangementState;
  createdAt: number;
}

const arrangementsStorageKey = "arkme-demo.arrangements";

export default function Arrangements() {
  const { t } = usePreferences();
  const [items, setItems] = useState<ArrangementItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(arrangementsStorageKey);
        return stored ? JSON.parse(stored) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [inputValue, setInputValue] = useState("");
  const [activeTab, setActiveTab] = useState<ArrangementState>("todo");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(arrangementsStorageKey, JSON.stringify(items));
    }
  }, [items]);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handleChanged = () => {
      try {
        const stored = window.localStorage.getItem(arrangementsStorageKey);
        if (stored) {
          setItems(JSON.parse(stored));
        } else {
          setItems([]);
        }
      } catch (e) {
        console.error("Failed to parse arrangements on changed event:", e);
      }
    };
    window.addEventListener("arkme-demo.arrangements-changed", handleChanged);
    return () => {
      window.removeEventListener("arkme-demo.arrangements-changed", handleChanged);
    };
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const newItem: ArrangementItem = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      state: "todo",
      createdAt: Date.now(),
    };
    setItems([newItem, ...items]);
    setInputValue("");
  };

  const toggleComplete = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, state: item.state === "completed" ? "todo" : "completed" };
        }
        return item;
      })
    );
  };

  const markLater = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, state: "later" };
        }
        return item;
      })
    );
  };

  const filteredItems = items.filter((item) => item.state === activeTab);

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center bg-bg px-4">
        <h1 className="text-lg font-semibold text-text">{t("tabs.arrangement") || "安排"}</h1>
      </header>

      {/* Tabs */}
      <div className="flex px-4 gap-4 border-b border-border-light pb-2">
        {(["todo", "completed", "later"] as ArrangementState[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "text-sm transition relative pb-1",
              activeTab === tab ? "text-primary font-medium" : "text-text-tertiary"
            )}
          >
            {tab === "todo" && "待办"}
            {tab === "completed" && "已完成"}
            {tab === "later" && "以后再说"}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center text-text-tertiary text-sm mt-10">
            暂无安排项，在这里写下你的规划吧
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative flex items-center gap-3 rounded-[12px] bg-surface p-3 shadow-sm transition active:scale-[0.98]"
            >
              <button
                onClick={() => toggleComplete(item.id)}
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition duration-300",
                  item.state === "completed"
                    ? "border-primary bg-primary text-white"
                    : "border-border hover:border-primary"
                )}
              >
                {item.state === "completed" && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-in zoom-in duration-200">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
              <div className="min-w-0 flex-1 relative">
                <p
                  className={cn(
                    "text-[15px] leading-5 text-text transition-all duration-300",
                    item.state === "completed" && "text-text-tertiary"
                  )}
                >
                  {item.text}
                </p>
                {/* 划线动画 */}
                {item.state === "completed" && (
                  <span className="absolute top-1/2 left-0 h-[1.5px] bg-text-tertiary w-full origin-left animate-in fade-in slide-in-from-left-2 duration-300 pointer-events-none" />
                )}
              </div>
              {item.state === "todo" && (
                <button
                  onClick={() => markLater(item.id)}
                  className="shrink-0 text-[12px] text-text-tertiary bg-fill-2 px-2 py-1 rounded-[8px] transition active:scale-[0.96] hover:bg-fill-3"
                >
                  以后再说
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="shrink-0 px-4 pb-4">
        <form
          onSubmit={handleAdd}
          className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 shadow-sm border border-border-light focus-within:border-primary transition"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="安排点什么..."
            className="h-8 flex-1 bg-transparent text-[15px] outline-none placeholder:text-text-tertiary"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white disabled:opacity-50 transition active:scale-[0.96]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5v14" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
