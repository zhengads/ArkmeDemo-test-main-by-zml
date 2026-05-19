import React, { useState, useEffect } from "react";
import { usePreferences } from "@/settings/preferences";
import { extractSingleConversation } from "@/services/dialogService";
import type { SingleConversation } from "@/types/singleConversation";
import { cn } from "@/lib/utils";

type SingleConversationScreenProps = {
  onBack?: () => void;
};

export default function SingleConversationScreen({ onBack }: SingleConversationScreenProps) {
  const { t } = usePreferences();
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<SingleConversation | null>(null);
  const [savedConversations, setSavedConversations] = useState<SingleConversation[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load saved results from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("arkme-demo.single-conversations");
      if (stored) {
        setSavedConversations(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleExtract = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await extractSingleConversation(inputText);
      setExtractedData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract conversation");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!extractedData) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(extractedData, null, 2));
      setSuccessMsg(t("singleConversation.saved") || "JSON copied!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setError("Failed to copy JSON");
    }
  };

  const handleSave = () => {
    if (!extractedData) return;
    try {
      const stored = localStorage.getItem("arkme-demo.single-conversations");
      const list: SingleConversation[] = stored ? JSON.parse(stored) : [];
      // Prevent duplicates by uid
      const filtered = list.filter((item) => item.uid !== extractedData.uid);
      const nextList = [extractedData, ...filtered];
      localStorage.setItem("arkme-demo.single-conversations", JSON.stringify(nextList));
      setSavedConversations(nextList);
      setSuccessMsg(t("singleConversation.saved") || "Saved successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      setError("Failed to save conversation");
    }
  };

  const handleDelete = (uid: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const nextList = savedConversations.filter((item) => item.uid !== uid);
      localStorage.setItem("arkme-demo.single-conversations", JSON.stringify(nextList));
      setSavedConversations(nextList);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex h-full flex-col bg-bg overflow-y-auto">
      <header className="flex h-14 shrink-0 items-center border-b border-border-light bg-bg px-4">
        {onBack && (
          <button
            type="button"
            className="mr-2 flex h-9 w-9 items-center justify-center rounded-full text-text-muted transition hover:bg-hover-overlay active:scale-[0.96]"
            onClick={onBack}
            aria-label={t("common.back")}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1 className="text-lg font-semibold text-text">
          {t("singleConversation.title") || "单人对话意图提取"}
        </h1>
      </header>

      <div className="p-4 space-y-6 flex-1 min-h-0">
        {/* Input section */}
        <div className="space-y-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t("singleConversation.inputPlaceholder") || "输入要提取的对话文本..."}
            className="w-full min-h-[120px] p-3 rounded-[12px] border border-border-light bg-surface text-[14px] outline-none focus:border-primary transition resize-y text-text placeholder:text-text-tertiary"
          />
          <button
            onClick={handleExtract}
            disabled={loading || !inputText.trim()}
            className="w-full py-3 rounded-full bg-primary text-white font-medium disabled:opacity-50 transition active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{t("singleConversation.extracting") || "提取中..."}</span>
              </>
            ) : (
              <span>{t("singleConversation.extract") || "提取意图"}</span>
            )}
          </button>
        </div>

        {/* Message logs */}
        {error && (
          <div className="p-3.5 rounded-[12px] bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-[12px] bg-green-500/10 border border-green-500/20 text-green-600 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            {successMsg}
          </div>
        )}

        {/* Extracted preview */}
        {extractedData && (
          <div className="space-y-4 border border-border-light bg-surface/50 rounded-[16px] p-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b border-border-light pb-2">
              <span className="text-[12px] font-semibold text-text-tertiary uppercase tracking-wider">
                Extracted Result
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1 rounded-[8px] border border-border-light text-[12px] font-medium text-text-muted hover:bg-hover-overlay transition"
                >
                  {t("singleConversation.copy") || "复制 JSON"}
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1 rounded-[8px] bg-primary text-white text-[12px] font-medium transition active:scale-[0.96]"
                >
                  {t("singleConversation.save") || "保存结果"}
                </button>
              </div>
            </div>

            {extractedData.title && (
              <div className="space-y-1">
                <span className="text-[11px] text-text-tertiary">对话标题</span>
                <div className="text-[15px] font-semibold text-text">{extractedData.title}</div>
              </div>
            )}

            <div className="space-y-2">
              <span className="text-[11px] text-text-tertiary">提取的消息明细</span>
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {extractedData.messages.map((msg: { role: "user" | "assistant"; content: string }, index: number) => {
                  const isAssistant = msg.role === "assistant";
                  return (
                    <div
                      key={index}
                      className={cn(
                        "flex flex-col rounded-[12px] p-3 text-[13px] leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
                        isAssistant
                          ? "bg-primary-soft/50 text-text border border-primary/10 self-start"
                          : "bg-fill-2 text-text self-end"
                      )}
                    >
                      <div className="text-[10px] font-semibold text-text-tertiary mb-1">
                        {isAssistant ? "AI Assistant" : "User"}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Saved list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text">
            Saved Dialogues ({savedConversations.length})
          </h2>
          {savedConversations.length === 0 ? (
            <div className="text-center text-[13px] text-text-tertiary py-8 border border-dashed border-border-light rounded-[16px]">
              {t("singleConversation.empty") || "暂无已保存的单人对话意图"}
            </div>
          ) : (
            <div className="grid gap-2">
              {savedConversations.map((item) => (
                <div
                  key={item.uid}
                  onClick={() => {
                    setExtractedData(item);
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="flex items-center justify-between p-3.5 rounded-[12px] border border-border-light bg-surface/40 hover:bg-surface transition cursor-pointer active:scale-[0.99] group shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-medium text-text truncate">
                      {item.title || "未命名对话"}
                    </div>
                    <div className="text-[11px] text-text-tertiary mt-1">
                      ID: {item.uid} · {item.messages.length} messages
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(item.uid, e)}
                    className="opacity-0 group-hover:opacity-100 flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:text-red-500 hover:bg-fill-2 transition"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
