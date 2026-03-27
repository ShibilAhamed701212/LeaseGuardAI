import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react";
import { sendChatMessage, type ChatMessage } from "../../services/api";
import type { ResultPayload } from "../../services/api";
import styles from "./ChatWidget.module.css";

interface ChatWidgetProps {
  /** If provided, chat will have context about the analyzed contract */
  contractData?: ResultPayload | null;
}

const QUICK_PROMPTS = [
  "Is this lease fair?",
  "How can I negotiate?",
  "Explain residual value",
  "Red flags to watch for",
  "Practice negotiation",
];

export function ChatWidget({ contractData }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: ChatMessage = { role: "user", content: text.trim() };
      const newHistory = [...messages, userMsg];
      setMessages(newHistory);
      setInput("");
      setError(null);
      setLoading(true);

      try {
        // Build contract context from analyzed data
        const context = contractData
          ? {
              sla: contractData.sla,
              fairness_score: contractData.fairness_score,
              negotiation_tips: contractData.negotiation_tips,
              price_estimate: contractData.price_estimate,
              vin: contractData.vin,
            }
          : null;

        const { reply } = await sendChatMessage(text.trim(), messages, context);
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to get response";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, contractData]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  /** Simple markdown-to-HTML for assistant messages */
  const renderMarkdown = (text: string) => {
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Inline code
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Bullet points
      .replace(/^[-•] (.+)/gm, "<li>$1</li>")
      // Numbered lists
      .replace(/^\d+\. (.+)/gm, "<li>$1</li>")
      // Paragraphs
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br />");

    // Wrap loose <li> in <ul>
    html = html.replace(/(<li>.*?<\/li>)+/g, "<ul>$&</ul>");

    return `<p>${html}</p>`;
  };

  return (
    <>
      {/* Floating panel */}
      {open && (
        <div className={styles.panel}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon}>🤖</div>
            <div className={styles.headerText}>
              <h3>LeaseGuard AI Coach</h3>
              <p>
                {contractData
                  ? "Contract loaded • Ask anything"
                  : "Negotiation & lease expert"}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className={styles.messages}>
            {messages.length === 0 && !loading && (
              <div className={`${styles.msg} ${styles.assistant}`}>
                <p>
                  👋 Hi! I'm your lease negotiation coach. I can help you:
                </p>
                <ul>
                  <li>Understand contract terms</li>
                  <li>Identify hidden fees & risks</li>
                  <li>Practice negotiation tactics</li>
                  {contractData && (
                    <li>
                      <strong>Analyze your uploaded contract</strong>
                    </li>
                  )}
                </ul>
                <p>What would you like to know?</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.msg} ${styles[msg.role]}`}
                {...(msg.role === "assistant"
                  ? {
                      dangerouslySetInnerHTML: {
                        __html: renderMarkdown(msg.content),
                      },
                    }
                  : { children: msg.content })}
              />
            ))}

            {loading && (
              <div className={styles.typing}>
                <div className={styles.dot} />
                <div className={styles.dot} />
                <div className={styles.dot} />
              </div>
            )}

            {error && <div className={styles.errorMsg}>⚠ {error}</div>}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions (only when no messages yet) */}
          {messages.length === 0 && (
            <div className={styles.quickActions}>
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className={styles.quickBtn}
                  onClick={() => send(prompt)}
                  disabled={loading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className={styles.inputArea}>
            <textarea
              ref={inputRef}
              className={styles.input}
              placeholder="Ask about your lease..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className={styles.sendBtn}
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* FAB toggle */}
      <button
        className={`${styles.fab} ${open ? styles.open : ""}`}
        onClick={() => setOpen(!open)}
        aria-label={open ? "Close chat" : "Open AI chat"}
      >
        {open ? "✕" : "💬"}
      </button>
    </>
  );
}
