"use client";

import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/components/app-state";
import { SendIcon, SparklesIcon, XIcon } from "@/components/icons";
import { LogoMark } from "@/components/logo";

interface Message {
  id: string;
  sender: "iq" | "user";
  text: string;
  timestamp: string;
  suggestions?: string[];
}

function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { profile, analysis } = useAppState();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const businessName = profile?.businessName || "your business";

  const [messages, setMessages] = useState<Message[]>([]);

  // Initialize initial IQ introduction message once hydrated
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome-1",
          sender: "iq",
          text: `Kedu! 👋 I am **IQ**, your AI business assistant for **NaijaBiz IQ**.\n\nI analyze ${businessName}'s Wema Bank transactions and cash flow to give you instant financial advice, check affordability for business expenses, and guide your growth!`,
          timestamp: formatTime(),
          suggestions: [
            "How is my cash flow looking?",
            "Can I afford a ₦500k expense?",
            "What are my top recommendations?",
            "Are there flagged transactions?",
          ],
        },
      ]);
    }
  }, [businessName, messages.length]);

  // Listen for custom open-chat events from anywhere in the app
  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvt = e as CustomEvent<{ query?: string }>;
      setIsOpen(true);
      const q = customEvt.detail?.query;
      if (q) {
        const userMsg: Message = {
          id: `user-${Date.now()}`,
          sender: "user",
          text: q,
          timestamp: formatTime(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setIsTyping(true);

        setTimeout(() => {
          const qLower = q.toLowerCase();
          let replyText = `Thanks for asking! As **IQ**, I monitor ${businessName}'s revenue, expenses, and cash runway.`;
          let suggestionsArr = ["How is my cash flow looking?", "What are my top recommendations?"];

          if (
            qLower.includes("adebayo") ||
            qLower.includes("supplier") ||
            qLower.includes("40%") ||
            qLower.includes("207,500") ||
            qLower.includes("noticed")
          ) {
            replyText = `Great question! Here is what IQ discovered from **${businessName}**'s Wema Bank statement:\n\n• **Primary Supplier:** Adebayo Provisions Ltd\n• **Weekly Payment:** ₦207,500 transferred every week\n• **Sales Impact:** This single recurring expenditure takes up **~40% of your total sales revenue**.\n\n💡 **IQ Recommendation:** Since inventory from Adebayo Provisions Ltd is your largest cost driver, asking for a 5% prompt-payment discount or placing bi-weekly bulk orders could save ${businessName} **over ₦41,500 every month**!`;
            suggestionsArr = ["Can I afford a ₦500k expense?", "How is my cash flow looking?", "What are my top recommendations?"];
          } else if (analysis) {
            const net = analysis.growth.current.netCashFlow;
            const revenue = analysis.growth.current.revenue;
            const expenses = analysis.growth.current.expenses;
            const balance = analysis.cash.cashBalance;
            const daysCover = Math.round(analysis.cash.daysOfCashCover);
            const formatN = (val: number) => `₦${Math.abs(val).toLocaleString("en-NG")}`;

            replyText = `Here is ${businessName}'s financial summary:\n\n• **Current Cash Balance:** ${formatN(balance)}\n• **Period Revenue:** ${formatN(revenue)}\n• **Period Expenses:** ${formatN(expenses)}\n• **Net Cash Flow:** ${net >= 0 ? "+" : "-"}${formatN(net)}\n• **Cash Cover:** ~${daysCover} days of expenses\n\nYour overall financial health score is **${analysis.health.score}/100** (${analysis.health.band.toUpperCase()}).`;
          }

          const iqMsg: Message = {
            id: `iq-${Date.now()}`,
            sender: "iq",
            text: replyText,
            timestamp: formatTime(),
            suggestions: suggestionsArr,
          };
          setMessages((prev) => [...prev, iqMsg]);
          setIsTyping(false);
        }, 500);
      }
    };
    window.addEventListener("naijabiz:open-chat", handleOpenChat);
    return () => window.removeEventListener("naijabiz:open-chat", handleOpenChat);
  }, [businessName, analysis]);

  const generateReply = (userQuery: string): { text: string; suggestions?: string[] } => {
    const q = userQuery.toLowerCase();

    if (
      q.includes("adebayo") ||
      q.includes("supplier") ||
      q.includes("40%") ||
      q.includes("207,500") ||
      q.includes("noticed")
    ) {
      return {
        text: `Great question! Here is what IQ discovered from **${businessName}**'s Wema Bank statement:\n\n• **Primary Supplier:** Adebayo Provisions Ltd\n• **Weekly Payment:** ₦207,500 transferred every week\n• **Sales Impact:** This single recurring expenditure takes up **~40% of your total sales revenue**.\n\n💡 **IQ Recommendation:** Since inventory from Adebayo Provisions Ltd is your largest cost driver, asking for a 5% prompt-payment discount or placing bi-weekly bulk orders could save ${businessName} **over ₦41,500 every month**!`,
        suggestions: ["Can I afford a ₦500k expense?", "How is my cash flow looking?", "What are my top recommendations?"],
      };
    }

    if (q.includes("cash flow") || q.includes("inflow") || q.includes("outflow") || q.includes("money") || q.includes("balance")) {


      if (analysis) {
        const net = analysis.growth.current.netCashFlow;
        const revenue = analysis.growth.current.revenue;
        const expenses = analysis.growth.current.expenses;
        const balance = analysis.cash.cashBalance;
        const daysCover = Math.round(analysis.cash.daysOfCashCover);
        const formatNaira = (val: number) => `₦${Math.abs(val).toLocaleString("en-NG")}`;

        return {
          text: `Here is ${businessName}'s financial summary (${analysis.growth.current.period}):\n\n• **Current Cash Balance:** ${formatNaira(balance)}\n• **Period Revenue:** ${formatNaira(revenue)}\n• **Period Expenses:** ${formatNaira(expenses)}\n• **Net Cash Flow:** ${net >= 0 ? "+" : "-"}${formatNaira(net)}\n• **Cash Cover:** ~${daysCover} days of expenses\n\nYour overall financial health score is **${analysis.health.score}/100** (${analysis.health.band.toUpperCase()}).`,
          suggestions: ["Can I afford a ₦500k expense?", "What are my top recommendations?"],
        };
      }
      return { text: "Connect your bank account or upload a CSV statement so I can analyze your cash flow!" };
    }

    if (q.includes("afford") || q.includes("purchase") || q.includes("expense") || q.includes("cost") || q.includes("500k")) {
      if (analysis) {
        const daysCover = Math.round(analysis.cash.daysOfCashCover);
        const formatNaira = (val: number) => `₦${Math.abs(val).toLocaleString("en-NG")}`;
        const monthlyAvgNet = analysis.growth.current.netCashFlow / 3;

        return {
          text: `To check if ${businessName} can afford a specific purchase or ₦500,000 expense, try the **'Can I afford this?'** tool in the navigation menu!\n\nCurrently, your business has **${formatNaira(analysis.cash.cashBalance)}** in cash with **~${daysCover} days** of expense buffer. Your average monthly net flow is roughly **${formatNaira(monthlyAvgNet)}/mo**.`,
          suggestions: ["How is my cash flow looking?", "What are my top recommendations?"],
        };
      }
      return { text: "You can use the 'Can I afford this?' tool once your statement is loaded!" };
    }

    if (q.includes("recommend") || q.includes("advice") || q.includes("tip") || q.includes("insight")) {
      if (analysis && analysis.recommendations.length > 0) {
        const topAdvice = analysis.recommendations
          .slice(0, 3)
          .map((a, i) => `${i + 1}. **${a.title}**: ${a.message}`)
          .join("\n\n");

        return {
          text: `Here are top financial recommendations for ${businessName}:\n\n${topAdvice}\n\nYou can view details on the **Recommendations** page.`,
          suggestions: ["Are there flagged transactions?", "How is my cash flow looking?"],
        };
      }
      return { text: "Your financial health looks steady! Keep recording your sales and maintaining a healthy cash buffer." };
    }

    if (q.includes("flagged") || q.includes("review") || q.includes("transaction")) {
      if (analysis) {
        const flaggedCount = analysis.flagged.length;
        if (flaggedCount > 0) {
          return {
            text: `You currently have **${flaggedCount} transaction${flaggedCount > 1 ? "s" : ""}** that need your review in the **Transactions** page. Confirming these categories ensures your financial reports remain accurate!`,
            suggestions: ["How is my cash flow looking?", "What are my top recommendations?"],
          };
        }
        return {
          text: "All your transactions have been classified cleanly! No pending items need review right now. 👍",
          suggestions: ["How is my cash flow looking?", "What are my top recommendations?"],
        };
      }
    }

    if (q.includes("hi") || q.includes("hello") || q.includes("hey") || q.includes("who are you") || q.includes("iq")) {
      return {
        text: `Hello! I'm **IQ**, your AI assistant for **NaijaBiz IQ**. I was created to help Nigerian business owners like you make sense of their numbers and build stronger businesses with Wema Bank. How can I help today?`,
        suggestions: ["How is my cash flow looking?", "Can I afford a ₦500k expense?", "What are my top recommendations?"],
      };
    }

    return {
      text: `Thanks for asking! As **IQ**, I monitor ${businessName}'s revenue, expenses, and cash runway. You can ask me about your cash flow, transaction breakdown, expense affordability, or financial readiness score!`,
      suggestions: ["How is my cash flow looking?", "What are my top recommendations?", "Are there flagged transactions?"],
    };
  };

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: formatTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    // Simulate natural AI response delay
    setTimeout(() => {
      const replyData = generateReply(query);
      const iqMsg: Message = {
        id: `iq-${Date.now()}`,
        sender: "iq",
        text: replyData.text,
        timestamp: formatTime(),
        suggestions: replyData.suggestions,
      };
      setMessages((prev) => [...prev, iqMsg]);
      setIsTyping(false);
    }, 500);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2.5 rounded-full bg-brand px-4 py-3 text-white shadow-xl ring-4 ring-brand/20 transition-all hover:bg-brand-500 hover:shadow-2xl hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close IQ Chat assistant" : "Chat with IQ AI assistant"}
      >
        <span className="relative grid place-items-center">
          <LogoMark size={24} className="rounded-full shadow-inner" />
          <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-positive ring-2 ring-brand" />
        </span>
        <span className="font-display font-semibold text-sm tracking-wide">
          {isOpen ? "Close IQ" : "Chat with IQ"}
        </span>
        <SparklesIcon />
      </button>

      {/* Chat Window Popover */}
      {isOpen && (
        <div
          className="fixed bottom-36 right-4 z-50 flex h-[520px] max-h-[75vh] w-[calc(100vw-2rem)] sm:w-[380px] flex-col overflow-hidden rounded-card border border-line bg-white shadow-2xl transition-all lg:bottom-22 lg:right-6 animate-in fade-in slide-in-from-bottom-4"
          role="dialog"
          aria-label="IQ AI Assistant Chat"
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-line bg-gradient-to-r from-plum to-aubergine p-3.5 text-white">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <LogoMark size={34} />
                <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-positive ring-2 ring-plum" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display font-bold text-base text-white leading-none">IQ</h3>
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-medium text-tint">AI Assistant</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-tint/80">NaijaBiz IQ · Financial Intelligence</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-input p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <XIcon />
            </button>
          </header>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface/50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                <div className="flex items-end gap-2 max-w-[88%]">
                  {msg.sender === "iq" && (
                    <div className="shrink-0 mb-1">
                      <LogoMark size={22} />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-brand text-white rounded-br-none shadow-sm"
                        : "bg-white text-ink border border-line rounded-bl-none shadow-sm"
                    }`}
                  >
                    {msg.text.split("\n\n").map((paragraph, idx) => (
                      <p key={idx} className={idx > 0 ? "mt-2" : ""}>
                        {paragraph.split("**").map((chunk, chunkIdx) =>
                          chunkIdx % 2 === 1 ? <strong key={chunkIdx} className="font-semibold">{chunk}</strong> : chunk
                        )}
                      </p>
                    ))}
                  </div>
                </div>
                <span className="mt-1 px-1 text-[10px] text-muted">{msg.timestamp}</span>

                {/* Quick suggestion chips */}
                {msg.sender === "iq" && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 pl-7">
                    {msg.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSend(suggestion)}
                        className="rounded-full border border-brand/30 bg-tint/80 px-3 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand hover:text-white"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 pl-1 text-muted text-xs">
                <LogoMark size={20} className="animate-spin" />
                <span>IQ is thinking…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <footer className="border-t border-line bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask IQ anything about your business…"
                className="flex-1 rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="grid size-9 place-items-center rounded-input bg-brand text-white transition-opacity hover:bg-brand-500 disabled:opacity-40"
                aria-label="Send message"
              >
                <SendIcon />
              </button>
            </form>
          </footer>
        </div>
      )}
    </>
  );
}
