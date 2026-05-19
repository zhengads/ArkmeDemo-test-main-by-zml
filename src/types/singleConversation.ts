// src/types/singleConversation.ts

/**
 * 单人对话（单条意图）抽取结果的结构定义。
 * 用于在后续 UI 与持久化层统一数据格式。
 */
export interface SingleConversation {
  /** 唯一标识符 */
  uid: string;
  /** 对话消息数组，保持原始顺序 */
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /** 对话标题（可选） */
  title?: string;
  /** 额外的元信息（如创建时间、来源） */
  metadata?: Record<string, unknown>;
}
