import { useState, useRef, useEffect, useCallback } from "react";

// ─── Storage ──────────────────────────────────────────────────────────────────
const LS = {
  get: (k, fb = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

// ─── Claude API ───────────────────────────────────────────────────────────────
// ─── CONFIGURAÇÃO GEMINI ──────────────────────────────────────────────────
// 1. Acesse: aistudio.google.com → Get API Key → Create API Key
// 2. Cole sua chave abaixo (começa com AIza...)
// 3. Tier GRATUITO: 1.500 requisições/dia — perfeito para começar
// Chave do Gemini — pode ser configurada pelo painel admin dentro do app
const GEMINI_API_KEY = localStorage.getItem("presenca_gemini_key") || "cole-sua-chave-aqui";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
// ─────────────────────────────────────────────────────────────────────────

async function callClaude({ system, messages, imageBase64, imageType, maxTokens = 1000 }) {
  const last = messages[messages.length - 1];

  // Montar o conteúdo do usuário (com ou sem imagem)
  let userParts = [];
  if (imageBase64) {
    userParts.push({ inlineData: { mimeType: imageType || "image/jpeg", data: imageBase64 } });
    userParts.push({ text: last.content });
  } else {
    userParts.push({ text: last.content });
  }

  // Montar histórico de mensagens no formato Gemini
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const body = {
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    contents: [
      ...history,
      { role: "user", parts: userParts }
    ],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.7,
    }
  };

  // Remove systemInstruction se vazio
  if (!body.systemInstruction) delete body.systemInstruction;

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  // Extrair texto da resposta do Gemini
  if (data.error) {
    console.error("Gemini error:", data.error);
    throw new Error(data.error.message || "Erro na API Gemini");
  }

  return data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "";
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const fmt = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Icons ────────────────────────────────────────────────────────────────────
const PATHS = {
  image: "M21 19a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h4l2-3h4l2 3h4a2 2 0 012 2zM12 13a3 3 0 100-6 3 3 0 000 6z",
  chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  shop: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  sparkle: "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z",
  bell: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0",
  share: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  close: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  crown: "M3 18h18M5 18l-2-9 5 4 4-7 4 7 5-4-2 9",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  trash: "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  heart: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z",
  link: "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  instagram: "M16 4H8a4 4 0 00-4 4v8a4 4 0 004 4h8a4 4 0 004-4V8a4 4 0 00-4-4zM12 15a3 3 0 110-6 3 3 0 010 6zM17 7h.01",
  refresh: "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  external: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  chart: "M18 20V10M12 20V4M6 20v-6",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  bookmark: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z",
  arrow: "M5 12h14M12 5l7 7-7 7",
};
const Icon = ({ n, size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={PATHS[n]} />
  </svg>
);

function Dots({ color = "#888" }) {
  return <span style={{ display:"inline-flex", gap:5, alignItems:"center" }}>
    {[0,1,2].map(i => (
      <span key={i} style={{ width:6, height:6, borderRadius:"50%", background:color, animation:`pulse 1.4s ease ${i*.22}s infinite` }} />
    ))}
  </span>;
}

function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, []);
  return (
    <div style={{
      position:"fixed", top:72, left:"50%", transform:"translateX(-50%)",
      background:"linear-gradient(135deg,#1c1c1c,#252525)",
      border:"1px solid rgba(201,169,110,.3)",
      color:"#f0ece6", padding:"12px 24px", borderRadius:100,
      fontSize:13, fontWeight:500, letterSpacing:.3,
      zIndex:9999, whiteSpace:"nowrap",
      animation:"slideDown .35s cubic-bezier(.175,.885,.32,1.275)",
      pointerEvents:"none",
      boxShadow:"0 8px 32px rgba(0,0,0,.5), 0 0 0 1px rgba(201,169,110,.1)",
      display:"flex", alignItems:"center", gap:8
    }}>
      <span style={{ color:"var(--accent)", fontSize:14 }}>✦</span>
      {msg}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// BADGE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
const BADGES = [
  { id:"first_look",    emoji:"👁️",  name:"Primeiro Olhar",     desc:"Fez a primeira análise",           req: s => s.analyses >= 1,              xp:50  },
  { id:"style_student", emoji:"📚",  name:"Aprendiz de Estilo",  desc:"Completou 3 análises",             req: s => s.analyses >= 3,              xp:100 },
  { id:"style_master",  emoji:"✦",   name:"Mestre da Presença",  desc:"10 análises realizadas",           req: s => s.analyses >= 10,             xp:300 },
  { id:"conversador",   emoji:"💬",  name:"Conversador",         desc:"Trocou 10 mensagens com o coach",  req: s => s.chatMsgs >= 10,             xp:80  },
  { id:"mentor",        emoji:"🧠",  name:"Mentor",              desc:"50 mensagens com o coach",         req: s => s.chatMsgs >= 50,             xp:200 },
  { id:"streak3",       emoji:"🔥",  name:"Chama Viva",          desc:"3 dias seguidos no app",           req: s => s.streak >= 3,                xp:75  },
  { id:"streak7",       emoji:"⚡",  name:"Semana Inteira",      desc:"7 dias seguidos no app",           req: s => s.streak >= 7,                xp:150 },
  { id:"streak30",      emoji:"💎",  name:"Dedicação Total",     desc:"30 dias seguidos no app",          req: s => s.streak >= 30,               xp:500 },
  { id:"collector",     emoji:"🔖",  name:"Colecionador",        desc:"Salvou 5 sugestões favoritas",     req: s => s.favorites >= 5,             xp:100 },
  { id:"shopper",       emoji:"🛍️", name:"Curador de Estilo",   desc:"Adicionou 3 itens à wishlist",     req: s => s.wishlist >= 3,              xp:80  },
  { id:"premium",       emoji:"👑",  name:"Presença Premium",    desc:"Assinou o plano premium",          req: s => s.isPremium,                  xp:200 },
  { id:"influencer",    emoji:"🌟",  name:"Influenciador",       desc:"Compartilhou uma análise",         req: s => s.shares >= 1,                xp:120 },
  { id:"ref_1",         emoji:"✉️",  name:"Primeiro Convite",    desc:"Indicou o primeiro amigo",         req: s => s.referrals >= 1,             xp:150 },
  { id:"ref_3",         emoji:"👥",  name:"Trio de Amigos",      desc:"3 amigos indicados aceitos",       req: s => s.referrals >= 3,             xp:300 },
  { id:"ref_5",         emoji:"🌟",  name:"Embaixador",          desc:"5 amigos indicados aceitos",       req: s => s.referrals >= 5,             xp:500 },
  { id:"ref_10",        emoji:"👑",  name:"Lenda Presença",      desc:"10 amigos indicados",              req: s => s.referrals >= 10,            xp:1000},
  { id:"gym_checkin",   emoji:"💪",  name:"Guerreiro",           desc:"7 dias de treino seguidos",        req: s => s.gymStreak >= 7,             xp:200 },
  { id:"gym_transform", emoji:"🏆",  name:"Transformação",       desc:"10 fotos de evolução registradas", req: s => s.gymPhotos >= 10,            xp:350 },
  { id:"gym_biotype",   emoji:"🧬",  name:"Autoconhecimento",    desc:"Descobriu seu tipo de corpo",            req: s => s.hasBiotype,                 xp:80  },
  { id:"barb_face",     emoji:"🪞",  name:"Consultor Visual",    desc:"Analisou formato do rosto",        req: s => s.hasFaceShape,               xp:80  },
  { id:"barb_history",  emoji:"✂️",  name:"Cliente Fiel",        desc:"5 cortes registrados no histórico",req: s => s.barbHistory >= 5,           xp:150 },
  { id:"presenca_total",emoji:"⭐",  name:"Presença Completa",   desc:"Score total acima de 70",          req: s => s.totalScore >= 70,           xp:500 },
];

function getBadgeStats(userId) {
  const analyses = LS.get(`presenca_analyses_${userId}`, []).length;
  const chatMsgs = LS.get(`presenca_chat_${userId}`, []).filter(m => m.role==="user").length;
  const streak   = LS.get(`presenca_streak_${userId}`, 0);
  const favorites= LS.get(`presenca_favs_${userId}`, []).length;
  const wishlist = LS.get(`presenca_wishlist_${userId}`, []).length;
  const isPremium= LS.get(`presenca_premium_${userId}`, false);
  const shares    = LS.get(`presenca_shares_${userId}`, 0);
  const referrals = LS.get(`presenca_referrals_${userId}`, []).length;
  const gymData   = LS.get(`presenca_gym_${userId}`, {});
  const gymStreak = gymData.streak || 0;
  const gymPhotos = LS.get(`presenca_gym_photos_${userId}`, []).length;
  const hasBiotype   = !!gymData.biotype;
  const barbData     = LS.get(`presenca_barb_${userId}`, {});
  const hasFaceShape = !!barbData.faceShape;
  const barbHistory  = LS.get(`presenca_barb_hist_${userId}`, []).length;
  const analysesLen  = analyses;
  const styleScore   = Math.min(100, analysesLen * 12 + 0);
  const gymScore2    = Math.min(100, gymStreak * 5 + (hasBiotype?20:0) + (gymData.modality?15:0));
  const groomScore   = Math.min(100, (hasFaceShape?30:0) + (barbHistory * 10));
  const totalScore   = Math.round((styleScore + gymScore2 + groomScore) / 3);
  return { analyses, chatMsgs, streak, favorites, wishlist, isPremium, shares, referrals, gymStreak, gymPhotos, hasBiotype, hasFaceShape, barbHistory, totalScore };
}

function getUnlockedBadges(userId) {
  const stats = getBadgeStats(userId);
  return BADGES.filter(b => b.req(stats));
}

function getTotalXP(userId) {
  const badgeXP = getUnlockedBadges(userId).reduce((sum, b) => sum + b.xp, 0);
  return badgeXP;
}

// Check for newly unlocked badges and return them
function checkNewBadges(userId) {
  const prev = LS.get(`presenca_badges_seen_${userId}`, []);
  const current = getUnlockedBadges(userId).map(b => b.id);
  const newOnes = current.filter(id => !prev.includes(id));
  LS.set(`presenca_badges_seen_${userId}`, current);
  return newOnes.map(id => BADGES.find(b => b.id === id)).filter(Boolean);
}

// Next badge about to unlock
function getNextBadge(userId) {
  const stats = getBadgeStats(userId);
  const locked = BADGES.filter(b => !b.req(stats));
  if (!locked.length) return null;
  // Find one closest to unlocking
  const withProgress = locked.map(b => {
    let pct = 0;
    if (b.id === "first_look")    pct = Math.min(stats.analyses / 1, 1);
    if (b.id === "style_student") pct = Math.min(stats.analyses / 3, 1);
    if (b.id === "style_master")  pct = Math.min(stats.analyses / 10, 1);
    if (b.id === "conversador")   pct = Math.min(stats.chatMsgs / 10, 1);
    if (b.id === "mentor")        pct = Math.min(stats.chatMsgs / 50, 1);
    if (b.id === "streak3")       pct = Math.min(stats.streak / 3, 1);
    if (b.id === "streak7")       pct = Math.min(stats.streak / 7, 1);
    if (b.id === "streak30")      pct = Math.min(stats.streak / 30, 1);
    if (b.id === "collector")     pct = Math.min(stats.favorites / 5, 1);
    if (b.id === "shopper")       pct = Math.min(stats.wishlist / 3, 1);
    if (b.id === "influencer")    pct = Math.min(stats.shares / 1, 1);
    return { ...b, pct };
  });
  return withProgress.sort((a,b) => b.pct - a.pct)[0];
}

// Badge unlock toast
function BadgeToast({ badge, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t); }, []);
  return (
    <div style={{ position:"fixed", top:72, left:"50%", transform:"translateX(-50%)", zIndex:9999, animation:"badgePop .4s cubic-bezier(.34,1.56,.64,1)", pointerEvents:"none" }}>
      <div style={{ background:"linear-gradient(135deg,#1a1a1a,#2a2a2a)", border:"1px solid #bfaa8e44", borderRadius:20, padding:"14px 20px", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,.4)", minWidth:260 }}>
        <div style={{ fontSize:28, lineHeight:1 }}>{badge.emoji}</div>
        <div>
          <div style={{ fontSize:9, letterSpacing:2.5, color:"var(--accent)", textTransform:"uppercase", marginBottom:3 }}>Badge Desbloqueado!</div>
          <div style={{ fontSize:14, color:"#fff", fontWeight:500, marginBottom:2 }}>{badge.name}</div>
          <div style={{ fontSize:11, color:"var(--text3)" }}>+{badge.xp} XP</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEADERBOARD TAB
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// REAL-TIME CAMERA WITH AI OVERLAY
// ═══════════════════════════════════════════════════════════════════════════════
const POSITIONING_TIPS = [
  { id:"lighting", emoji:"☀️", label:"Iluminação", good:"Luz frontal suave", bad:"Contra a luz" },
  { id:"angle",    emoji:"📐", label:"Ângulo",     good:"Câmera na altura dos olhos", bad:"Muito abaixo ou acima" },
  { id:"distance", emoji:"📏", label:"Distância",  good:"Rosto + ombros visíveis", bad:"Muito perto ou longe" },
  { id:"bg",       emoji:"🖼️", label:"Fundo",      good:"Neutro e limpo", bad:"Fundo bagunçado" },
];


// ═══════════════════════════════════════════════════════════════════════════════
const NOTIF_TYPES = {
  analysis_ready: { icon: "✦", title: "Análise pronta", color: "var(--accent)" },
  stylist_reply: { icon: "💬", title: "Stylist respondeu", color: "#818cf8" },
  daily_insight: { icon: "🌅", title: "Insight do dia", color: "#34d399" },
  product_drop: { icon: "🏷️", title: "Queda de preço", color: "#4ade80" },
  streak: { icon: "🔥", title: "Sequência ativa!", color: "#f472b6" },
};


function usePushNotifications(userId) {
  const key = `presenca_notifs_${userId}`;

  const push = useCallback((type, title, body) => {
    const perms = LS.get(`presenca_notif_perms_${userId}`, {});
    if (perms[type] === false) return;
    const notif = { id: uid(), type, title, body, time: new Date().toISOString(), read: false };
    const existing = LS.get(key, []);
    LS.set(key, [notif, ...existing].slice(0, 50));
    // Browser notification if granted
    if (Notification.permission === "granted") {
      new Notification(`Presença — ${title}`, { body, icon: "/icon.png" });
    }
  }, [userId]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const p = await Notification.requestPermission();
    return p === "granted";
  }, []);

  return { push, requestPermission };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOCIAL SHARING — Stories (9:16) + Open Graph
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════════════════════
const MOCK_PRODUCT_IMAGES = [
  "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=300&q=80",
  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=300&q=80",
  "https://images.unsplash.com/photo-1603252109303-2751441dd157?w=300&q=80",
  "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=300&q=80",
  "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=300&q=80",
  "https://images.unsplash.com/photo-1578932750294-f5075e85f44a?w=300&q=80",
  "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=300&q=80",
  "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=300&q=80",
];

function ShopTab({ user, profile, isPremium, onPaywall, toast, push }) {
  const key = `presenca_products_${user.id}`;
  const [products, setProducts] = useState(() => LS.get(key, null));
  const [loading, setLoading] = useState(false);
  const [wishlist, setWishlist] = useState(() => LS.get(`presenca_wishlist_${user.id}`, []));
  const [filter, setFilter] = useState("all");
  const analyses = LS.get(`presenca_analyses_${user.id}`, []);

  const categories = ["all", "tops", "bottoms", "shoes", "accessories", "outerwear"];

  const genProducts = async () => {
    if (!isPremium && products) { onPaywall(); return; }
    setLoading(true);
    try {
      const lastAnalysis = analyses[0]?.result || "";
      const raw = await callClaude({
        system: `Você é um personal shopper de alto nível. Gere exatamente 8 sugestões de produtos de moda em JSON array. Cada item deve ter:
{
  "id": "único",
  "name": "Nome do produto",
  "brand": "Marca real de moda",
  "category": "tops|bottoms|shoes|accessories|outerwear",
  "price": "R$ XXX",
  "originalPrice": "R$ XXX (opcional, para mostrar desconto)",
  "why": "Por que combina com o estilo analisado (1 frase)",
  "tags": ["tag1","tag2"]
}
Responda SOMENTE o JSON array, sem markdown.`,
        messages: [{ role:"user", content:`Perfil: estilo ${profile?.style||"contemporâneo"}, objetivo ${profile?.goal||"presença"}. Análise recente: ${lastAnalysis.slice(0,300)}. Gere 8 produtos variados e específicos.` }],
        maxTokens: 1200,
      });
      let parsed;
      try { parsed = JSON.parse(raw.replace(/```json|```/g,"").trim()); } catch { parsed = []; }
      // Attach mock images
      const withImages = parsed.map((p, i) => ({ ...p, image: MOCK_PRODUCT_IMAGES[i % MOCK_PRODUCT_IMAGES.length] }));
      setProducts(withImages);
      LS.set(key, withImages);
      toast("Produtos atualizados ✦");
      push("product_drop", "Novos produtos para você", `${withImages.length} sugestões baseadas no seu estilo`);
    } catch { toast("Erro ao gerar produtos."); }
    setLoading(false);
  };

  // Auto-load on first visit
  useEffect(() => { if (!products && !loading) genProducts(); }, []);

  const toggleWishlist = (id) => {
    const updated = wishlist.includes(id) ? wishlist.filter(x => x !== id) : [...wishlist, id];
    setWishlist(updated); LS.set(`presenca_wishlist_${user.id}`, updated);
  };

  const filtered = filter === "all" ? (products||[]) : (products||[]).filter(p => p.category === filter);

  return (
    <div style={{ padding:"0 0 140px" }}>
      <div style={{ padding:"32px 24px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase" }}>Curadoria IA</div>
            <h2 style={{ fontSize:26, fontFamily:"'Syne',sans-serif", fontWeight:500, lineHeight:1.2 }}>Seu estilo,<br />materializado.</h2>
          </div>
          <button onClick={genProducts} disabled={loading} style={{ padding:"9px 14px", background:"var(--surface2)", border:"none", borderRadius:20, fontSize:10, color:"#fff", letterSpacing:1.5, textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
            {loading ? <Dots color="#fff" /> : <><Icon n="refresh" size={11} color="#fff" /> Atualizar</>}
          </button>
        </div>

        {/* Wishlist count */}
        {wishlist.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, padding:"10px 14px", background:"rgba(248,113,113,.1)", borderRadius:12, border:"1px solid #ffe0e0" }}>
            <Icon n="heart" size={14} color="#e05252" />
            <span style={{ fontSize:12, color:"var(--red)" }}>{wishlist.length} {wishlist.length===1?"item salvo":"itens salvos"} na wishlist</span>
          </div>
        )}

        {/* Category filter */}
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, marginBottom:20 }}>
          {categories.map(c => (
            <button key={c} onClick={() => setFilter(c)} style={{ padding:"7px 14px", background:filter===c?"#1a1a1a":"#f0f0f0", border:"none", borderRadius:20, fontSize:11, color:filter===c?"#fff":"#888", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all .15s", letterSpacing:.5, textTransform:"capitalize" }}>
              {c === "all" ? "Tudo" : c === "tops" ? "Camisas" : c === "bottoms" ? "Calças" : c === "shoes" ? "Sapatos" : c === "accessories" ? "Acessórios" : "Jaquetas"}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      {loading && !products ? (
        <div style={{ textAlign:"center", padding:"60px 24px" }}>
          <Dots /><p style={{ marginTop:16, fontSize:13, color:"var(--text2)" }}>Gerando sugestões para o seu estilo…</p>
        </div>
      ) : (
        <div style={{ padding:"0 16px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {filtered.map((p, i) => (
            <ProductCard key={p.id||i} product={p} wishlisted={wishlist.includes(p.id)} onWishlist={() => toggleWishlist(p.id)} toast={toast} />
          ))}
          {filtered.length === 0 && <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"40px 0", color:"var(--text3)", fontSize:13 }}>Nenhum produto nessa categoria.</div>}
        </div>
      )}

      {/* Integration note */}
      <div style={{ margin:"20px 16px 0", background:"rgba(96,165,250,.1)", borderRadius:16, padding:"16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
          <Icon n="zap" size={14} color="#0ea5e9" />
          <span style={{ fontSize:12, fontWeight:500, color:"var(--blue)" }}>Conectar loja real</span>
        </div>
        <p style={{ fontSize:11, color:"#0284c7", lineHeight:1.6, margin:0 }}>
          Integre Shopify Storefront API ou Amazon Product Advertising API para mostrar produtos reais com preços e links de compra ao vivo.
        </p>
        <div style={{ display:"flex", gap:8, marginTop:10 }}>
          {["Shopify API", "Amazon PA-API", "Mercado Livre"].map(api => (
            <div key={api} style={{ padding:"4px 10px", background:"var(--surface)", border:"1px solid #bae6fd", borderRadius:20, fontSize:10, color:"#0284c7" }}>{api}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, wishlisted, onWishlist, toast }) {
  const [imgErr, setImgErr] = useState(false);
  const hasDiscount = !!product.originalPrice;

  return (
    <div style={{ background:"var(--surface)", borderRadius:16, overflow:"hidden", border:"1px solid var(--border)", transition:"box-shadow .2s", animation:"fadeIn .4s ease" }}>
      {/* Image */}
      <div style={{ position:"relative", height:160, background:"var(--surface2)" }}>
        {!imgErr ? (
          <img src={product.image} alt={product.name} onError={() => setImgErr(true)}
            style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
        ) : (
          <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon n="shop" size={28} color="#ddd" />
          </div>
        )}
        {/* Wishlist btn */}
        <button onClick={onWishlist} style={{ position:"absolute", top:8, right:8, width:30, height:30, borderRadius:15, background:"rgba(255,255,255,.9)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }}>
          <Icon n="heart" size={14} color={wishlisted?"#e05252":"#ccc"} />
        </button>
        {hasDiscount && <div style={{ position:"absolute", top:8, left:8, background:"#e05252", color:"#fff", fontSize:9, letterSpacing:1, padding:"3px 8px", borderRadius:10 }}>DESCONTO</div>}
      </div>

      {/* Content */}
      <div style={{ padding:"12px" }}>
        <div style={{ fontSize:9, letterSpacing:2, color:"var(--text3)", textTransform:"uppercase", marginBottom:3 }}>{product.brand}</div>
        <div style={{ fontSize:13, fontWeight:500, color:"var(--text)", marginBottom:6, lineHeight:1.3 }}>{product.name}</div>
        <div style={{ fontSize:11, color:"var(--text2)", lineHeight:1.4, marginBottom:8 }}>{product.why}</div>

        {/* Tags */}
        {product.tags?.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:8 }}>
            {product.tags.slice(0,2).map(t => (
              <div key={t} style={{ padding:"2px 7px", background:"var(--surface2)", borderRadius:10, fontSize:9, color:"var(--text2)", letterSpacing:.5 }}>{t}</div>
            ))}
          </div>
        )}

        {/* Price + CTA */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--text)" }}>{product.price}</div>
            {hasDiscount && <div style={{ fontSize:10, color:"var(--text3)", textDecoration:"line-through" }}>{product.originalPrice}</div>}
          </div>
          <button onClick={() => toast("Redirecionando para a loja… ✦")} style={{ padding:"7px 12px", background:"var(--surface2)", border:"none", borderRadius:20, fontSize:10, color:"#fff", cursor:"pointer", letterSpacing:1, display:"flex", alignItems:"center", gap:4 }}>
            Ver <Icon n="external" size={10} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLIST TAB (with social share + push)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT TAB (with push on reply)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE TAB
// ═══════════════════════════════════════════════════════════════════════════════
// ── ReferralModal ─────────────────────────────────────────────────────────────
function ReferralModal({ user, onClose, toast }) {
  const refKey  = `presenca_referrals_${user.id}`;
  const refCode = `PRESENCA-${user.id.slice(-6).toUpperCase()}`;
  const referrals = LS.get(refKey, []);
  const [copied, setCopied] = useState(false);

  // Simulate a referral being accepted (demo)
  const simulateReferral = () => {
    const names = ["Lucas","Ana","Pedro","Julia","Carlos","Mariana","Felipe","Beatriz"];
    const name = names[Math.floor(Math.random() * names.length)];
    const entry = { id: uid(), name, date: new Date().toISOString(), rewarded: true };
    const updated = [entry, ...referrals];
    LS.set(refKey, updated);
    toast(`${name} entrou pelo seu link! +30 dias Premium ✦`);
    onClose();
  };

  const shareText = `Ei! Tô usando o Presença — um app que te ajuda a se vestir bem, treinar e se cuidar com IA. Entra com meu código e a gente ganha 30 dias Premium de graça!\n\nMeu código: ${refCode}\n\nBaixa o app: presenca.app`;

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title:"Presença ✦", text:shareText }); return; } catch {}
    }
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast("Link copiado! Manda no WhatsApp ✦");
    });
  };

  const daysEarned = referrals.filter(r => r.rewarded).length * 30;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:700, background:"rgba(0,0,0,.85)", display:"flex", alignItems:"flex-end", backdropFilter:"blur(8px)" }}>
      <div style={{ background:"var(--surface)", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"28px 24px 48px", animation:"slideUp .35s ease" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:3, color:"var(--accent)", textTransform:"uppercase", marginBottom:5, fontFamily:"'Syne',sans-serif" }}>Indicações</div>
            <h3 style={{ fontSize:22, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", lineHeight:1.1 }}>
              Chame um amigo,<br />
              <span style={{ background:"linear-gradient(90deg,var(--accent),var(--accent2))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                os dois ganham.
              </span>
            </h3>
          </div>
          <button onClick={onClose} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:100, padding:"6px 10px", cursor:"pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* How it works */}
        <div style={{ display:"flex", gap:10, marginBottom:20 }}>
          {[
            { n:"1", label:"Manda seu código para um amigo", color:"var(--accent)" },
            { n:"2", label:"Ele entra no Presença com seu código", color:"var(--blue)" },
            { n:"3", label:"Vocês dois ganham 30 dias Premium", color:"var(--green)" },
          ].map(s => (
            <div key={s.n} style={{ flex:1, background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:14, padding:"12px 10px", textAlign:"center" }}>
              <div style={{ width:24, height:24, borderRadius:12, background:s.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#000", margin:"0 auto 8px", fontFamily:"'Syne',sans-serif" }}>{s.n}</div>
              <div style={{ fontSize:10, color:"var(--text2)", lineHeight:1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Code card */}
        <div style={{ background:"linear-gradient(135deg,rgba(201,169,110,.15),rgba(201,169,110,.07))", border:"1px solid rgba(201,169,110,.3)", borderRadius:16, padding:"16px 20px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:2, color:"var(--text3)", textTransform:"uppercase", marginBottom:4 }}>Seu código</div>
            <div style={{ fontSize:22, fontFamily:"'Syne',sans-serif", fontWeight:800, color:"var(--accent)", letterSpacing:2 }}>{refCode}</div>
          </div>
          <button onClick={() => {
            navigator.clipboard.writeText(refCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast("Código copiado! ✦");
          }} style={{ padding:"9px 16px", background:copied?"var(--green)":"var(--surface3)", border:"1px solid var(--border)", borderRadius:100, fontSize:11, color:copied?"#000":"var(--text2)", cursor:"pointer", fontWeight:600, transition:"all .2s" }}>
            {copied ? "✓ Copiado!" : "Copiar"}
          </button>
        </div>

        {/* Stats */}
        {referrals.length > 0 && (
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            <div style={{ flex:1, background:"var(--surface2)", borderRadius:14, padding:"12px", textAlign:"center" }}>
              <div style={{ fontSize:24, fontWeight:800, color:"var(--text)", fontFamily:"'Syne',sans-serif" }}>{referrals.length}</div>
              <div style={{ fontSize:10, color:"var(--text3)" }}>amigos indicados</div>
            </div>
            <div style={{ flex:1, background:"rgba(62,207,142,.08)", border:"1px solid rgba(62,207,142,.2)", borderRadius:14, padding:"12px", textAlign:"center" }}>
              <div style={{ fontSize:24, fontWeight:800, color:"var(--green)", fontFamily:"'Syne',sans-serif" }}>{daysEarned}</div>
              <div style={{ fontSize:10, color:"rgba(62,207,142,.7)" }}>dias Premium ganhos</div>
            </div>
          </div>
        )}

        {/* History */}
        {referrals.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, letterSpacing:2, color:"var(--text3)", textTransform:"uppercase", marginBottom:8, fontFamily:"'Syne',sans-serif" }}>Últimas indicações</div>
            {referrals.slice(0,3).map(r => (
              <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                <div style={{ width:32, height:32, borderRadius:16, background:"linear-gradient(135deg,var(--accent),var(--accent2))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#000", flexShrink:0 }}>{r.name[0]}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:500, color:"var(--text)" }}>{r.name} entrou no Presença</div>
                  <div style={{ fontSize:10, color:"var(--text3)" }}>{new Date(r.date).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</div>
                </div>
                <div style={{ fontSize:10, color:"var(--green)", fontWeight:600 }}>+30 dias ✓</div>
              </div>
            ))}
          </div>
        )}

        {/* Share button */}
        <button onClick={share} style={{
          width:"100%", padding:"16px",
          background:"linear-gradient(135deg,#c9a96e,#b8943d)",
          border:"none", borderRadius:100, fontSize:13, color:"#000",
          fontWeight:800, cursor:"pointer", fontFamily:"'Syne',sans-serif",
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          boxShadow:"0 4px 24px rgba(201,169,110,.3)"
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Compartilhar no WhatsApp
        </button>

        <p style={{ fontSize:10, color:"var(--text3)", textAlign:"center", marginTop:10, lineHeight:1.5 }}>
          Sem limite de indicações. Cada amigo que entrar = +30 dias Premium para você e para ele.
        </p>
      </div>
    </div>
  );
}

function ProfileTab({ user, profile, setProfile, isPremium, onPaywall, onLogout, toast, push }) {
  const [showAdmin, setShowAdmin]   = useState(false);
  const [adminKey, setAdminKey]     = useState(() => localStorage.getItem("presenca_gemini_key") || "");
  const [adminPass, setAdminPass]   = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const ADMIN_PASS = "presenca2025";
  const [editing, setEditing]       = useState(false);
  const [editName, setEditName]     = useState(user?.name || "");
  const [showBadges, setShowBadges] = useState(false);
  const [showReferral, setShowReferral] = useState(false);

  // Stats
  const analyses    = LS.get(`presenca_analyses_${user.id}`, []).length;
  const gymData     = LS.get(`presenca_gym_${user.id}`, {});
  const gymStreak   = gymData.streak || 0;
  const barbData    = LS.get(`presenca_barb_${user.id}`, {});
  const unlockedBadges = getUnlockedBadges(user.id);
  const totalXP     = getTotalXP(user.id);
  const planProg    = LS.get(`presenca_plan_prog_${user.id}`, {});
  const plan        = LS.get(`presenca_plan_${user.id}`, null);
  const doneTasks   = Object.values(planProg).filter(v => v?.done).length;
  const totalTasks  = (plan || { semanas:[{dias:Array(7)}] }).semanas?.flatMap(s=>s.dias).length || 7;
  const wardrobe    = LS.get(`presenca_wardrobe_${user.id}`, []);

  // Presença score dimensions
  const styleScore  = Math.min(100, analyses * 12 + unlockedBadges.length * 3);
  const gymScore    = Math.min(100, gymStreak * 5 + (gymData.biotype?20:0) + (gymData.modality?15:0));
  const groomScore  = Math.min(100, (barbData.faceShape?30:0) + (LS.get(`presenca_barb_hist_${user.id}`,[]).length * 10));
  const totalScore  = Math.round((styleScore + gymScore + groomScore) / 3);
  const scoreLabel  = totalScore >= 80 ? "Elite" : totalScore >= 60 ? "Refinado" : totalScore >= 40 ? "Evoluindo" : "Iniciante";
  const scoreColor  = totalScore >= 80 ? "var(--accent)" : totalScore >= 60 ? "var(--green)" : totalScore >= 40 ? "var(--orange)" : "var(--text3)";

  const saveProfile = () => {
    const updated = { ...user, name: editName };
    LS.set("presenca_user", updated);
    window.location.reload();
  };

  const styleLabels = { "simples e limpo":"Simples", classico:"Clássico", contemporaneo:"Moderno", ousado:"Ousado" };
  const goalLabels  = { presenca:"Presença", autoconhecimento:"Autoconhecimento", estilo:"Estilo", habitos:"Hábitos" };
  const toneLabels  = { direto:"Direto", filosofico:"Filosófico", motivador:"Motivador", analitico:"Analítico" };

  if (showBadges) return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
        <button onClick={()=>setShowBadges(false)} style={{ background:"none",border:"none",cursor:"pointer",padding:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style={{ fontSize:20, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"var(--text)" }}>Badges · {unlockedBadges.length}/{BADGES.length}</h2>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
        {BADGES.map((b, i) => {
          const unlocked = unlockedBadges.find(u => u.id === b.id);
          return (
            <div key={b.id} style={{ background:"var(--surface)", border:`1px solid ${unlocked?"rgba(201,169,110,.25)":"var(--border)"}`, borderRadius:14, padding:"14px 10px", textAlign:"center", opacity:unlocked?1:.35, animation:`fadeIn .3s ease ${i*.04}s both` }}>
              <div style={{ fontSize:26, marginBottom:6 }}>{b.emoji}</div>
              <div style={{ fontSize:10, fontWeight:600, color:unlocked?"var(--accent)":"var(--text2)", lineHeight:1.3, marginBottom:3 }}>{b.name}</div>
              {unlocked && <div style={{ fontSize:9, color:"var(--green)" }}>+{b.xp} XP</div>}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ padding:"0 24px 140px" }}>
      {/* Header */}
      <div style={{ paddingTop:32, marginBottom:24 }}>
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:10, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>Eu</div>
        <h2 style={{ fontSize:28, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", lineHeight:1.15 }}>
          Olá,<br />
          <span style={{ background:"linear-gradient(90deg,var(--accent),var(--accent2))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            {user?.name?.split(" ")[0] || "você"}.
          </span>
        </h2>
      </div>

      {/* ── Card do usuário ── */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:18, padding:"16px 18px", marginBottom:12, display:"flex", alignItems:"center", gap:14 }}>
        <div style={{ width:52, height:52, borderRadius:26, background:"linear-gradient(135deg,var(--accent),var(--accent2))", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700, color:"#000", flexShrink:0, fontFamily:"'Syne',sans-serif" }}>
          {user?.provider==="google"
            ? <svg width="22" height="22" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            : user?.provider==="apple"
            ? <svg width="18" height="18" viewBox="0 0 814 1000" fill="#000"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-36.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.8 131.5-318.3 261.5-318.3 66.6 0 122.3 43.4 164.4 43.4 40.4 0 103.3-46.1 174.7-46.1 28 0 108.2 2.6 168.2 101.4zm-249.3-57.2c31.4-38.5 53.2-91.8 53.2-145.1 0-7.4-.6-14.9-1.9-21.1-50.5 1.9-110.2 33.8-146.5 78.2-28.7 33.2-55.8 86.5-55.8 140.4 0 8.3 1.3 16.6 1.9 19.2 3.2.6 8.3 1.3 13.5 1.3 45.1 0 102.2-30.2 135.6-72.9z"/></svg>
            : (user?.name?.[0] || "?").toUpperCase()
          }
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          {editing ? (
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={editName} onChange={e=>setEditName(e.target.value)}
                style={{ flex:1, padding:"8px 12px", background:"var(--surface2)", border:"1px solid var(--accent)", borderRadius:10, fontSize:14, color:"var(--text)", outline:"none", fontFamily:"'Inter',sans-serif" }} />
              <button onClick={saveProfile} style={{ padding:"8px 14px", background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", borderRadius:20, fontSize:11, color:"#000", cursor:"pointer", fontWeight:700 }}>Salvar</button>
              <button onClick={()=>setEditing(false)} style={{ padding:"8px 12px", background:"var(--surface2)", border:"none", borderRadius:20, fontSize:11, color:"var(--text2)", cursor:"pointer" }}>×</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize:16, fontWeight:600, color:"var(--text)", fontFamily:"'Syne',sans-serif", marginBottom:2 }}>{user?.name}</div>
              <div style={{ fontSize:12, color:"var(--text3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user?.email}</div>
            </>
          )}
        </div>
        {!editing && (
          <button onClick={()=>setEditing(true)} style={{ background:"none", border:"1px solid var(--border)", borderRadius:100, padding:"6px 12px", cursor:"pointer", fontSize:11, color:"var(--text2)" }}>Editar</button>
        )}
      </div>

      {/* ── Evolução total ── */}
      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:18, padding:"18px 20px", marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:9, letterSpacing:3, color:"var(--text3)", textTransform:"uppercase", marginBottom:6, fontFamily:"'Syne',sans-serif" }}>Evolução total</div>
            <div style={{ fontSize:36, fontFamily:"'Syne',sans-serif", fontWeight:800, color:scoreColor, lineHeight:1 }}>{totalScore}</div>
            <div style={{ fontSize:12, color:scoreColor, marginTop:4, fontWeight:600 }}>{scoreLabel}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--accent)", fontFamily:"'Syne',sans-serif" }}>{totalXP} XP</div>
            <div style={{ fontSize:10, color:"var(--text3)", marginTop:2 }}>{unlockedBadges.length} badges</div>
          </div>
        </div>
        {[
          { label:"Estilo",   value:styleScore,  color:"var(--accent)" },
          { label:"Físico",   value:gymScore,    color:"var(--orange)" },
          { label:"Grooming", value:groomScore,  color:"var(--blue)"   },
        ].map(d => (
          <div key={d.label} style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
              <div style={{ fontSize:10, color:"var(--text3)", letterSpacing:1, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>{d.label}</div>
              <div style={{ fontSize:10, color:d.value>0?d.color:"var(--text3)", fontWeight:600 }}>{d.value}</div>
            </div>
            <div style={{ height:4, background:"var(--surface2)", borderRadius:2, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${d.value}%`, background:d.color, borderRadius:2, transition:"width .8s ease", opacity:d.value>0?1:.3 }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Atalhos úteis ── */}
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
        {[
          {
            label:"Meu guarda-roupa",
            sub: wardrobe.length > 0 ? `${wardrobe.length} peça${wardrobe.length>1?"s":""} cadastrada${wardrobe.length>1?"s":""}` : "Cadastre suas roupas",
            icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="3" x2="8" y2="21"/></svg>,
            action:() => { window.__presencaEstiloSection="guardaroupa"; window.__presencaSetTab?.("MeuEstilo"); }
          },
          {
            label:"Plano da semana",
            sub: `${doneTasks}/${totalTasks} tarefas concluídas`,
            icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>,
            action:() => window.__presencaSetTab?.("Plano")
          },
          {
            label:"Meu progresso",
            sub: `${analyses} análise${analyses!==1?"s":""} · ${gymStreak} dias de streak`,
            icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
            action:() => window.__presencaSetTab?.("Stats")
          },
          {
            label:"Badges",
            sub: `${unlockedBadges.length} de ${BADGES.length} desbloqueados`,
            icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>,
            action:() => setShowBadges(true)
          },
          {
            label:"Indicar amigos",
            sub:"Você e o amigo ganham 30 dias Premium grátis",
            highlight: true,
            icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
            action:() => setShowReferral(true)
          },
        ].map((item, i) => (
          <button key={item.label} onClick={item.action}
            style={{ display:"flex", alignItems:"center", gap:14, background:item.highlight?"linear-gradient(135deg,rgba(201,169,110,.1),rgba(201,169,110,.05))":"var(--surface)", border:`1px solid ${item.highlight?"rgba(201,169,110,.25)":"var(--border)"}`, borderRadius:14, padding:"14px 16px", cursor:"pointer", textAlign:"left", width:"100%", animation:`fadeIn .3s ease ${i*.06}s both` }}>
            <div style={{ width:36, height:36, borderRadius:10, background:item.highlight?"rgba(201,169,110,.15)":"var(--surface2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {item.icon}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:item.highlight?"var(--accent)":"var(--text)", fontFamily:"'Syne',sans-serif" }}>{item.label}</div>
              <div style={{ fontSize:11, color:"var(--text3)", marginTop:2 }}>{item.sub}</div>
            </div>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={item.highlight?"var(--accent)":"var(--text3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
      </div>

      {/* ── Perfil de estilo ── */}
      {profile && (
        <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"16px 18px", marginBottom:12 }}>
          <div style={{ fontSize:9, letterSpacing:3, color:"var(--text3)", textTransform:"uppercase", marginBottom:12, fontFamily:"'Syne',sans-serif" }}>Seu perfil</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {[
              profile.style && (styleLabels[profile.style] || profile.style),
              profile.goal  && (goalLabels[profile.goal]   || profile.goal),
              profile.tone  && (toneLabels[profile.tone]   || profile.tone),
            ].filter(Boolean).map(tag => (
              <div key={tag} style={{ padding:"5px 12px", background:"rgba(201,169,110,.1)", border:"1px solid rgba(201,169,110,.2)", borderRadius:100, fontSize:11, color:"var(--accent)", fontWeight:500 }}>
                {tag}
              </div>
            ))}
            <button onClick={() => { LS.del(`presenca_profile_${user.id}`); window.location.reload(); }}
              style={{ padding:"5px 12px", background:"transparent", border:"1px solid var(--border)", borderRadius:100, fontSize:11, color:"var(--text3)", cursor:"pointer" }}>
              Refazer
            </button>
          </div>
        </div>
      )}

      {/* ── Premium ── */}
      {!isPremium && (
        <div onClick={onPaywall} style={{ background:"linear-gradient(135deg,rgba(201,169,110,.12),rgba(201,169,110,.06))", border:"1px solid rgba(201,169,110,.2)", borderRadius:16, padding:"16px 18px", marginBottom:12, cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, color:"var(--accent)", fontFamily:"'Syne',sans-serif" }}>Assinar Premium</div>
            <div style={{ fontSize:11, color:"rgba(201,169,110,.6)" }}>Análises ilimitadas + plano personalizado por IA</div>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      )}

      {/* ── Sair ── */}
      <button onClick={onLogout} style={{ width:"100%", padding:"14px", background:"transparent", border:"1px solid var(--border)", borderRadius:100, fontSize:12, color:"var(--text3)", cursor:"pointer", fontFamily:"'Inter',sans-serif" }}>
        Sair da conta
      </button>

      {/* ── Admin oculto — toque 5x no rodapé ── */}
      <div style={{ textAlign:"center", marginTop:16, paddingBottom:8 }}>
        <span onDoubleClick={() => setShowAdmin(true)} style={{ fontSize:10, color:"var(--surface3)", cursor:"default", userSelect:"none" }}>
          v1.0 ✦
        </span>
      </div>

      {/* Referral modal */}
      {showReferral && <ReferralModal user={user} onClose={() => setShowReferral(false)} toast={toast} />}

      {/* Admin modal */}
      {showAdmin && (
        <div style={{ position:"fixed", inset:0, zIndex:900, background:"rgba(0,0,0,.9)", display:"flex", alignItems:"flex-end", backdropFilter:"blur(10px)" }}>
          <div style={{ background:"var(--surface)", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"28px 24px 48px", animation:"slideUp .3s ease" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div>
                <div style={{ fontSize:10, letterSpacing:3, color:"var(--accent)", textTransform:"uppercase", marginBottom:3, fontFamily:"'Syne',sans-serif" }}>Administrador</div>
                <div style={{ fontSize:18, fontWeight:700, color:"var(--text)", fontFamily:"'Syne',sans-serif" }}>Configurações</div>
              </div>
              <button onClick={() => { setShowAdmin(false); setAdminPass(""); setAdminUnlocked(false); }} style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:100, padding:"6px 12px", cursor:"pointer", fontSize:12, color:"var(--text2)" }}>
                Fechar
              </button>
            </div>

            {!adminUnlocked ? (
              <>
                <div style={{ fontSize:13, color:"var(--text2)", marginBottom:14 }}>Digite a senha de administrador para continuar.</div>
                <input value={adminPass} onChange={e => setAdminPass(e.target.value)} type="password" placeholder="Senha admin"
                  style={{ width:"100%", padding:"13px 16px", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:12, fontSize:14, color:"var(--text)", outline:"none", fontFamily:"'Inter',sans-serif", marginBottom:12 }} />
                <button onClick={() => {
                  if (adminPass === ADMIN_PASS) { setAdminUnlocked(true); setAdminPass(""); }
                  else { toast("Senha incorreta"); setAdminPass(""); }
                }} style={{ width:"100%", padding:"14px", background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", borderRadius:100, fontSize:13, color:"#000", fontWeight:700, cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>
                  Entrar
                </button>
              </>
            ) : (
              <>
                {/* Chave do Gemini */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--text2)", marginBottom:6 }}>Chave da API Gemini</div>
                  <div style={{ fontSize:11, color:"var(--text3)", marginBottom:10, lineHeight:1.5 }}>
                    Acesse aistudio.google.com → Get API Key → Create API Key
                  </div>
                  <input value={adminKey} onChange={e => setAdminKey(e.target.value)} placeholder="AIzaSy... ou AQ.Ab8..." type="password"
                    style={{ width:"100%", padding:"13px 16px", background:"var(--surface2)", border:`1px solid ${adminKey ? "var(--accent)" : "var(--border2)"}`, borderRadius:12, fontSize:13, color:"var(--text)", outline:"none", fontFamily:"'Inter',sans-serif", marginBottom:10 }} />

                  {adminKey && (
                    <div style={{ fontSize:11, color:"var(--accent)", marginBottom:10 }}>
                      ✦ Chave: ...{adminKey.slice(-8)}
                    </div>
                  )}

                  <button onClick={() => {
                    if (!adminKey.trim()) { toast("Digite a chave primeiro"); return; }
                    localStorage.setItem("presenca_gemini_key", adminKey.trim());
                    toast("Chave salva! IA ativada ✦");
                    setShowAdmin(false);
                    setAdminUnlocked(false);
                    setTimeout(() => window.location.reload(), 1000);
                  }} style={{ width:"100%", padding:"14px", background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", borderRadius:100, fontSize:13, color:"#000", fontWeight:700, cursor:"pointer", fontFamily:"'Syne',sans-serif", marginBottom:10 }}>
                    ✦ Salvar e ativar IA
                  </button>

                  {localStorage.getItem("presenca_gemini_key") && (
                    <button onClick={() => {
                      localStorage.removeItem("presenca_gemini_key");
                      setAdminKey("");
                      toast("Chave removida");
                    }} style={{ width:"100%", padding:"12px", background:"transparent", border:"1px solid var(--border)", borderRadius:100, fontSize:11, color:"var(--red)", cursor:"pointer" }}>
                      Remover chave
                    </button>
                  )}
                </div>

                {/* Status da IA */}
                <div style={{ background: localStorage.getItem("presenca_gemini_key") ? "rgba(62,207,142,.08)" : "rgba(248,113,113,.08)", border:`1px solid ${localStorage.getItem("presenca_gemini_key") ? "rgba(62,207,142,.2)" : "rgba(248,113,113,.2)"}`, borderRadius:12, padding:"12px 16px" }}>
                  <div style={{ fontSize:12, fontWeight:600, color: localStorage.getItem("presenca_gemini_key") ? "var(--green)" : "var(--red)" }}>
                    {localStorage.getItem("presenca_gemini_key") ? "✓ IA ativada e funcionando" : "✗ IA não configurada"}
                  </div>
                  <div style={{ fontSize:11, color:"var(--text3)", marginTop:3 }}>
                    {localStorage.getItem("presenca_gemini_key") ? "Gemini 2.0 Flash · Grátis até 1.500 req/dia" : "Configure a chave acima para ativar"}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING + AUTH + PAYWALL (compact)
// ═══════════════════════════════════════════════════════════════════════════════
function Onboarding({ user, onDone }) {
  const [phase, setPhase]   = useState("questions"); // questions | wow | done
  const [step, setStep]     = useState(0);
  const [answers, setAnswers] = useState({});
  const [vis, setVis]       = useState(true);
  const [wowStep, setWowStep] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [wowResult, setWowResult]   = useState(null);

  const cur = OB_STEPS_V2[step];

  const select = (val) => {
    const next = { ...answers, [cur.key]: val };
    setAnswers(next);
    if (step < OB_STEPS_V2.length - 1) {
      setVis(false);
      setTimeout(() => { setStep(s => s + 1); setVis(true); }, 200);
    } else {
      // Save profile and go to wow moment
      LS.set(`presenca_profile_${user.id}`, next);
      setPhase("wow");
    }
  };

  // WOW steps — show 3 quick previews of what the app does
  const wowSteps = [
    {
      emoji:"👔",
      title:"Outfit do dia",
      desc:"A IA monta 3 looks com as roupas que você já tem em casa.",
      demo: (
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:16 }}>
          {[
            { look:"Look casual", pecas:"Camiseta branca + calça jeans + tênis preto", tag:"Para o dia a dia" },
            { look:"Look trabalho", pecas:"Camisa social + calça chino + sapato marrom", tag:"Para reuniões" },
            { look:"Look fim de semana", pecas:"Polo + bermuda + chinelo", tag:"Para relaxar" },
          ].map((l,i) => (
            <div key={i} style={{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)", borderRadius:12, padding:"10px 14px", animation:`fadeIn .4s ease ${i*.12}s both` }}>
              <div style={{ fontSize:10, color:"var(--accent)", letterSpacing:1, textTransform:"uppercase", marginBottom:3, fontFamily:"'Syne',sans-serif" }}>{l.look}</div>
              <div style={{ fontSize:12, color:"var(--text)", lineHeight:1.5 }}>{l.pecas}</div>
              <div style={{ fontSize:9, color:"var(--text3)", marginTop:4 }}>{l.tag}</div>
            </div>
          ))}
        </div>
      )
    },
    {
      emoji:"✂️",
      title:"Briefing do barbeiro",
      desc:"Gera o texto técnico pra você mostrar na barbearia. Nunca mais sai frustrado.",
      demo: (
        <div style={{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(201,169,110,.2)", borderRadius:12, padding:"14px 16px", marginTop:16, animation:"fadeIn .4s ease" }}>
          <div style={{ fontSize:9, letterSpacing:3, color:"var(--accent)", textTransform:"uppercase", marginBottom:8, fontFamily:"'Syne',sans-serif" }}>📱 Mostrar ao barbeiro</div>
          <p style={{ fontSize:14, fontFamily:"'Syne',sans-serif", fontWeight:500, color:"var(--text)", lineHeight:1.7, margin:0 }}>
            "Quero um fade baixo com degradê suave. Topo com textura, comprimento médio. Franja lateral jogada para o lado. Manter natural, sem produto pesado."
          </p>
        </div>
      )
    },
    {
      emoji:"🪞",
      title:"Validar look",
      desc:"Manda foto antes de sair. Em segundos a IA diz se está aprovado.",
      demo: (
        <div style={{ marginTop:16, animation:"fadeIn .4s ease" }}>
          <div style={{ background:"rgba(62,207,142,.08)", border:"1px solid rgba(62,207,142,.2)", borderRadius:12, padding:"14px 16px", marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--green)", fontFamily:"'Syne',sans-serif", marginBottom:6 }}>✦ APROVADO — Pode ir!</div>
            <p style={{ fontSize:12, color:"var(--text2)", margin:0, lineHeight:1.5 }}>O look está equilibrado e adequado para a ocasião. As cores combinam bem e a silhueta está limpa.</p>
          </div>
          <div style={{ background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.2)", borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:12, fontWeight:700, color:"var(--red)", fontFamily:"'Syne',sans-serif", marginBottom:6 }}>✗ AJUSTAR — Tem como melhorar</div>
            <p style={{ fontSize:12, color:"var(--text2)", margin:0, lineHeight:1.5 }}>A camiseta está grande demais para essa ocasião. Troca por uma camisa polo e o look sobe muito.</p>
          </div>
        </div>
      )
    },
  ];

  const currentWow = wowSteps[wowStep];

  // Questions screen
  if (phase === "questions") return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", padding:"0 28px", position:"relative", overflow:"hidden" }}>
      {/* Background glow */}
      <div style={{ position:"absolute", top:"-10%", left:"50%", transform:"translateX(-50%)", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(201,169,110,.06) 0%, transparent 70%)", pointerEvents:"none" }} />

      <div style={{ paddingTop:56, marginBottom:32, position:"relative" }}>
        {/* Logo */}
        <div style={{ fontSize:11, letterSpacing:5, fontWeight:700, fontFamily:"'Syne',sans-serif", background:"linear-gradient(90deg,#c9a96e,#e8c98a)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:32 }}>
          PRESENÇA
        </div>

        {/* Progress */}
        <div style={{ display:"flex", gap:5, marginBottom:28 }}>
          {OB_STEPS_V2.map((_,i) => (
            <div key={i} style={{ flex:1, height:3, borderRadius:2, background:i<=step?"var(--accent)":"var(--surface3)", transition:"background .4s" }} />
          ))}
        </div>

        <div style={{ opacity:vis?1:0, transform:vis?"none":"translateY(10px)", transition:"all .2s" }}>
          <div style={{ fontSize:32, marginBottom:12 }}>{cur.emoji}</div>
          <div style={{ fontSize:10, letterSpacing:3, color:"var(--text3)", textTransform:"uppercase", marginBottom:10, fontFamily:"'Syne',sans-serif" }}>
            {step+1} de {OB_STEPS_V2.length}
          </div>
          <h2 style={{ fontSize:26, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", lineHeight:1.2, marginBottom:6 }}>{cur.title}</h2>
          <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.5 }}>{cur.subtitle}</p>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10, opacity:vis?1:0, transform:vis?"none":"translateY(14px)", transition:"all .22s", position:"relative" }}>
        {cur.options.map((opt, i) => (
          <button key={opt.value} onClick={() => select(opt.value)}
            style={{ padding:"16px 20px", background:answers[cur.key]===opt.value?"linear-gradient(135deg,rgba(201,169,110,.2),rgba(201,169,110,.1))":"var(--surface)", border:`1.5px solid ${answers[cur.key]===opt.value?"var(--accent)":"var(--border)"}`, borderRadius:16, cursor:"pointer", textAlign:"left", transition:"all .15s", animation:`fadeIn .3s ease ${i*.06}s both` }}>
            <div style={{ fontSize:15, fontWeight:600, color:answers[cur.key]===opt.value?"var(--accent)":"var(--text)", marginBottom:4, fontFamily:"'Syne',sans-serif" }}>{opt.label}</div>
            <div style={{ fontSize:12, color:"var(--text3)", lineHeight:1.4 }}>{opt.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ flex:1 }} />
      <div style={{ padding:"20px 0 40px", textAlign:"center" }}>
        <p style={{ fontSize:11, color:"var(--text3)" }}>Você pode mudar isso depois nas configurações</p>
      </div>
    </div>
  );

  // WOW moment screen
  if (phase === "wow") return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", padding:"0 24px 40px", overflow:"hidden" }}>
      {/* Progress dots */}
      <div style={{ paddingTop:56, display:"flex", justifyContent:"center", gap:8, marginBottom:32 }}>
        {wowSteps.map((_,i) => (
          <div key={i} style={{ width: i===wowStep?24:8, height:8, borderRadius:4, background:i<=wowStep?"var(--accent)":"var(--surface3)", transition:"all .3s ease" }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
        <div style={{ fontSize:40, marginBottom:14, animation:"fadeIn .4s ease" }}>{currentWow.emoji}</div>
        <h2 style={{ fontSize:28, fontFamily:"'Syne',sans-serif", fontWeight:800, color:"var(--text)", lineHeight:1.1, marginBottom:8, animation:"fadeIn .4s ease .05s both" }}>
          {currentWow.title}
        </h2>
        <p style={{ fontSize:14, color:"var(--text2)", lineHeight:1.6, marginBottom:4, animation:"fadeIn .4s ease .1s both" }}>
          {currentWow.desc}
        </p>
        <div style={{ animation:"fadeIn .4s ease .15s both" }}>
          {currentWow.demo}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ paddingTop:24 }}>
        <button onClick={() => {
          if (wowStep < wowSteps.length - 1) {
            setWowStep(s => s + 1);
          } else {
            onDone(answers);
          }
        }} style={{
          width:"100%", padding:"16px",
          background:"linear-gradient(135deg,#c9a96e,#b8943d)",
          border:"none", borderRadius:100,
          fontSize:14, color:"#000", fontWeight:800,
          cursor:"pointer", fontFamily:"'Syne',sans-serif",
          letterSpacing:.5, boxShadow:"0 4px 24px rgba(201,169,110,.3)",
          animation:"fadeIn .4s ease .3s both"
        }}>
          {wowStep < wowSteps.length - 1 ? "Próximo →" : "Entrar no Presença ✦"}
        </button>
        {wowStep > 0 && (
          <button onClick={() => setWowStep(s => s - 1)} style={{ width:"100%", marginTop:10, padding:"12px", background:"transparent", border:"none", cursor:"pointer", fontSize:12, color:"var(--text3)" }}>
            ← Voltar
          </button>
        )}
        <button onClick={() => onDone(answers)} style={{ width:"100%", marginTop:6, padding:"10px", background:"transparent", border:"none", cursor:"pointer", fontSize:12, color:"var(--text3)" }}>
          Pular introdução
        </button>
      </div>
    </div>
  );

  return null;
}

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");

  const handleAuth = async (provider) => {
    setLoading(provider); setError("");
    await new Promise(r => setTimeout(r, 900));
    const id = "user_" + Math.random().toString(36).slice(2,9);
    const displayName = provider === "email"
      ? (name || email.split("@")[0])
      : (provider === "google" ? "Usuário Google" : "Usuário Apple");
    const u = { id, name: displayName, email: email || provider+"@presenca.app", provider };
    LS.set("presenca_user", u);
    onLogin(u);
    setLoading(null);
  };

  return (
    <div style={{
      minHeight:"100vh", background:"var(--bg)",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"40px 28px", position:"relative", overflow:"hidden"
    }}>
      {/* Background glow */}
      <div style={{ position:"absolute", top:"-20%", left:"50%", transform:"translateX(-50%)", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(201,169,110,.08) 0%, transparent 70%)", pointerEvents:"none" }} />

      {/* Logo */}
      <div style={{ marginBottom:48, textAlign:"center" }}>
        <div style={{ fontSize:11, letterSpacing:6, fontWeight:700, fontFamily:"'Syne',sans-serif", background:"linear-gradient(90deg,#c9a96e,#e8c98a)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", marginBottom:12 }}>
          PRESENÇA
        </div>
        <div style={{ fontSize:32, fontFamily:"'Syne',sans-serif", fontWeight:800, color:"var(--text)", lineHeight:1.1, marginBottom:10 }}>
          Sua melhor<br />versão começa aqui.
        </div>
        <div style={{ fontSize:14, color:"var(--text2)", lineHeight:1.6 }}>
          Estilo · Treino · Presença
        </div>
      </div>

      {/* Card */}
      <div style={{
        width:"100%", maxWidth:380,
        background:"var(--surface)",
        border:"1px solid var(--border2)",
        borderRadius:"var(--radius-xl)",
        padding:"28px 24px",
        boxShadow:"0 24px 64px rgba(0,0,0,.5)"
      }}>
        {/* Mode toggle */}
        <div style={{ display:"flex", background:"var(--surface2)", borderRadius:100, padding:3, marginBottom:22 }}>
          {[["signin","Entrar"],["signup","Criar conta"]].map(([m,l]) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex:1, padding:"8px", background:mode===m?"var(--surface3)":"transparent",
              border:"none", borderRadius:100, fontSize:12, fontWeight:500,
              color:mode===m?"var(--text)":"var(--text2)", cursor:"pointer", transition:"all .2s"
            }}>{l}</button>
          ))}
        </div>

        {mode==="signup" && (
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome"
            style={{ width:"100%",padding:"13px 16px",background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:"var(--radius)",fontSize:14,color:"var(--text)",outline:"none",fontFamily:"'Inter',sans-serif",marginBottom:10 }} />
        )}
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"
          style={{ width:"100%",padding:"13px 16px",background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:"var(--radius)",fontSize:14,color:"var(--text)",outline:"none",fontFamily:"'Inter',sans-serif",marginBottom:10 }} />

        {error && <div style={{ fontSize:12,color:"var(--red)",marginBottom:8,padding:"0 4px" }}>{error}</div>}

        <button onClick={() => handleAuth("email")} disabled={!!loading} style={{
          width:"100%",padding:"14px",
          background:"linear-gradient(135deg,#c9a96e,#b8943d)",
          border:"none",borderRadius:100,fontSize:13,color:"#000",
          fontWeight:700,cursor:"pointer",fontFamily:"'Syne',sans-serif",
          letterSpacing:.5,marginBottom:14,display:"flex",alignItems:"center",
          justifyContent:"center",gap:8,
          boxShadow:"0 4px 20px rgba(201,169,110,.3)"
        }}>
          {loading==="email" ? <Dots color="#000" /> : (mode==="signup" ? "Criar conta" : "Entrar")}
        </button>

        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
          <div style={{ flex:1,height:1,background:"var(--border)" }}/>
          <span style={{ fontSize:11,color:"var(--text3)" }}>ou continue com</span>
          <div style={{ flex:1,height:1,background:"var(--border)" }}/>
        </div>

        <div style={{ display:"flex",gap:10 }}>
          {[["google","Google"],["apple","Apple"]].map(([p,l])=>(
            <button key={p} onClick={()=>handleAuth(p)} disabled={!!loading} style={{
              flex:1,padding:"13px",background:"var(--surface2)",border:"1px solid var(--border2)",
              borderRadius:100,fontSize:13,color:"var(--text)",cursor:"pointer",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontWeight:500
            }}>
              {loading===p ? <Dots color="var(--text2)" /> : (
                <>
                  {p==="google" && (
                    <svg width="18" height="18" viewBox="0 0 24 24" style={{flexShrink:0}}>
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {p==="apple" && (
                    <svg width="16" height="16" viewBox="0 0 814 1000" style={{flexShrink:0}} fill="var(--text)">
                      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-36.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.8 131.5-318.3 261.5-318.3 66.6 0 122.3 43.4 164.4 43.4 40.4 0 103.3-46.1 174.7-46.1 28 0 108.2 2.6 168.2 101.4zm-249.3-57.2c31.4-38.5 53.2-91.8 53.2-145.1 0-7.4-.6-14.9-1.9-21.1-50.5 1.9-110.2 33.8-146.5 78.2-28.7 33.2-55.8 86.5-55.8 140.4 0 8.3 1.3 16.6 1.9 19.2 3.2.6 8.3 1.3 13.5 1.3 45.1 0 102.2-30.2 135.6-72.9z"/>
                    </svg>
                  )}
                  {l}
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop:24,fontSize:11,color:"var(--text3)",textAlign:"center",lineHeight:1.6 }}>
        Ao continuar, você concorda com os<br />Termos de Uso e Política de Privacidade.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHALLENGE TRAIL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════


function completeChallenge(userId, trailId, challengeId) {
  const prog = getChallengeProgress(userId);
  if (!prog[trailId]) prog[trailId] = [];
  if (!prog[trailId].includes(challengeId)) prog[trailId].push(challengeId);
  LS.set(`presenca_challenges_${userId}`, prog);
  return prog;
}


// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATED SOCIAL CARD (Stories + hashtags)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// MARKETPLACE
// ═══════════════════════════════════════════════════════════════════════════════
const STYLIST_PROFILES = [
  { id:"s1", name:"Marina Voss",     title:"Stylist Arrojado",  avatar:"M", rating:4.9, reviews:128, verified:true,  specialty:"arrojado, presença executiva",    price_consult:"R$ 180",  online:true  },
  { id:"s2", name:"Rafael Kenzo",    title:"Personal Stylist",   avatar:"R", rating:4.8, reviews:94,  verified:true,  specialty:"minimalismo, cápsula",             price_consult:"R$ 150",  online:false },
  { id:"s3", name:"Isabela Torres",  title:"Consultora de Imagem",avatar:"I",rating:5.0, reviews:67,  verified:true,  specialty:"cores, identidade visual",         price_consult:"R$ 200",  online:true  },
  { id:"s4", name:"André Lumière",   title:"Fashion Director",   avatar:"A", rating:4.7, reviews:156, verified:true,  specialty:"alto padrão, eventos",             price_consult:"R$ 250",  online:false },
];

const LOOKBOOKS = [
  { id:"l1", stylist:"Marina Voss",     title:"Guarda-Roupa Cápsula 2025",    desc:"32 peças, 100 combinações. Look atemporal e funcional.",    price:"R$ 89",  pages:48, style:"simples e limpo",   img:"https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=300&q=80" },
  { id:"l2", stylist:"Rafael Kenzo",    title:"Minimalismo Japonês",          desc:"A estética wabi-sabi aplicada ao guarda-roupa urbano.",     price:"R$ 67",  pages:36, style:"simples e limpo",   img:"https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=300&q=80" },
  { id:"l3", stylist:"Isabela Torres",  title:"Paleta Pessoal: Tons Neutros", desc:"Descubra seus neutros ideais e construa harmonia total.",   price:"R$ 79",  pages:28, style:"cores",         img:"https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=300&q=80" },
  { id:"l4", stylist:"André Lumière",   title:"Black Tie Reimaginado",        desc:"Elegância contemporânea para eventos e ocasiões especiais.", price:"R$ 110", pages:52, style:"arrojado",     img:"https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=300&q=80" },
  { id:"l5", stylist:"Marina Voss",     title:"Street Sofisticado",           desc:"O equilíbrio entre o casual e o refinado no dia a dia.",    price:"R$ 59",  pages:40, style:"contemporâneo", img:"https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=300&q=80" },
  { id:"l6", stylist:"Isabela Torres",  title:"Cores Quentes: Manual",        desc:"Guia completo para dominar o vermelho, terracota e mostarda.", price:"R$ 72", pages:32, style:"cores",        img:"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&q=80" },
];

const ACCESSORIES = [
  { id:"a1", name:"Lenço de Seda Neutro",   brand:"Presença Studio",  price:"R$ 180", category:"lenços",   img:"https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=300&q=80" },
  { id:"a2", name:"Cinto Minimal Couro",    brand:"Presença Studio",  price:"R$ 290", category:"cintos",   img:"https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=300&q=80" },
  { id:"a3", name:"Óculos Oversized",       brand:"Maison Presença",  price:"R$ 420", category:"óculos",   img:"https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=300&q=80" },
  { id:"a4", name:"Bolsa Estruturada Mini", brand:"Presença Studio",  price:"R$ 580", category:"bolsas",   img:"https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&q=80" },
  { id:"a5", name:"Brinco Dourado Slim",    brand:"Maison Presença",  price:"R$ 145", category:"joias",    img:"https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&q=80" },
  { id:"a6", name:"Cachecol Cashmere",      brand:"Presença Studio",  price:"R$ 340", category:"lenços",   img:"https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=300&q=80" },
];


// ═══════════════════════════════════════════════════════════════════════════════
// ANALYTICS DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// REFERRAL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// AFFILIATE E-COMMERCE (enhances existing ShopTab with affiliate links)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// WISHLIST — Central de produtos salvos de todas as fontes
// ═══════════════════════════════════════════════════════════════════════════════

// Shared wishlist key helpers — all sources read/write to same key

// ═══════════════════════════════════════════════════════════════════════════════
// PRICE MONITOR SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

const PRICE_MONITOR_KEY   = (uid) => `presenca_price_monitor_${uid}`;
const PRICE_HISTORY_KEY   = (uid) => `presenca_price_history_${uid}`;
const PRICE_ALERTS_KEY    = (uid) => `presenca_price_alerts_${uid}`;
const DROP_THRESHOLD      = 0.10; // 10% drop triggers alert

// Parse "R$ 1.290" → 1290
function parsePrice(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/[^0-9,.]/g, "").replace(".", "").replace(",", ".")) || 0;
}

// Simulate a price fluctuation for demo purposes
function simulateNewPrice(originalPrice, itemId) {
  // Use itemId as seed for deterministic-ish variation
  const seed = itemId.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const now = Date.now();
  // Cycle through: normal → drop → bigger drop → recovery, period ~60s for demo
  const phase = Math.floor((now / 15000 + seed) % 4);
  const base = originalPrice;
  if (phase === 0) return base;                                 // original
  if (phase === 1) return Math.round(base * 0.88);              // -12%
  if (phase === 2) return Math.round(base * 0.75);              // -25%
  if (phase === 3) return Math.round(base * 0.95);              // -5% (not enough to trigger)
  return base;
}

function formatPrice(num) {
  return `R$ ${num.toLocaleString("pt-BR")}`;
}

function calcDropPct(original, current) {
  if (!original || original === 0) return 0;
  return (original - current) / original;
}

// Get monitor state for all tracked items
function getMonitorState(userId) {
  return LS.get(PRICE_MONITOR_KEY(userId), {});
}

// Get price history for an item
function getPriceHistory(userId, itemId) {
  const all = LS.get(PRICE_HISTORY_KEY(userId), {});
  return all[itemId] || [];
}

// Record a price check
function recordPriceCheck(userId, itemId, price, label) {
  const all = LS.get(PRICE_HISTORY_KEY(userId), {});
  const history = all[itemId] || [];
  const entry = { price, label, ts: Date.now() };
  all[itemId] = [entry, ...history].slice(0, 20); // keep last 20
  LS.set(PRICE_HISTORY_KEY(userId), all);
}

// ─── Price Monitor Hook ────────────────────────────────────────────────────────


const SORT_OPTIONS = [
  { id:"recent",  label:"Recentes"  },
  { id:"price_asc", label:"Menor preço" },
  { id:"price_desc", label:"Maior preço" },
  { id:"source",  label:"Fonte"     },
];

const SOURCE_LABELS = {
  shop:      { label:"Loja IA",     emoji:"🤖", color:"var(--purple)" },
  "guia de looks":  { label:"Guia de Looks",    emoji:"📖", color:"var(--accent)" },
  accessory: { label:"Acessório",   emoji:"💎", color:"var(--green)" },
  affiliate: { label:"Afiliado",    emoji:"🔗", color:"var(--orange)" },
  manual:    { label:"Salvo",       emoji:"🔖", color:"var(--text2)"    },
};


// ═══════════════════════════════════════════════════════════════════════════════
// ACADEMIA MODULE
// ═══════════════════════════════════════════════════════════════════════════════

const BIOTYPES = {
  magrinho:  { label:"Magrinho",  emoji:"🏃", desc:"Magro, metabolismo acelerado, dificuldade em ganhar massa.", tips:"Roupas estruturadas e com volume valorizam a formato do look." },
  atlético:  { label:"Atlético",  emoji:"💪", desc:"Atletico, ganha músculo com facilidade, porte equilibrado.",  tips:"Pode usar cortes mais justos que evidenciam a musculatura." },
  corpulento:  { label:"Corpulento",  emoji:"🏋️", desc:"Corpo mais cheio, fácil acumulação de gordura, estrutura larga.", tips:"Peças de corte reto e cores escuras criam formato do looks elegantes." },
};

const MODALITIES = [
  { id:"musculacao", label:"Musculação",  emoji:"🏋️", color:"var(--text)" },
  { id:"crossfit",   label:"CrossFit",   emoji:"⚡",  color:"var(--orange)" },
  { id:"corrida",    label:"Corrida",    emoji:"🏃",  color:"var(--blue)" },
  { id:"yoga",       label:"Yoga",       emoji:"🧘",  color:"#8b5cf6" },
  { id:"natacao",    label:"Natação",    emoji:"🏊",  color:"#06b6d4" },
  { id:"futebol",    label:"Futebol",    emoji:"⚽",  color:"#22c55e" },
];

const SPORTSWEAR_PRODUCTS = [
  { id:"sw1", name:"Camiseta Dry-Fit Premium",  brand:"Nike",      price:"R$ 189", img:"https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=300&q=80", modality:"musculacao" },
  { id:"sw2", name:"Shorts Compressão 2-em-1",  brand:"Under Armour",price:"R$ 240",img:"https://images.unsplash.com/photo-1591389703635-e15a07b842d7?w=300&q=80", modality:"corrida"    },
  { id:"sw3", name:"Legging High Waist",         brand:"Lululemon",  price:"R$ 480", img:"https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=300&q=80", modality:"yoga"       },
  { id:"sw4", name:"Tênis Training X",           brand:"Adidas",     price:"R$ 550", img:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80", modality:"crossfit"   },
  { id:"sw5", name:"Top Esportivo Costas Nuas",  brand:"Gymshark",   price:"R$ 165", img:"https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&q=80", modality:"musculacao" },
  { id:"sw6", name:"Jaqueta Corta-Vento Slim",   brand:"New Balance",price:"R$ 320", img:"https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=300&q=80", modality:"corrida"    },
];

const GYM_PARTNERS = [
  {
    id:"gp1", name:"Iron House Academia", city:"Taquara", state:"RS",
    logo:"IH", color:"#1a1a2e", verified:true, open:true,
    whatsapp:"5551999990010",
    address:"Rua Independência, 540 — Centro",
    about:"Academia completa com musculação, cardio, lutas e aulas coletivas. Ambiente climatizado e equipamentos de última geração.",
    modalities:["Musculação","CrossFit","Boxe","Spinning","Pilates"],
    plans:[
      { name:"Mensal",  desc:"Acesso livre às dependências", price:"R$ 89",  period:"/mês",   highlight:false },
      { name:"Trimestral", desc:"3 meses + 1 aula avulsa grátis", price:"R$ 79", period:"/mês", highlight:false },
      { name:"Anual",   desc:"Melhor custo-benefício + app",  price:"R$ 59",  period:"/mês",   highlight:true  },
    ],
  },
  {
    id:"gp2", name:"Move Fitness Studio", city:"Igrejinha", state:"RS",
    logo:"MV", color:"var(--green)", verified:true, open:true,
    whatsapp:"5551999990011",
    address:"Av. São Jacinto, 1.100",
    about:"Studio boutique com personal trainer incluso em todos os planos. Turmas reduzidas para melhor resultado.",
    modalities:["Funcional","Yoga","HIIT","Pilates Solo"],
    plans:[
      { name:"Studio",   desc:"Até 8 aulas/mês",               price:"R$ 120", period:"/mês",  highlight:false },
      { name:"Ilimitado",desc:"Aulas ilimitadas + avaliação",   price:"R$ 180", period:"/mês",  highlight:true  },
    ],
  },
  {
    id:"gp3", name:"Titan Gym", city:"Novo Hamburgo", state:"RS",
    logo:"TG", color:"#7c2d12", verified:false, open:false,
    whatsapp:"5551999990012",
    address:"Rua Dr. Maurício Cardoso, 332",
    about:"Musculação com foco em hipertrofia. Equipamentos importados e suplementação no local.",
    modalities:["Musculação","Cardio","Avaliação Física"],
    plans:[
      { name:"Mensal",  desc:"Acesso livre",      price:"R$ 79",  period:"/mês",  highlight:false },
      { name:"Semestral",desc:"6 meses com desconto", price:"R$ 65", period:"/mês", highlight:true },
    ],
  },
];

const PERSONAL_TRAINERS = [
  { id:"pt1", name:"Lucas Ferreira",   city:"Taquara",       avatar:"L", color:"var(--blue)", specialty:"Hipertrofia & Emagrecimento", cref:"CREF 123456-G/RS", experience:"8 anos", whatsapp:"5551999990020", instagram:"@lucasfitcoach",   price:"R$ 120", period:"por sessão",  online:true,  about:"Especialista em transformação corporal e periodização avançada. Atendo presencial e online." },
  { id:"pt2", name:"Ana Paula Ramos",  city:"Igrejinha",     avatar:"A", color:"var(--purple)", specialty:"Funcional & Emagrecimento",  cref:"CREF 234567-G/RS", experience:"5 anos", whatsapp:"5551999990021", instagram:"@anapaulafit",     price:"R$ 100", period:"por sessão",  online:true,  about:"Formada em Ed. Física com pós em Treinamento Funcional. Foco em resultados reais." },
  { id:"pt3", name:"Rodrigo Santos",   city:"Novo Hamburgo", avatar:"R", color:"var(--orange)", specialty:"CrossFit & Performance",     cref:"CREF 345678-G/RS", experience:"10 anos",whatsapp:"5551999990022", instagram:"@rodrigo_cross",    price:"R$ 150", period:"por sessão",  online:false, about:"Level 2 CrossFit Trainer. Preparação para competição e condicionamento de alto nível." },
  { id:"pt4", name:"Camila Duarte",    city:"Gramado",       avatar:"C", color:"var(--green)", specialty:"Yoga & Mobilidade",          cref:"CREF 456789-G/RS", experience:"6 anos", whatsapp:"5551999990023", instagram:"@camilayoga",       price:"R$ 110", period:"por sessão",  online:true,  about:"Instrutora de Yoga e especialista em mobilidade funcional. Atendo grupos e individual." },
];

// ─── PersonaisSection (with rating system) ────────────────────────────────────
function PersonaisSection({ user, toast }) {
  const ratingsKey = `presenca_pt_ratings_${user.id}`;
  const [ratings, setRatings]       = useState(() => LS.get(ratingsKey, {}));
  const [ratingModal, setRatingModal] = useState(null); // { pt, tempStars, tempComment }
  const [expandedPt, setExpandedPt]  = useState(null);

  const submitRating = (ptId, stars, comment) => {
    const updated = {
      ...ratings,
      [ptId]: { stars, comment, date: new Date().toISOString(), userId: user.id, userName: user.name || "Usuário" },
    };
    setRatings(updated);
    LS.set(ratingsKey, updated);
    setRatingModal(null);
    toast("Avaliação enviada ✦");
  };

  const getAvgStars = (ptId) => {
    const r = ratings[ptId];
    return r ? r.stars : null;
  };

  return (
    <div style={{ padding:"0 24px", display:"flex", flexDirection:"column", gap:14 }}>
      {PERSONAL_TRAINERS.map((pt, i) => {
        const myRating  = ratings[pt.id];
        const isExpanded = expandedPt === pt.id;

        return (
          <div key={pt.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:20, overflow:"hidden", animation:`fadeIn .35s ease ${i*.07}s both` }}>
            {/* Header */}
            <div style={{ background:pt.color, padding:"16px 18px", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:52, height:52, borderRadius:16, background:"rgba(255,255,255,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700, color:"#fff", flexShrink:0 }}>{pt.avatar}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"#fff", marginBottom:2 }}>{pt.name}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.65)", marginBottom:2 }}>{pt.specialty}</div>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,.5)" }}>{pt.cref}</div>
                  <div style={{ fontSize:10, color:pt.online?"#a7f3d0":"rgba(255,255,255,.3)" }}>{pt.online?"● Online":"○ Presencial"}</div>
                </div>
              </div>
            </div>

            <div style={{ padding:"16px 18px" }}>
              {/* Info row */}
              <div style={{ display:"flex", gap:12, marginBottom:12, flexWrap:"wrap" }}>
                <div style={{ fontSize:11, color:"var(--text2)" }}>📍 {pt.city}</div>
                <div style={{ fontSize:11, color:"var(--text2)" }}>🏆 {pt.experience} de exp.</div>
                <div style={{ fontSize:11, color:"var(--text2)" }}>{pt.instagram}</div>
              </div>

              <p style={{ fontSize:12, color:"var(--text2)", lineHeight:1.55, marginBottom:12 }}>{pt.about}</p>

              {/* Price */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div>
                  <div style={{ fontSize:18, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"var(--text)" }}>{pt.price}</div>
                  <div style={{ fontSize:10, color:"var(--text3)" }}>{pt.period}</div>
                </div>

                {/* My rating display */}
                {myRating ? (
                  <div style={{ display:"flex", alignItems:"center", gap:6, background:"rgba(217,119,6,.1)", border:"1px solid rgba(217,119,6,.3)", borderRadius:20, padding:"5px 12px" }}>
                    <span style={{ fontSize:12 }}>{"⭐".repeat(myRating.stars)}</span>
                    <button onClick={() => setRatingModal({ pt, tempStars: myRating.stars, tempComment: myRating.comment || "" })}
                      style={{ fontSize:9, color:"#d97706", background:"none", border:"none", cursor:"pointer", letterSpacing:.5 }}>
                      Editar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setRatingModal({ pt, tempStars: 0, tempComment: "" })}
                    style={{ padding:"6px 14px", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:20, fontSize:10, color:"var(--text2)", cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                    ☆ Avaliar
                  </button>
                )}
              </div>

              {/* Expand/collapse details */}
              <button onClick={() => setExpandedPt(isExpanded ? null : pt.id)}
                style={{ width:"100%", padding:"8px", background:"var(--surface)", border:"none", borderRadius:10, fontSize:11, color:"var(--text2)", cursor:"pointer", marginBottom:10, transition:"background .15s" }}>
                {isExpanded ? "Ocultar detalhes ▲" : "Ver avaliações e contato ▼"}
              </button>

              {isExpanded && (
                <div style={{ animation:"fadeIn .25s ease" }}>
                  {/* All ratings */}
                  {Object.entries(ratings).filter(([id]) => id === pt.id).length > 0 ? (
                    <div style={{ background:"var(--surface)", borderRadius:12, padding:"12px 14px", marginBottom:10 }}>
                      <div style={{ fontSize:10, letterSpacing:2, color:"var(--text3)", textTransform:"uppercase", marginBottom:8 }}>Avaliações</div>
                      {Object.entries(ratings).filter(([id]) => id === pt.id).map(([, r]) => (
                        <div key={r.userId} style={{ marginBottom:8 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                            <span style={{ fontSize:12 }}>{"⭐".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</span>
                            <span style={{ fontSize:10, color:"var(--text3)" }}>{r.userName} · {new Date(r.date).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</span>
                          </div>
                          {r.comment && <p style={{ fontSize:12, color:"var(--text3)", margin:"0 0 0 2px", lineHeight:1.5, fontStyle:"italic" }}>"{r.comment}"</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize:12, color:"var(--text3)", textAlign:"center", padding:"10px 0 14px" }}>Seja o primeiro a avaliar este personal.</div>
                  )}

                  {/* WhatsApp CTA */}
                  <button onClick={() => {
                    const msg = encodeURIComponent(`Olá ${pt.name}! Vi seu perfil no app Presença e tenho interesse em treinar com você. ✦`);
                    window.open(`https://wa.me/${pt.whatsapp}?text=${msg}`, "_blank");
                    toast(`Abrindo WhatsApp — ${pt.name} ✦`);
                  }} style={{ width:"100%", padding:"13px", background:"#25d366", border:"none", borderRadius:14, fontSize:12, color:"#fff", cursor:"pointer", fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    💬 Falar no WhatsApp
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* CTA cadastro personal */}
      <div style={{ background:"var(--surface2)", borderRadius:18, padding:"18px 20px", textAlign:"center", border:"1.5px dashed #e0e0e0" }}>
        <div style={{ fontSize:20, marginBottom:8 }}>💪</div>
        <div style={{ fontSize:13, fontWeight:500, color:"var(--text)", marginBottom:4 }}>É personal trainer?</div>
        <div style={{ fontSize:11, color:"var(--text2)", marginBottom:12, lineHeight:1.5 }}>Cadastre-se e receba alunos pelo app.</div>
        <button onClick={() => toast("Em breve: cadastro de personais parceiros ✦")}
          style={{ padding:"10px 20px", background:"var(--surface2)", border:"none", borderRadius:20, fontSize:11, color:"#fff", cursor:"pointer" }}>
          Quero me cadastrar
        </button>
      </div>

      {/* Rating modal */}
      {ratingModal && (
        <RatingModal
          pt={ratingModal.pt}
          initialStars={ratingModal.tempStars}
          initialComment={ratingModal.tempComment}
          onSubmit={(stars, comment) => submitRating(ratingModal.pt.id, stars, comment)}
          onClose={() => setRatingModal(null)}
        />
      )}
    </div>
  );
}

function RatingModal({ pt, initialStars, initialComment, onSubmit, onClose }) {
  const [stars, setStars]     = useState(initialStars);
  const [comment, setComment] = useState(initialComment);
  const [hover, setHover]     = useState(0);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"flex-end", backdropFilter:"blur(4px)" }}>
      <div style={{ background:"var(--surface)", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"28px 24px 44px", animation:"slideUp .3s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", textTransform:"uppercase", marginBottom:3 }}>Avaliar Personal</div>
            <div style={{ fontSize:17, fontFamily:"'Syne',sans-serif", fontWeight:600 }}>{pt.name}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}><Icon n="close" size={18} color="#aaa"/></button>
        </div>

        <div style={{ fontSize:11, color:"var(--text2)", marginBottom:20 }}>{pt.specialty} · {pt.city}</div>

        {/* Stars */}
        <div style={{ fontSize:10, letterSpacing:2, color:"var(--text3)", textTransform:"uppercase", marginBottom:10 }}>Sua nota</div>
        <div style={{ display:"flex", gap:8, marginBottom:20, justifyContent:"center" }}>
          {[1,2,3,4,5].map(n => (
            <button key={n}
              onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
              onClick={() => setStars(n)}
              style={{ fontSize:36, background:"none", border:"none", cursor:"pointer", transition:"transform .1s", transform:(hover||stars)>=n?"scale(1.1)":"scale(1)", filter:(hover||stars)>=n?"none":"grayscale(1) opacity(0.3)" }}>
              ⭐
            </button>
          ))}
        </div>
        {stars > 0 && (
          <div style={{ fontSize:12, color:"var(--accent)", textAlign:"center", marginBottom:16, letterSpacing:.5 }}>
            {["","Ruim","Regular","Bom","Ótimo","Excelente!"][stars]}
          </div>
        )}

        {/* Comment */}
        <div style={{ fontSize:10, letterSpacing:2, color:"var(--text3)", textTransform:"uppercase", marginBottom:8 }}>Comentário (opcional)</div>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Como foi sua experiência com este personal?"
          rows={3}
          style={{ width:"100%", padding:"12px 16px", border:"1.5px solid var(--border2)", borderRadius:12, fontSize:13, outline:"none", fontFamily:"'Inter',sans-serif", resize:"none", marginBottom:16 }} />

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"13px", background:"var(--surface2)", border:"none", borderRadius:14, fontSize:12, cursor:"pointer", color:"var(--text2)" }}>Cancelar</button>
          <button onClick={() => onSubmit(stars, comment)} disabled={stars === 0}
            style={{ flex:2, padding:"13px", background:stars>0?"#1a1a1a":"#e0e0e0", color:stars>0?"#fff":"#aaa", border:"none", borderRadius:14, fontSize:12, cursor:stars>0?"pointer":"default", letterSpacing:.5, fontWeight:500 }}>
            {stars > 0 ? `Enviar avaliação ${["","⭐","⭐⭐","⭐⭐⭐","⭐⭐⭐⭐","⭐⭐⭐⭐⭐"][stars]}` : "Selecione uma nota"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AcademiaTab({ user, profile, isPremium, onPaywall, toast, push, onBadgeCheck }) {
  const progKey = `presenca_gym_${user.id}`;
  const [gymData, setGymData] = useState(() => LS.get(progKey, { streak:0, lastCheckin:null, modality:null }));
  const [section, setSection] = useState("home");
  const inputRef = useRef();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis]   = useState(null);

  const saveGym = (u) => { const updated={...gymData,...u}; setGymData(updated); LS.set(progKey,updated); };

  const doCheckin = () => {
    const today = new Date().toDateString();
    const yest  = new Date(); yest.setDate(yest.getDate()-1);
    const streak = gymData.lastCheckin===yest.toDateString() ? gymData.streak+1 : gymData.lastCheckin===today ? gymData.streak : 1;
    saveGym({ streak, lastCheckin: today });
    toast(`Check-in feito! 🔥 ${streak} dias seguidos`);
    onBadgeCheck?.();
  };

  const analyzePhoto = async (file) => {
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      setAnalyzing(true);
      try {
        const b64 = e.target.result.split(",")[1];
        const res = await callClaude({
          system: `Você é personal trainer e stylist. Analise a foto e responda em português com 3 seções curtas:
**SEU TIPO DE CORPO** — identifique (magrinho/atlético/corpulento) e 1 frase explicando
**LOOKS DE TREINO** — 2 combinações de roupa que ficam bem no seu tipo
**DICA** — 1 conselho prático para treinar e se vestir melhor
Máximo 120 palavras. Linguagem simples, de amigo.`,
          messages:[{role:"user",content:"Analise meu tipo de corpo."}],
          imageBase64:b64, imageType:"image/jpeg",
        });
        setAnalysis(res);
        toast("Análise salva ✦");
        onBadgeCheck?.();
      } catch { toast("Erro. Tente novamente."); }
      setAnalyzing(false);
    };
    reader.readAsDataURL(file);
  };

  const todayDone = gymData.lastCheckin === new Date().toDateString();

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (section === "home") return (
    <div style={{ padding:"0 0 140px" }}>
      {/* Header */}
      <div style={{ padding:"32px 24px 24px" }}>
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>Academia</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <h2 style={{ fontSize:28, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", lineHeight:1.15 }}>
            Treino e<br />
            <span style={{ background:"linear-gradient(90deg,var(--accent),var(--accent2))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>estilo unidos.</span>
          </h2>
          {gymData.streak > 0 && (
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:22, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--orange)" }}>🔥 {gymData.streak}</div>
              <div style={{ fontSize:9, color:"var(--text3)", letterSpacing:1, textTransform:"uppercase" }}>dias streak</div>
            </div>
          )}
        </div>
      </div>

      {/* Check-in */}
      <div style={{ margin:"0 20px 14px" }}>
        {todayDone ? (
          <div style={{ background:"rgba(62,207,142,.08)", border:"1px solid rgba(62,207,142,.2)", borderRadius:16, padding:"16px 18px", display:"flex", alignItems:"center", gap:12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--green)", fontFamily:"'Syne',sans-serif" }}>Treino feito hoje!</div>
              <div style={{ fontSize:11, color:"rgba(62,207,142,.6)" }}>Sequência: {gymData.streak} dia{gymData.streak!==1?"s":""}. Continue amanhã! 🏆</div>
            </div>
          </div>
        ) : (
          <button onClick={doCheckin} style={{ width:"100%", padding:"16px", background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", borderRadius:16, cursor:"pointer", display:"flex", alignItems:"center", gap:14, textAlign:"left" }}>
            <div style={{ width:40, height:40, borderRadius:10, background:"rgba(0,0,0,.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11M6.5 17.5h11M3 10h18M3 14h18"/><circle cx="6.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="6.5" r="1.5"/><circle cx="6.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/></svg>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#000", fontFamily:"'Syne',sans-serif" }}>Fazer check-in do treino</div>
              <div style={{ fontSize:11, color:"rgba(0,0,0,.5)" }}>Registre que você treinou hoje</div>
            </div>
          </button>
        )}
      </div>

      {/* 3 seções principais */}
      <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:10 }}>

        {/* Corrida */}
        <button onClick={() => setSection("corrida")} style={{ display:"flex", alignItems:"center", gap:16, background:"linear-gradient(135deg,rgba(96,165,250,.08),rgba(96,165,250,.04))", border:"1px solid rgba(96,165,250,.2)", borderRadius:16, padding:"18px 20px", cursor:"pointer", textAlign:"left", width:"100%", position:"relative" }}>
          <div style={{ position:"absolute", top:-8, right:14, background:"linear-gradient(135deg,var(--blue),#3b82f6)", borderRadius:100, padding:"2px 10px", fontSize:9, color:"#fff", fontWeight:700, fontFamily:"'Syne',sans-serif" }}>NOVO</div>
          <div style={{ width:44, height:44, borderRadius:12, background:"rgba(96,165,250,.12)", border:"1px solid rgba(96,165,250,.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4a1 1 0 100-2 1 1 0 000 2z"/><path d="M7.5 13.5l2-5L12 10l2.5-4"/><path d="M3 17l4-2 2 3 4-5 2 2 4-3"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--blue)", marginBottom:3, fontFamily:"'Syne',sans-serif" }}>Corrida</div>
            <div style={{ fontSize:12, color:"var(--text2)" }}>Treino IA + produtos + professores parceiros</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Nutrição */}
        <button onClick={() => setSection("nutricao")} style={{ display:"flex", alignItems:"center", gap:16, background:"linear-gradient(135deg,rgba(62,207,142,.08),rgba(62,207,142,.04))", border:"1px solid rgba(62,207,142,.2)", borderRadius:16, padding:"18px 20px", cursor:"pointer", textAlign:"left", width:"100%", position:"relative" }}>
          <div style={{ position:"absolute", top:-8, right:14, background:"linear-gradient(135deg,var(--green),#2db87a)", borderRadius:100, padding:"2px 10px", fontSize:9, color:"#000", fontWeight:700, fontFamily:"'Syne',sans-serif" }}>NOVO</div>
          <div style={{ width:44, height:44, borderRadius:12, background:"rgba(62,207,142,.12)", border:"1px solid rgba(62,207,142,.2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z"/><path d="M12 6v6l4 2"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--green)", marginBottom:3, fontFamily:"'Syne',sans-serif" }}>Nutrição básica</div>
            <div style={{ fontSize:12, color:"var(--text2)" }}>Chat + plano alimentar para o seu treino</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Looks de treino */}
        <button onClick={() => setSection("looks")} style={{ display:"flex", alignItems:"center", gap:16, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"18px 20px", cursor:"pointer", textAlign:"left", width:"100%" }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"rgba(201,169,110,.1)", border:"1px solid rgba(201,169,110,.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:3, fontFamily:"'Syne',sans-serif" }}>Looks de treino</div>
            <div style={{ fontSize:12, color:"var(--text2)" }}>Roupas por modalidade com produtos</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Personais */}
        <button onClick={() => setSection("personais")} style={{ display:"flex", alignItems:"center", gap:16, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"18px 20px", cursor:"pointer", textAlign:"left", width:"100%" }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"rgba(96,165,250,.1)", border:"1px solid rgba(96,165,250,.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:3, fontFamily:"'Syne',sans-serif" }}>Personais parceiros</div>
            <div style={{ fontSize:12, color:"var(--text2)" }}>Encontre seu personal e agende pelo Zap</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Academias */}
        <button onClick={() => setSection("academias")} style={{ display:"flex", alignItems:"center", gap:16, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"18px 20px", cursor:"pointer", textAlign:"left", width:"100%" }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"rgba(251,146,60,.1)", border:"1px solid rgba(251,146,60,.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11M6.5 17.5h11M3 10h18M3 14h18"/><circle cx="6.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="6.5" r="1.5"/><circle cx="6.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:3, fontFamily:"'Syne',sans-serif" }}>Academias parceiras</div>
            <div style={{ fontSize:12, color:"var(--text2)" }}>Veja planos e fale pelo WhatsApp</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Análise de tipo de corpo */}
        <button onClick={() => inputRef.current.click()} style={{ display:"flex", alignItems:"center", gap:16, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"18px 20px", cursor:"pointer", textAlign:"left", width:"100%" }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"rgba(167,139,250,.1)", border:"1px solid rgba(167,139,250,.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:3, fontFamily:"'Syne',sans-serif" }}>Descobrir meu tipo de corpo</div>
            <div style={{ fontSize:12, color:"var(--text2)" }}>Tira uma foto — a IA analisa e sugere looks</div>
          </div>
          {analyzing ? <Dots color="var(--text3)" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>}
          <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>analyzePhoto(e.target.files[0])} />
        </button>
      </div>

      {/* Resultado análise */}
      {analysis && (
        <div style={{ margin:"14px 20px 0", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, overflow:"hidden", animation:"fadeIn .4s ease" }}>
          {analysis.split(/**([^*]+)**/g).filter(Boolean).reduce((acc,s,i)=>{if(i%2===0)acc.push({title:s});else acc[acc.length-1].body=s;return acc;},[])
            .map((p,i,arr)=>(
              <div key={i} style={{ padding:"14px 18px", borderBottom:i<arr.length-1?"1px solid var(--border)":"none" }}>
                {p.title?.trim() && <div style={{ fontSize:9,letterSpacing:3,color:"var(--accent)",marginBottom:5,textTransform:"uppercase",fontFamily:"'Syne',sans-serif" }}>{p.title.trim()}</div>}
                <p style={{ fontSize:13,color:"var(--text2)",lineHeight:1.6,margin:0 }}>{(p.body||"").trim()}</p>
              </div>
            ))}
          <div style={{ padding:"10px 18px", borderTop:"1px solid var(--border)", display:"flex", justifyContent:"flex-end" }}>
            <button onClick={()=>setAnalysis(null)} style={{ fontSize:11, color:"var(--text3)", background:"none", border:"none", cursor:"pointer" }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );

  // ── LOOKS ─────────────────────────────────────────────────────────────────
  if (section === "nutricao") return <NutricaoSection user={user} profile={profile} isPremium={isPremium} onPaywall={onPaywall} toast={toast} onBack={() => setSection("home")} />;
  if (section === "corrida")  return <CorridaSection  user={user} profile={profile} isPremium={isPremium} onPaywall={onPaywall} toast={toast} onBack={() => setSection("home")} />;

  if (section === "looks") {
    const SPORTSWEAR_PRODUCTS = [
      { id:"sw1", name:"Camiseta Dry-Fit",     brand:"Nike",        price:"R$ 189", img:"https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=300&q=80", mod:"Musculação" },
      { id:"sw2", name:"Shorts Compressão",    brand:"Under Armour",price:"R$ 240", img:"https://images.unsplash.com/photo-1591389703635-e15a07b842d7?w=300&q=80", mod:"Corrida"    },
      { id:"sw3", name:"Legging High Waist",   brand:"Lululemon",   price:"R$ 480", img:"https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=300&q=80", mod:"Yoga"       },
      { id:"sw4", name:"Tênis Training",        brand:"Adidas",      price:"R$ 550", img:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80", mod:"CrossFit"   },
      { id:"sw5", name:"Top Esportivo",         brand:"Gymshark",    price:"R$ 165", img:"https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&q=80", mod:"Musculação" },
      { id:"sw6", name:"Jaqueta Corta-Vento",   brand:"New Balance", price:"R$ 320", img:"https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=300&q=80", mod:"Corrida"    },
    ];
    return (
      <div style={{ padding:"0 0 140px" }}>
        <div style={{ padding:"32px 24px 20px", display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={()=>setSection("home")} style={{ background:"none",border:"none",cursor:"pointer",padding:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 style={{ fontSize:20, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"var(--text)" }}>Looks de Treino</h2>
        </div>
        <div style={{ padding:"0 20px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {SPORTSWEAR_PRODUCTS.map((p,i)=>(
            <div key={p.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, overflow:"hidden", animation:`fadeIn .3s ease ${i*.06}s both` }}>
              <img src={p.img} alt="" style={{ width:"100%", height:120, objectFit:"cover", display:"block" }} onError={e=>e.target.style.display="none"} />
              <div style={{ padding:"10px 12px" }}>
                <div style={{ fontSize:9,letterSpacing:1.5,color:"var(--accent)",textTransform:"uppercase",marginBottom:2 }}>{p.mod}</div>
                <div style={{ fontSize:12,fontWeight:500,color:"var(--text)",marginBottom:2 }}>{p.name}</div>
                <div style={{ fontSize:11,color:"var(--text3)",marginBottom:8 }}>{p.brand}</div>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div style={{ fontSize:13,fontWeight:700,color:"var(--text)" }}>{p.price}</div>
                  <button onClick={()=>toast("Abrindo produto… ✦")} style={{ padding:"5px 12px",background:"linear-gradient(135deg,var(--accent),var(--accent2))",border:"none",borderRadius:100,fontSize:9,color:"#000",cursor:"pointer",fontWeight:700 }}>Ver</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── PERSONAIS ─────────────────────────────────────────────────────────────
  if (section === "personais") return (
    <div style={{ padding:"0 0 140px" }}>
      <div style={{ padding:"32px 24px 20px", display:"flex", alignItems:"center", gap:14 }}>
        <button onClick={()=>setSection("home")} style={{ background:"none",border:"none",cursor:"pointer",padding:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style={{ fontSize:20, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"var(--text)" }}>Personais Parceiros</h2>
      </div>
      <PersonaisSection user={user} toast={toast} />
    </div>
  );

  // ── ACADEMIAS ─────────────────────────────────────────────────────────────
  if (section === "academias") return (
    <div style={{ padding:"0 0 140px" }}>
      <div style={{ padding:"32px 24px 20px", display:"flex", alignItems:"center", gap:14 }}>
        <button onClick={()=>setSection("home")} style={{ background:"none",border:"none",cursor:"pointer",padding:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style={{ fontSize:20, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"var(--text)" }}>Academias Parceiras</h2>
      </div>
      <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:12 }}>
        {GYM_PARTNERS.map((gym,i)=>(
          <div key={gym.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:18, overflow:"hidden", animation:`fadeIn .35s ease ${i*.07}s both` }}>
            <div style={{ background:gym.color, padding:"16px 18px", display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:44,height:44,borderRadius:12,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:"#fff",flexShrink:0 }}>{gym.logo}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15,fontFamily:"'Syne',sans-serif",fontWeight:600,color:"#fff" }}>{gym.name}</div>
                <div style={{ fontSize:11,color:"rgba(255,255,255,.6)" }}>📍 {gym.city}, {gym.state} · {gym.open?"● Aberta":"○ Fechada"}</div>
              </div>
            </div>
            <div style={{ padding:"14px 18px" }}>
              <p style={{ fontSize:12,color:"var(--text2)",lineHeight:1.5,marginBottom:12 }}>{gym.about}</p>
              <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:14 }}>
                {gym.modalities.map(m=><div key={m} style={{ padding:"4px 10px",background:"var(--surface2)",borderRadius:100,fontSize:10,color:"var(--text2)" }}>{m}</div>)}
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14 }}>
                {gym.plans.map(plan=>(
                  <div key={plan.name} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:plan.highlight?"linear-gradient(135deg,rgba(201,169,110,.15),rgba(201,169,110,.05))":"var(--surface2)",borderRadius:12,border:plan.highlight?"1px solid rgba(201,169,110,.2)":"1px solid var(--border)" }}>
                    <div>
                      <div style={{ fontSize:12,fontWeight:500,color:"var(--text)" }}>{plan.name}</div>
                      <div style={{ fontSize:10,color:"var(--text3)",marginTop:1 }}>{plan.desc}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:14,fontWeight:700,color:plan.highlight?"var(--accent)":"var(--text)" }}>{plan.price}</div>
                      <div style={{ fontSize:9,color:"var(--text3)" }}>{plan.period}</div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={()=>{ const msg=encodeURIComponent(`Olá! Vi a ${gym.name} no app Presença e tenho interesse nos planos. ✦`); window.open(`https://wa.me/${gym.whatsapp}?text=${msg}`,"_blank"); toast(`Abrindo WhatsApp — ${gym.name} ✦`); }}
                style={{ width:"100%",padding:"13px",background:"#25d366",border:"none",borderRadius:100,fontSize:12,color:"#fff",cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                💬 Falar no WhatsApp
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BARBEARIA MODULE
// ═══════════════════════════════════════════════════════════════════════════════

const FACE_SHAPES = {
  oval:       { label:"Oval",        emoji:"🥚", desc:"Formato equilibrado, quase todos os cortes ficam bem.", cuts:["Undercut","Fade lateral","Pompadour","Buzz cut"] },
  quadrado:   { label:"Quadrado",    emoji:"⬜", desc:"Mandíbula forte, laterais retas.", cuts:["Quiff","Franja lateral","Corte texturizado","Crespo alto"] },
  redondo:    { label:"Redondo",     emoji:"⭕", desc:"Rosto amplo e bochechas cheias.", cuts:["Mohawk suave","Volume no topo","Undercut alto","Topete"] },
  triangular: { label:"Triangular",  emoji:"🔺", desc:"Testa larga, queixo mais fino.", cuts:["Franja pesada","Bob masculino","Textura leve","Lateral raspada"] },
  losango:    { label:"Losango",     emoji:"💠", desc:"Maçãs do rosto proeminentes.", cuts:["Franja lateral","Corte clássico","Fade baixo","Natural"] },
};

const BARBERSHOPS = [
  {
    id:"bs1", name:"Gold Barbershop",   city:"Taquara", state:"RS",
    logo:"G", color:"#c9a84c",
    whatsapp:"5551999990001",
    services:["Corte","Barba","Combo","Platinado"],
    rating:4.9, reviews:203, verified:true, open:true,
    address:"Rua Sinimbu, 312 — Centro",
    about:"Especialistas em fade e barba desenhada. Ambiente premium, atendimento exclusivo.",
    instagram:"@goldbarbershop",
  },
  {
    id:"bs2", name:"Grisa Barbearia",   city:"Igrejinha", state:"RS",
    logo:"GR", color:"var(--text2)",
    whatsapp:"5551999990002",
    services:["Corte","Barba","Sobrancelha","Hot Towel"],
    rating:4.8, reviews:147, verified:true, open:true,
    address:"Av. Borges de Medeiros, 880",
    about:"Tradição e modernidade. Cortes clássicos e contemporâneos para todos os estilos.",
    instagram:"@grisabarbearia",
  },
  {
    id:"bs3", name:"Black Label Barber", city:"Novo Hamburgo", state:"RS",
    logo:"BL", color:"var(--text)",
    whatsapp:"5551999990003",
    services:["Fade","Barba","Coloração","Sobrancelha"],
    rating:5.0, reviews:89,  verified:true, open:false,
    address:"Rua Frederico Mentz, 1200 — Florestal",
    about:"Experiência de barbearia de alto padrão. Agendamento exclusivo.",
    instagram:"@blacklabelbarber",
  },
  {
    id:"bs4", name:"Corte & Estilo",    city:"Gramado", state:"RS",
    logo:"CE", color:"#2d6a4f",
    whatsapp:"5554999990004",
    services:["Corte","Barba","Tratamento Capilar"],
    rating:4.7, reviews:112, verified:false, open:true,
    address:"Rua Garibaldi, 540 — Centro",
    about:"O melhor corte da Serra Gaúcha. Produtos exclusivos e ambiente aconchegante.",
    instagram:"@corteestilo_gramado",
  },
];

const GROOMING_PRODUCTS = [
  { id:"g1", name:"Pomada Modeladora Matte",    brand:"American Crew", price:"R$ 89",  img:"https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=300&q=80", category:"cabelo" },
  { id:"g2", name:"Óleo de Barba Premium",      brand:"Bulldog",       price:"R$ 65",  img:"https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300&q=80", category:"barba"  },
  { id:"g3", name:"Sérum Facial Hidratante",    brand:"Kiehl's",       price:"R$ 189", img:"https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=300&q=80", category:"skin"   },
  { id:"g4", name:"Cera Texturizante Surf",     brand:"Baxter",        price:"R$ 120", img:"https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=300&q=80", category:"cabelo" },
  { id:"g5", name:"Kit Barba Completo",         brand:"The Art of Shaving",price:"R$ 280",img:"https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300&q=80",category:"barba"},
  { id:"g6", name:"Protetor Solar Facial FPS50",brand:"La Roche-Posay",price:"R$ 145", img:"https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=300&q=80", category:"skin"  },
];

// ── SkincareSection ─────────────────────────────────────────────────────────
function SkincareSection({ user, isPremium, onPaywall, toast }) {
  const chatKey = `presenca_skincare_chat_${user.id}`;
  const planKey = `presenca_skincare_plan_${user.id}`;
  const [tab, setTab]           = useState("chat");
  const [messages, setMessages] = useState(() => LS.get(chatKey, []));
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [plan, setPlan]         = useState(() => LS.get(planKey, null));
  const [genPlan, setGenPlan]   = useState(false);
  const [skinType, setSkinType] = useState("normal");
  const [concern, setConcern]   = useState("oleosidade");
  const bottomRef = useRef();

  const QUICK_Q = ["Preciso lavar o rosto todo dia?","Qual produto básico para começar?","Como tirar espinha sem deixar marca?","Protetor solar masculino — vale a pena?","Minha pele é oleosa, o que fazer?"];

  const sendMsg = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg = { role:"user", content:msg };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);
    try {
      const res = await callClaude({
        system:`Você é dermatologista amigo que fala simples com homens brasileiros iniciantes em skincare. Use produtos nacionais acessíveis. Máximo 120 palavras por resposta. Sem jargão. Tom de amigo.`,
        messages: history.map(m => ({ role:m.role, content:m.content })),
        maxTokens:200,
      });
      const updated = [...history, { role:"assistant", content:res }];
      setMessages(updated);
      LS.set(chatKey, updated.slice(-20));
    } catch { toast("Erro. Tente novamente."); }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
  };

  const generatePlan = async () => {
    setGenPlan(true);
    try {
      const res = await callClaude({
        system:`Você é dermatologista. Crie plano de skincare masculino simples. Responda APENAS em JSON sem markdown:
{"titulo":"string","rotina_manha":["passo1","passo2","passo3"],"rotina_noite":["passo1","passo2"],"produtos":[{"nome":"string","marca":"string","preco":"R$ X","onde_comprar":"string","dica":"string"}],"dica_semanal":"string","erro_comum":"string"}
Máximo 3 produtos nacionais baratos. Passos simples.`,
        messages:[{ role:"user", content:`Tipo de pele: ${skinType}. Preocupação: ${concern}.` }],
        maxTokens:500,
      });
      let parsed; try { parsed = JSON.parse(res.replace(/```json|```/g,"").trim()); } catch { parsed = null; }
      if (parsed) { setPlan(parsed); LS.set(planKey, parsed); setTab("plano"); toast("Plano criado! ✦"); }
      else toast("Erro ao gerar. Tente de novo.");
    } catch { toast("Erro de conexão."); }
    setGenPlan(false);
  };

  return (
    <div style={{ padding:"0 0 10px" }}>
      <div style={{ padding:"16px 24px 12px" }}>
        <div style={{ display:"flex", background:"var(--surface2)", borderRadius:100, padding:3 }}>
          {[["chat","💬 Tirar dúvidas"],["plano","📋 Meu plano"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex:1, padding:"9px", background:tab===id?"var(--surface3)":"transparent", border:"none", borderRadius:100, fontSize:12, fontWeight:tab===id?600:400, color:tab===id?"var(--text)":"var(--text2)", cursor:"pointer" }}>{label}</button>
          ))}
        </div>
      </div>

      {tab === "chat" && (
        <div style={{ padding:"0 24px" }}>
          {messages.length === 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:"var(--text3)", marginBottom:8, textAlign:"center" }}>Toque para perguntar</div>
              {QUICK_Q.map(q => <button key={q} onClick={() => sendMsg(q)} style={{ display:"block", width:"100%", padding:"10px 14px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, fontSize:12, color:"var(--text2)", cursor:"pointer", textAlign:"left", marginBottom:6 }}>{q}</button>)}
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                <div style={{ maxWidth:"82%", padding:"10px 14px", background:m.role==="user"?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface)", border:m.role==="user"?"none":"1px solid var(--border)", borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px", fontSize:13, color:m.role==="user"?"#000":"var(--text)", lineHeight:1.55 }}>{m.content}</div>
              </div>
            ))}
            {loading && <div style={{ display:"flex" }}><div style={{ padding:"10px 16px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"18px 18px 18px 4px" }}><Dots color="var(--text2)" /></div></div>}
            <div ref={bottomRef} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} placeholder="Pergunta sobre pele…" style={{ flex:1, padding:"12px 16px", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:100, fontSize:13, color:"var(--text)", outline:"none", fontFamily:"'Inter',sans-serif" }} />
            <button onClick={() => sendMsg()} disabled={!input.trim()||loading} style={{ width:44, height:44, borderRadius:22, background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}

      {tab === "plano" && (
        <div style={{ padding:"0 24px" }}>
          {!plan ? (
            <>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>Tipo de pele</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[["normal","Normal"],["oleosa","Oleosa"],["seca","Seca"],["mista","Mista"],["sensivel","Sensível"]].map(([v,l]) => (
                    <button key={v} onClick={() => setSkinType(v)} style={{ padding:"7px 14px", background:skinType===v?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface)", border:`1px solid ${skinType===v?"var(--accent)":"var(--border)"}`, borderRadius:100, fontSize:11, color:skinType===v?"#000":"var(--text2)", cursor:"pointer" }}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>Principal preocupação</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[["oleosidade","Oleosidade"],["espinhas","Espinhas"],["manchas","Manchas"],["ressecamento","Ressecamento"],["envelhecimento","Envelhecimento"],["barba","Irritação barba"]].map(([v,l]) => (
                    <button key={v} onClick={() => setConcern(v)} style={{ padding:"7px 14px", background:concern===v?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface)", border:`1px solid ${concern===v?"var(--accent)":"var(--border)"}`, borderRadius:100, fontSize:11, color:concern===v?"#000":"var(--text2)", cursor:"pointer" }}>{l}</button>
                  ))}
                </div>
              </div>
              <button onClick={generatePlan} disabled={genPlan} style={{ width:"100%", padding:"15px", background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", borderRadius:100, fontSize:13, color:"#000", fontWeight:700, cursor:"pointer", fontFamily:"'Syne',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                {genPlan ? <><Dots color="#000" />Criando plano…</> : "✦ Criar meu plano de skincare"}
              </button>
            </>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ background:"var(--surface)", border:"1px solid rgba(201,169,110,.2)", borderRadius:14, padding:"14px 16px" }}>
                <div style={{ fontSize:9, letterSpacing:3, color:"var(--accent)", textTransform:"uppercase", marginBottom:4, fontFamily:"'Syne',sans-serif" }}>Seu plano</div>
                <div style={{ fontSize:14, fontWeight:600, color:"var(--text)" }}>{plan.titulo}</div>
              </div>
              <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 16px" }}>
                <div style={{ fontSize:9, letterSpacing:3, color:"var(--blue)", textTransform:"uppercase", marginBottom:10, fontFamily:"'Syne',sans-serif" }}>☀️ Manhã</div>
                {plan.rotina_manha?.map((p,i) => <div key={i} style={{ display:"flex", gap:10, marginBottom:8 }}><div style={{ width:20, height:20, borderRadius:10, background:"var(--blue)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#000", fontWeight:700, flexShrink:0 }}>{i+1}</div><div style={{ fontSize:13, color:"var(--text2)", lineHeight:1.5 }}>{p}</div></div>)}
              </div>
              <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 16px" }}>
                <div style={{ fontSize:9, letterSpacing:3, color:"var(--purple)", textTransform:"uppercase", marginBottom:10, fontFamily:"'Syne',sans-serif" }}>🌙 Noite</div>
                {plan.rotina_noite?.map((p,i) => <div key={i} style={{ display:"flex", gap:10, marginBottom:8 }}><div style={{ width:20, height:20, borderRadius:10, background:"var(--purple)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:"#fff", fontWeight:700, flexShrink:0 }}>{i+1}</div><div style={{ fontSize:13, color:"var(--text2)", lineHeight:1.5 }}>{p}</div></div>)}
              </div>
              {plan.produtos?.length > 0 && (
                <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 16px" }}>
                  <div style={{ fontSize:9, letterSpacing:3, color:"var(--green)", textTransform:"uppercase", marginBottom:10, fontFamily:"'Syne',sans-serif" }}>🛒 Produtos</div>
                  {plan.produtos.map((p,i) => <div key={i} style={{ padding:"8px 0", borderTop:i>0?"1px solid var(--border)":"none" }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}><div style={{ fontSize:12, fontWeight:600, color:"var(--text)" }}>{p.nome}</div><div style={{ fontSize:12, fontWeight:700, color:"var(--accent)" }}>{p.preco}</div></div><div style={{ fontSize:11, color:"var(--text3)" }}>{p.marca} · {p.onde_comprar}</div>{p.dica&&<div style={{ fontSize:11, color:"var(--accent)", marginTop:3, fontStyle:"italic" }}>💡 {p.dica}</div>}</div>)}
                </div>
              )}
              {plan.dica_semanal && <div style={{ background:"rgba(201,169,110,.08)", border:"1px solid rgba(201,169,110,.2)", borderRadius:12, padding:"12px 14px" }}><div style={{ fontSize:10, color:"var(--accent)", fontWeight:600, marginBottom:3 }}>✦ Dica da semana</div><div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.5 }}>{plan.dica_semanal}</div></div>}
              <button onClick={() => { setPlan(null); LS.del(planKey); }} style={{ width:"100%", padding:"11px", background:"transparent", border:"1px solid var(--border)", borderRadius:100, fontSize:11, color:"var(--text3)", cursor:"pointer" }}>Refazer plano</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── CorridaSection ───────────────────────────────────────────────────────────
const RUNNING_COACHES = [
  { id:"rc1", name:"Felipe Matos", title:"Assessoria Esportiva", city:"Taquara, RS", rating:4.9, reviews:47, price:"R$ 120/mês", whatsapp:"5551999990001", specialty:"Iniciantes e 5km", avatar:"FM", online:true, bio:"10 anos formando corredores do zero. Especialista em iniciantes." },
  { id:"rc2", name:"Camila Dutra", title:"Professora de Corrida", city:"Igrejinha, RS", rating:4.8, reviews:38, price:"R$ 150/mês", whatsapp:"5551999990002", specialty:"Maratona e resistência", avatar:"CD", online:false, bio:"Maratonista com 6 anos de experiência em assessoria esportiva." },
  { id:"rc3", name:"André Costa",  title:"Personal Runner",      city:"Novo Hamburgo, RS", rating:4.7, reviews:31, price:"R$ 100/mês", whatsapp:"5551999990003", specialty:"Emagrecimento correndo", avatar:"AC", online:true, bio:"Especialista em usar a corrida como ferramenta de emagrecimento." },
];

const RUNNING_PRODUCTS = [
  { id:"rp1", name:"Tênis de Corrida Iniciante", brand:"Asics", price:"R$ 380", img:"https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80", tag:"Melhor para começar" },
  { id:"rp2", name:"Camiseta Dry-Fit UV50+",     brand:"Mizuno", price:"R$ 120", img:"https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=300&q=80", tag:"Essencial" },
  { id:"rp3", name:"Shorts com Bolso",           brand:"Nike",   price:"R$ 180", img:"https://images.unsplash.com/photo-1591389703635-e15a07b842d7?w=300&q=80", tag:"Conforto" },
  { id:"rp4", name:"Relógio com GPS",            brand:"Garmin", price:"R$ 890", img:"https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80", tag:"Evoluindo" },
  { id:"rp5", name:"Cinto de Hidratação",        brand:"Salomon",price:"R$ 140", img:"https://images.unsplash.com/photo-1544117519-31a4b719223d?w=300&q=80", tag:"Treinos longos" },
  { id:"rp6", name:"Meia de Compressão",         brand:"CEP",    price:"R$ 95",  img:"https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80", tag:"Prevenção" },
];

function CorridaSection({ user, profile, isPremium, onPaywall, toast, onBack }) {
  const planKey = `presenca_corrida_plan_${user.id}`;
  const [tab, setTab]         = useState("treino"); // treino | produtos | professores
  const [plan, setPlan]       = useState(() => LS.get(planKey, null));
  const [genPlan, setGenPlan] = useState(false);
  const [nivel, setNivel]     = useState("iniciante");
  const [objetivo, setObjetivo] = useState("5km");
  const [diasSemana, setDias] = useState("3");
  const [showCoach, setShowCoach] = useState(null);

  const generatePlan = async () => {
    if (!isPremium) { onPaywall(); return; }
    setGenPlan(true);
    try {
      const res = await callClaude({
        system:`Você é treinador de corrida. Crie planilha de treino semanal. Responda APENAS em JSON sem markdown:
{"titulo":"string","descricao":"string","duracao_semanas":number,"semanas":[{"semana":1,"foco":"string","treinos":[{"dia":"string","tipo":"string","duracao":"string","detalhes":"string","dica":"string"}]}]}
Máximo 4 semanas, ${diasSemana} treinos por semana. Use linguagem simples. Inclua aquecimento e descanso. Progressão gradual.`,
        messages:[{ role:"user", content:`Nível: ${nivel}. Objetivo: ${objetivo}. Dias por semana: ${diasSemana}. Disponibilidade: ${diasSemana} vezes/semana.` }],
        maxTokens:700,
      });
      let parsed; try { parsed = JSON.parse(res.replace(/```json|```/g,"").trim()); } catch { parsed = null; }
      if (parsed) { setPlan(parsed); LS.set(planKey, parsed); toast("Planilha criada! ✦"); }
      else toast("Erro ao gerar. Tente novamente.");
    } catch { toast("Erro de conexão."); }
    setGenPlan(false);
  };

  const BackBtn = () => (
    <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", padding:0 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
  );

  return (
    <div style={{ padding:"0 0 140px" }}>
      {/* Header */}
      <div style={{ padding:"24px 24px 0" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
          <BackBtn />
          <div>
            <div style={{ fontSize:10, letterSpacing:3, color:"var(--blue)", textTransform:"uppercase", fontFamily:"'Syne',sans-serif", marginBottom:2 }}>Academia</div>
            <h2 style={{ fontSize:22, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", lineHeight:1.1 }}>
              Corrida.{" "}
              <span style={{ background:"linear-gradient(90deg,var(--blue),#93c5fd)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                Do zero.
              </span>
            </h2>
          </div>
        </div>

        {/* Tab nav */}
        <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, marginBottom:16 }}>
          {[["treino","🏃 Treino"],["produtos","👟 Produtos"],["professores","👤 Professores"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding:"8px 16px", background:tab===id?"linear-gradient(135deg,var(--blue),#3b82f6)":"var(--surface)", border:`1px solid ${tab===id?"var(--blue)":"var(--border)"}`, borderRadius:100, fontSize:12, color:tab===id?"#fff":"var(--text2)", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, fontWeight:tab===id?700:400, transition:"all .15s" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TREINO ── */}
      {tab === "treino" && (
        <div style={{ padding:"0 24px" }}>
          {!plan ? (
            <>
              <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.6, marginBottom:20 }}>
                Diz onde você está e onde quer chegar. A IA monta a planilha perfeita para você.
              </p>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>Meu nível atual</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[["iniciante","Nunca corri"],["basico","Corro às vezes"],["intermediario","Corro toda semana"],["avancado","Já fiz prova"]].map(([v,l]) => (
                    <button key={v} onClick={() => setNivel(v)} style={{ padding:"8px 16px", background:nivel===v?"linear-gradient(135deg,var(--blue),#3b82f6)":"var(--surface)", border:`1px solid ${nivel===v?"var(--blue)":"var(--border)"}`, borderRadius:100, fontSize:12, color:nivel===v?"#fff":"var(--text2)", cursor:"pointer", fontWeight:nivel===v?700:400 }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>Meu objetivo</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[["5km","Completar 5km"],["10km","Completar 10km"],["emagrecer","Emagrecer correndo"],["habito","Criar hábito"],["meia","Meia maratona"]].map(([v,l]) => (
                    <button key={v} onClick={() => setObjetivo(v)} style={{ padding:"8px 16px", background:objetivo===v?"linear-gradient(135deg,var(--blue),#3b82f6)":"var(--surface)", border:`1px solid ${objetivo===v?"var(--blue)":"var(--border)"}`, borderRadius:100, fontSize:12, color:objetivo===v?"#fff":"var(--text2)", cursor:"pointer", fontWeight:objetivo===v?700:400 }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>Dias disponíveis por semana</div>
                <div style={{ display:"flex", gap:8 }}>
                  {["2","3","4","5"].map(d => (
                    <button key={d} onClick={() => setDias(d)} style={{ flex:1, padding:"10px", background:diasSemana===d?"linear-gradient(135deg,var(--blue),#3b82f6)":"var(--surface)", border:`1px solid ${diasSemana===d?"var(--blue)":"var(--border)"}`, borderRadius:12, fontSize:14, color:diasSemana===d?"#fff":"var(--text2)", cursor:"pointer", fontWeight:diasSemana===d?700:400, fontFamily:"'Syne',sans-serif" }}>
                      {d}x
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={generatePlan} disabled={genPlan} style={{ width:"100%", padding:"16px", background:"linear-gradient(135deg,var(--blue),#3b82f6)", border:"none", borderRadius:100, fontSize:13, color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"'Syne',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 20px rgba(96,165,250,.3)" }}>
                {genPlan ? <><Dots color="#fff" />Montando planilha…</> : "🏃 Gerar minha planilha de corrida"}
              </button>
              {!isPremium && <div style={{ fontSize:10, color:"var(--text3)", textAlign:"center", marginTop:8 }}>Disponível no Premium</div>}
            </>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {/* Plan header */}
              <div style={{ background:"linear-gradient(135deg,rgba(96,165,250,.12),rgba(96,165,250,.06))", border:"1px solid rgba(96,165,250,.25)", borderRadius:16, padding:"16px 18px" }}>
                <div style={{ fontSize:9, letterSpacing:3, color:"var(--blue)", textTransform:"uppercase", marginBottom:5, fontFamily:"'Syne',sans-serif" }}>Sua planilha</div>
                <div style={{ fontSize:18, fontWeight:700, color:"var(--text)", fontFamily:"'Syne',sans-serif", marginBottom:4 }}>{plan.titulo}</div>
                <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.5 }}>{plan.descricao}</div>
                <div style={{ fontSize:11, color:"var(--blue)", marginTop:6 }}>📅 {plan.duracao_semanas} semanas · {diasSemana}x por semana</div>
              </div>

              {/* Weeks */}
              {plan.semanas?.map((sem, wi) => (
                <div key={wi} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, overflow:"hidden" }}>
                  <div style={{ padding:"12px 18px", background:"var(--surface2)", borderBottom:"1px solid var(--border)" }}>
                    <div style={{ fontSize:10, letterSpacing:2, color:"var(--blue)", textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>Semana {sem.semana}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:"var(--text)", marginTop:2 }}>{sem.foco}</div>
                  </div>
                  {sem.treinos?.map((t, ti) => (
                    <div key={ti} style={{ padding:"12px 18px", borderBottom:ti<sem.treinos.length-1?"1px solid var(--border)":"none" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", fontFamily:"'Syne',sans-serif" }}>{t.dia}</div>
                        <div style={{ fontSize:10, color:"var(--blue)", background:"rgba(96,165,250,.1)", padding:"2px 8px", borderRadius:100 }}>{t.duracao}</div>
                      </div>
                      <div style={{ fontSize:12, color:"var(--accent)", marginBottom:3 }}>{t.tipo}</div>
                      <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.5 }}>{t.detalhes}</div>
                      {t.dica && <div style={{ fontSize:11, color:"var(--green)", marginTop:5, fontStyle:"italic" }}>💡 {t.dica}</div>}
                    </div>
                  ))}
                </div>
              ))}

              <button onClick={() => { setPlan(null); LS.del(planKey); }} style={{ width:"100%", padding:"12px", background:"transparent", border:"1px solid var(--border)", borderRadius:100, fontSize:11, color:"var(--text3)", cursor:"pointer" }}>
                Refazer planilha
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── PRODUTOS ── */}
      {tab === "produtos" && (
        <div style={{ padding:"0 24px" }}>
          <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.6, marginBottom:16 }}>
            O que você realmente precisa para começar — sem gastar à toa.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {RUNNING_PRODUCTS.map((p, i) => (
              <div key={p.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, overflow:"hidden", animation:`fadeIn .3s ease ${i*.06}s both` }}>
                <img src={p.img} alt="" style={{ width:"100%", height:120, objectFit:"cover", display:"block" }} onError={e=>e.target.style.background="var(--surface2)"} />
                <div style={{ padding:"10px 12px" }}>
                  <div style={{ fontSize:9, color:"var(--blue)", letterSpacing:1.5, textTransform:"uppercase", marginBottom:2 }}>{p.tag}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", lineHeight:1.3, marginBottom:2 }}>{p.name}</div>
                  <div style={{ fontSize:10, color:"var(--text3)", marginBottom:8 }}>{p.brand}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"var(--accent)" }}>{p.price}</div>
                    <button onClick={() => toast("Abrindo produto… ✦")} style={{ padding:"5px 10px", background:"linear-gradient(135deg,var(--blue),#3b82f6)", border:"none", borderRadius:100, fontSize:9, color:"#fff", cursor:"pointer", fontWeight:700 }}>Ver</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PROFESSORES ── */}
      {tab === "professores" && (
        <div style={{ padding:"0 24px" }}>
          <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.6, marginBottom:16 }}>
            Assessorias esportivas e professores de corrida parceiros. Fale direto pelo WhatsApp.
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {RUNNING_COACHES.map((coach, i) => (
              <div key={coach.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:18, padding:"18px", animation:`fadeIn .35s ease ${i*.07}s both` }}>
                <div style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:12 }}>
                  <div style={{ position:"relative" }}>
                    <div style={{ width:48, height:48, borderRadius:24, background:"linear-gradient(135deg,var(--blue),#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#fff", flexShrink:0 }}>{coach.avatar}</div>
                    {coach.online && <div style={{ position:"absolute", bottom:1, right:1, width:11, height:11, borderRadius:6, background:"var(--green)", border:"2px solid var(--surface)" }} />}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", fontFamily:"'Syne',sans-serif", marginBottom:2 }}>{coach.name}</div>
                    <div style={{ fontSize:11, color:"var(--text2)", marginBottom:2 }}>{coach.title}</div>
                    <div style={{ fontSize:11, color:"var(--text3)" }}>📍 {coach.city}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:"var(--accent)" }}>{coach.price}</div>
                    <div style={{ fontSize:10, color:"var(--text3)" }}>⭐ {coach.rating} ({coach.reviews})</div>
                  </div>
                </div>

                <div style={{ background:"rgba(96,165,250,.08)", border:"1px solid rgba(96,165,250,.15)", borderRadius:10, padding:"8px 12px", marginBottom:12 }}>
                  <div style={{ fontSize:10, color:"var(--blue)", fontWeight:600, marginBottom:2 }}>Especialidade</div>
                  <div style={{ fontSize:12, color:"var(--text2)" }}>{coach.specialty}</div>
                </div>

                <p style={{ fontSize:12, color:"var(--text2)", lineHeight:1.5, marginBottom:12 }}>{coach.bio}</p>

                <button onClick={() => {
                  const msg = encodeURIComponent(`Olá ${coach.name}! Vi seu perfil no app Presença e tenho interesse na assessoria de corrida. Pode me dar mais informações? ✦`);
                  window.open(`https://wa.me/${coach.whatsapp}?text=${msg}`, "_blank");
                  toast(`Abrindo WhatsApp — ${coach.name} ✦`);
                }} style={{ width:"100%", padding:"13px", background:"#25d366", border:"none", borderRadius:100, fontSize:12, color:"#fff", cursor:"pointer", fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Falar com {coach.name.split(" ")[0]}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── NutricaoSection ──────────────────────────────────────────────────────────
function NutricaoSection({ user, profile, isPremium, onPaywall, toast, onBack }) {
  const chatKey = `presenca_nutri_chat_${user.id}`;
  const planKey = `presenca_nutri_plan_${user.id}`;
  const [tab, setTab]           = useState("chat");
  const [messages, setMessages] = useState(() => LS.get(chatKey, []));
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [plan, setPlan]         = useState(() => LS.get(planKey, null));
  const [genPlan, setGenPlan]   = useState(false);
  const [objetivo, setObjetivo] = useState("emagrecer");
  const [horario, setHorario]   = useState("manha");
  const bottomRef = useRef();

  const QUICK_Q = ["O que comer antes do treino?","Preciso tomar whey protein?","Pode comer arroz e feijão e malhar?","Como emagrecer sem perder músculo?","Quantas refeições por dia?"];

  const sendMsg = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg = { role:"user", content:msg };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);
    try {
      const res = await callClaude({
        system:`Você é nutricionista esportivo que fala simples com brasileiros. Use exemplos com comida brasileira (arroz, feijão, frango, ovo, banana). Sem suplementos caros. Máximo 130 palavras. Tom de amigo. Contexto: objetivo ${objetivo}, treina pela ${horario}.`,
        messages: history.map(m => ({ role:m.role, content:m.content })),
        maxTokens:220,
      });
      const updated = [...history, { role:"assistant", content:res }];
      setMessages(updated);
      LS.set(chatKey, updated.slice(-20));
    } catch { toast("Erro. Tente novamente."); }
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
  };

  const generatePlan = async () => {
    setGenPlan(true);
    try {
      const gymData = LS.get(`presenca_gym_${user.id}`, {});
      const res = await callClaude({
        system:`Você é nutricionista esportivo. Crie plano alimentar para brasileiro. Responda APENAS em JSON sem markdown:
{"titulo":"string","calorias_aprox":"string","refeicoes":[{"horario":"string","nome":"string","opcoes":["opcao1","opcao2"],"dica":"string"}],"antes_treino":"string","depois_treino":"string","suplemento":"string","dica_ouro":"string"}
Use comida brasileira. Máximo 4 refeições. Linguagem simples.`,
        messages:[{ role:"user", content:`Objetivo: ${objetivo}. Horário treino: ${horario}. Modalidade: ${gymData.modality||"musculação"}.` }],
        maxTokens:600,
      });
      let parsed; try { parsed = JSON.parse(res.replace(/```json|```/g,"").trim()); } catch { parsed = null; }
      if (parsed) { setPlan(parsed); LS.set(planKey, parsed); setTab("plano"); toast("Plano nutricional criado! ✦"); }
      else toast("Erro ao gerar. Tente novamente.");
    } catch { toast("Erro de conexão."); }
    setGenPlan(false);
  };

  return (
    <div style={{ padding:"0 0 140px" }}>
      <div style={{ padding:"20px 24px 14px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onBack} style={{ background:"none", border:"none", cursor:"pointer", padding:0, flexShrink:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h3 style={{ fontSize:20, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", marginBottom:2 }}>Nutrição básica</h3>
          <p style={{ fontSize:12, color:"var(--text2)" }}>Comida brasileira que funciona de verdade.</p>
        </div>
      </div>

      <div style={{ padding:"0 24px", marginBottom:14 }}>
        <div style={{ display:"flex", background:"var(--surface2)", borderRadius:100, padding:3 }}>
          {[["chat","💬 Tirar dúvidas"],["plano","📋 Meu plano"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ flex:1, padding:"9px", background:tab===id?"var(--surface3)":"transparent", border:"none", borderRadius:100, fontSize:12, fontWeight:tab===id?600:400, color:tab===id?"var(--text)":"var(--text2)", cursor:"pointer" }}>{label}</button>
          ))}
        </div>
      </div>

      {tab === "chat" && (
        <div style={{ padding:"0 24px" }}>
          {messages.length === 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:"var(--text3)", marginBottom:8, textAlign:"center" }}>Toque para perguntar</div>
              {QUICK_Q.map(q => <button key={q} onClick={() => sendMsg(q)} style={{ display:"block", width:"100%", padding:"10px 14px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, fontSize:12, color:"var(--text2)", cursor:"pointer", textAlign:"left", marginBottom:6 }}>{q}</button>)}
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                <div style={{ maxWidth:"82%", padding:"10px 14px", background:m.role==="user"?"linear-gradient(135deg,var(--green),#2db87a)":"var(--surface)", border:m.role==="user"?"none":"1px solid var(--border)", borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px", fontSize:13, color:m.role==="user"?"#000":"var(--text)", lineHeight:1.55 }}>{m.content}</div>
              </div>
            ))}
            {loading && <div style={{ display:"flex" }}><div style={{ padding:"10px 16px", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"18px 18px 18px 4px" }}><Dots color="var(--text2)" /></div></div>}
            <div ref={bottomRef} />
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()} placeholder="Pergunta sobre nutrição…" style={{ flex:1, padding:"12px 16px", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:100, fontSize:13, color:"var(--text)", outline:"none", fontFamily:"'Inter',sans-serif" }} />
            <button onClick={() => sendMsg()} disabled={!input.trim()||loading} style={{ width:44, height:44, borderRadius:22, background:"linear-gradient(135deg,var(--green),#2db87a)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}

      {tab === "plano" && (
        <div style={{ padding:"0 24px" }}>
          {!plan ? (
            <>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>Meu objetivo</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[["emagrecer","Emagrecer"],["ganhar_massa","Ganhar massa"],["definir","Definir"],["manter","Manter"],["energia","Mais energia"]].map(([v,l]) => (
                    <button key={v} onClick={() => setObjetivo(v)} style={{ padding:"7px 14px", background:objetivo===v?"linear-gradient(135deg,var(--green),#2db87a)":"var(--surface)", border:`1px solid ${objetivo===v?"var(--green)":"var(--border)"}`, borderRadius:100, fontSize:11, color:objetivo===v?"#000":"var(--text2)", cursor:"pointer" }}>{l}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom:18 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>Quando você treina?</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {[["manha","Manhã"],["almoco","Meio dia"],["tarde","Tarde"],["noite","Noite"]].map(([v,l]) => (
                    <button key={v} onClick={() => setHorario(v)} style={{ padding:"7px 14px", background:horario===v?"linear-gradient(135deg,var(--green),#2db87a)":"var(--surface)", border:`1px solid ${horario===v?"var(--green)":"var(--border)"}`, borderRadius:100, fontSize:11, color:horario===v?"#000":"var(--text2)", cursor:"pointer" }}>{l}</button>
                  ))}
                </div>
              </div>
              <button onClick={generatePlan} disabled={genPlan} style={{ width:"100%", padding:"15px", background:"linear-gradient(135deg,var(--green),#2db87a)", border:"none", borderRadius:100, fontSize:13, color:"#000", fontWeight:700, cursor:"pointer", fontFamily:"'Syne',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                {genPlan ? <><Dots color="#000" />Criando plano…</> : "✦ Criar meu plano alimentar"}
              </button>
            </>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ background:"var(--surface)", border:"1px solid rgba(62,207,142,.2)", borderRadius:14, padding:"14px 16px" }}>
                <div style={{ fontSize:9, letterSpacing:3, color:"var(--green)", textTransform:"uppercase", marginBottom:4, fontFamily:"'Syne',sans-serif" }}>Seu plano</div>
                <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:2 }}>{plan.titulo}</div>
                <div style={{ fontSize:11, color:"var(--text3)" }}>{plan.calorias_aprox}</div>
              </div>
              {plan.refeicoes?.map((r, i) => (
                <div key={i} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 16px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", fontFamily:"'Syne',sans-serif" }}>{r.nome}</div>
                    <div style={{ fontSize:11, color:"var(--text3)" }}>{r.horario}</div>
                  </div>
                  {r.opcoes?.map((op, j) => <div key={j} style={{ fontSize:12, color:"var(--text2)", lineHeight:1.5, padding:"2px 0", borderTop:j>0?"1px solid var(--border)":"none" }}>{j===0?"":"ou "}{op}</div>)}
                  {r.dica && <div style={{ fontSize:11, color:"var(--green)", marginTop:6, fontStyle:"italic" }}>💡 {r.dica}</div>}
                </div>
              ))}
              {[{label:"⚡ Antes do treino",value:plan.antes_treino,color:"var(--orange)"},{label:"💪 Depois do treino",value:plan.depois_treino,color:"var(--blue)"},{label:"💊 Suplemento",value:plan.suplemento,color:"var(--purple)"}].filter(it=>it.value).map(it=>(
                <div key={it.label} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:"14px 16px" }}>
                  <div style={{ fontSize:10, letterSpacing:2, color:it.color, textTransform:"uppercase", marginBottom:5, fontFamily:"'Syne',sans-serif" }}>{it.label}</div>
                  <div style={{ fontSize:13, color:"var(--text2)", lineHeight:1.55 }}>{it.value}</div>
                </div>
              ))}
              {plan.dica_ouro && <div style={{ background:"rgba(201,169,110,.08)", border:"1px solid rgba(201,169,110,.2)", borderRadius:12, padding:"12px 14px" }}><div style={{ fontSize:10, color:"var(--accent)", fontWeight:600, marginBottom:3 }}>✦ Dica de ouro</div><div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.5 }}>{plan.dica_ouro}</div></div>}
              <button onClick={() => { setPlan(null); LS.del(planKey); }} style={{ width:"100%", padding:"11px", background:"transparent", border:"1px solid var(--border)", borderRadius:100, fontSize:11, color:"var(--text3)", cursor:"pointer" }}>Refazer plano</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BarbeariaTab({ user, profile, isPremium, onPaywall, toast, push, onBadgeCheck }) {
  const [section, setSection] = useState("home");
  const [catFilter, setCatFilter] = useState("all");

  const groomingFiltered = catFilter === "all"
    ? GROOMING_PRODUCTS
    : GROOMING_PRODUCTS.filter(p => p.category === catFilter);

  // ── HOME ─────────────────────────────────────────────────────────────────
  if (section === "home") return (
    <div style={{ padding:"0 0 140px" }}>
      {/* Header */}
      <div style={{ padding:"32px 24px 24px" }}>
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>Barbearia</div>
        <h2 style={{ fontSize:30, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", lineHeight:1.1 }}>
          Visual<br />
          <span style={{ background:"linear-gradient(90deg,var(--accent),var(--accent2))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            afiado.
          </span>
        </h2>
      </div>

      <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:12 }}>

        {/* DESTAQUE 1 — Briefing do barbeiro */}
        <button onClick={() => setSection("briefing")} style={{
          width:"100%", padding:"22px", cursor:"pointer", textAlign:"left",
          background:"linear-gradient(135deg,rgba(201,169,110,.16),rgba(201,169,110,.06))",
          border:"1px solid rgba(201,169,110,.3)",
          borderRadius:20, display:"flex", alignItems:"center", gap:18,
          animation:"fadeIn .3s ease"
        }}>
          <div style={{
            width:54, height:54, borderRadius:14, flexShrink:0,
            background:"linear-gradient(135deg,var(--accent),var(--accent2))",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 4px 16px rgba(201,169,110,.3)"
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3l6 6 6-6M6 21l6-6 6 6M12 9v6"/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, letterSpacing:2, color:"var(--accent)", textTransform:"uppercase", marginBottom:4, fontFamily:"'Syne',sans-serif" }}>Exclusivo ✦</div>
            <div style={{ fontSize:17, fontWeight:700, color:"var(--text)", marginBottom:4, fontFamily:"'Syne',sans-serif", lineHeight:1.2 }}>O que pedir ao barbeiro</div>
            <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.4 }}>Gera o texto técnico para mostrar na barbearia. Nunca mais sai frustrado.</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* DESTAQUE 2 — Análise de formato do rosto */}
        <button onClick={() => setSection("analise")} style={{
          width:"100%", padding:"20px", cursor:"pointer", textAlign:"left",
          background:"linear-gradient(135deg,rgba(167,139,250,.1),rgba(167,139,250,.05))",
          border:"1px solid rgba(167,139,250,.25)",
          borderRadius:18, display:"flex", alignItems:"center", gap:16,
          animation:"fadeIn .35s ease .06s both"
        }}>
          <div style={{ width:48, height:48, borderRadius:12, flexShrink:0, background:"rgba(167,139,250,.15)", border:"1px solid rgba(167,139,250,.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"var(--text)", marginBottom:3, fontFamily:"'Syne',sans-serif" }}>Descobrir meu formato de rosto</div>
            <div style={{ fontSize:12, color:"var(--text2)" }}>Tira uma foto — a IA identifica e sugere o corte ideal</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Skincare */}
        <button onClick={() => setSection("skincare")} style={{
          width:"100%", padding:"18px 20px", cursor:"pointer", textAlign:"left",
          background:"var(--surface)", border:"1px solid var(--border)",
          borderRadius:16, display:"flex", alignItems:"center", gap:14,
          animation:"fadeIn .35s ease .1s both"
        }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"rgba(96,165,250,.1)", border:"1px solid rgba(96,165,250,.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:2, fontFamily:"'Syne',sans-serif" }}>Skincare masculino</div>
            <div style={{ fontSize:12, color:"var(--text2)" }}>Chat + plano de cuidados para sua pele</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Divisor */}
        <div style={{ height:1, background:"var(--border)", margin:"4px 0" }} />

        {/* Barbearias parceiras */}
        <button onClick={() => setSection("barbeiros")} style={{
          width:"100%", padding:"16px 20px", cursor:"pointer", textAlign:"left",
          background:"var(--surface)", border:"1px solid var(--border)",
          borderRadius:16, display:"flex", alignItems:"center", gap:14,
          animation:"fadeIn .35s ease .14s both"
        }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"rgba(62,207,142,.1)", border:"1px solid rgba(62,207,142,.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:2, fontFamily:"'Syne',sans-serif" }}>Barbearias parceiras</div>
            <div style={{ fontSize:12, color:"var(--text2)" }}>Fale direto pelo WhatsApp</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        {/* Produtos grooming */}
        <button onClick={() => setSection("produtos")} style={{
          width:"100%", padding:"16px 20px", cursor:"pointer", textAlign:"left",
          background:"var(--surface)", border:"1px solid var(--border)",
          borderRadius:16, display:"flex", alignItems:"center", gap:14,
          animation:"fadeIn .35s ease .18s both"
        }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"rgba(251,146,60,.1)", border:"1px solid rgba(251,146,60,.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:2, fontFamily:"'Syne',sans-serif" }}>Produtos de grooming</div>
            <div style={{ fontSize:12, color:"var(--text2)" }}>Cabelo, barba e pele — os melhores produtos</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  );

  // ── BRIEFING ──────────────────────────────────────────────────────────────
  const Back = () => (
    <button onClick={() => setSection("home")} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:"var(--text2)", fontSize:12, letterSpacing:.5, marginBottom:20, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>
      ← Voltar
    </button>
  );

  if (section === "briefing") return <BriefingBarbeiro user={user} toast={toast} Back={Back} />;
  if (section === "analise")  return <AnaliseRosto user={user} profile={profile} toast={toast} push={push} Back={Back} onBadgeCheck={onBadgeCheck} />;
  if (section === "skincare") return <SkincareSection user={user} isPremium={isPremium} onPaywall={onPaywall} toast={toast} />;

  // ── BARBEIROS ─────────────────────────────────────────────────────────────
  if (section === "barbeiros") return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:28, marginBottom:20 }}><Back /></div>
      <h3 style={{ fontSize:20, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"var(--text)", marginBottom:16 }}>Barbearias Parceiras</h3>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {BARBERSHOPS.map((b,i) => (
          <div key={b.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:18, overflow:"hidden", animation:`fadeIn .35s ease ${i*.07}s both` }}>
            <div style={{ padding:"16px 18px", display:"flex", gap:14, alignItems:"center", borderBottom:"1px solid var(--border)" }}>
              <div style={{ width:48, height:48, borderRadius:14, background:b.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#fff", flexShrink:0 }}>{b.logo}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"var(--text)" }}>{b.name}</div>
                <div style={{ fontSize:11, color:"var(--text2)" }}>📍 {b.city}, {b.state}</div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ fontSize:11, color:"#f59e0b" }}>⭐</span>
                <span style={{ fontSize:12, fontWeight:600, color:"var(--text)" }}>{b.rating}</span>
                <div style={{ width:6, height:6, borderRadius:3, background:b.open?"var(--green)":"var(--text3)", marginLeft:6 }} />
              </div>
            </div>
            <div style={{ padding:"12px 18px" }}>
              <p style={{ fontSize:12, color:"var(--text2)", lineHeight:1.5, marginBottom:12 }}>{b.about}</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
                {b.services?.map(s => <span key={s} style={{ padding:"3px 10px", background:"var(--surface2)", borderRadius:100, fontSize:10, color:"var(--text2)" }}>{s}</span>)}
              </div>
              <button onClick={() => {
                const msg = encodeURIComponent(`Olá! Vi a ${b.name} no app Presença e gostaria de agendar um horário. Quais os horários disponíveis? ✦`);
                window.open(`https://wa.me/${b.whatsapp}?text=${msg}`, "_blank");
                toast(`Abrindo WhatsApp — ${b.name} ✦`);
              }} style={{ width:"100%", padding:"13px", background:"#25d366", border:"none", borderRadius:100, fontSize:12, color:"#fff", cursor:"pointer", fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Agendar pelo WhatsApp
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── PRODUTOS ──────────────────────────────────────────────────────────────
  if (section === "produtos") return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:28, marginBottom:20 }}><Back /></div>
      <h3 style={{ fontSize:20, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"var(--text)", marginBottom:16 }}>Produtos de Grooming</h3>
      <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto", paddingBottom:2 }}>
        {[["all","Todos"],["cabelo","Cabelo"],["barba","Barba"],["skin","Skincare"]].map(([k,l]) => (
          <button key={k} onClick={() => setCatFilter(k)} style={{ padding:"7px 14px", background:catFilter===k?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface)", border:`1px solid ${catFilter===k?"var(--accent)":"var(--border)"}`, borderRadius:100, fontSize:11, color:catFilter===k?"#000":"var(--text2)", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, fontWeight:catFilter===k?700:400 }}>{l}</button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {groomingFiltered.map((p, i) => (
          <div key={p.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, overflow:"hidden", animation:`fadeIn .35s ease ${i*.06}s both` }}>
            <img src={p.img} alt="" style={{ width:"100%", height:130, objectFit:"cover", display:"block" }} onError={e=>e.target.style.background="var(--surface2)"} />
            <div style={{ padding:"10px 12px" }}>
              <div style={{ fontSize:9, letterSpacing:1.5, color:"var(--text3)", textTransform:"uppercase", marginBottom:2 }}>{p.brand}</div>
              <div style={{ fontSize:12, fontWeight:500, color:"var(--text)", marginBottom:6, lineHeight:1.3 }}>{p.name}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--accent)" }}>{p.price}</div>
                <button onClick={() => toast("Abrindo produto… ✦")} style={{ padding:"5px 12px", background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", borderRadius:100, fontSize:9, color:"#000", cursor:"pointer", fontWeight:700 }}>Ver</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESENÇA TOTAL SCORE (combines style + gym + grooming)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PLANO DE 30 DIAS — Algumas perguntas + Tarefas Sequenciais
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// 2. CHECK-IN EMOCIONAL DIÁRIO
// ═══════════════════════════════════════════════════════════════════════════════

const MOODS = [
  { id:"otimo",    label:"Ótimo",     emoji:"🔥", color:"var(--orange)", task:"Compartilhe algo positivo sobre seu estilo hoje." },
  { id:"bem",      label:"Bem",       emoji:"😊", color:"var(--green)", task:"Olhe no espelho por 2 minutos com atenção real." },
  { id:"neutro",   label:"Neutro",    emoji:"😐", color:"var(--text3)",    task:"Vista a peça favorita do seu guarda-roupa agora." },
  { id:"cansado",  label:"Cansado",   emoji:"😮‍💨",color:"var(--purple)", task:"Hidrate o rosto e respire fundo por 1 minuto." },
  { id:"mal",      label:"Mal",       emoji:"😔", color:"var(--red)", task:"Escreva 1 coisa que você gosta em si mesmo." },
];


// ═══════════════════════════════════════════════════════════════════════════════
// 3. CONSULTORIA DE COMPRA RÁPIDA
// ═══════════════════════════════════════════════════════════════════════════════

function OutfitAdvisorTab({ user, profile, isPremium, onPaywall, toast }) {
  const histKey   = `presenca_outfit_hist_${user.id}`;
  const [image, setImage]     = useState(null);
  const [b64, setB64]         = useState(null);
  const [imgType, setImgType] = useState(null);
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(() => LS.get(histKey, []));
  const inputRef = useRef();
  const freeLimit = isPremium ? 999 : 3;
  const canAdvise = history.length < freeLimit;

  const processFile = (file) => {
    if (!file?.type.startsWith("image/")) return;
    setImgType(file.type); setResult(null);
    const r = new FileReader();
    r.onload = e => { setImage(e.target.result); setB64(e.target.result.split(",")[1]); };
    r.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!canAdvise) { onPaywall(); return; }
    setLoading(true); setResult(null);
    try {
      const res = await callClaude({
        system: `Você é personal stylist respondendo em 30 segundos se o cliente deve comprar uma peça. Analise a foto da peça ou outfit e responda em português com 4 seções curtas:
**VEREDITO** — COMPRA ✦ ou PASSA ✗ em letras grandes, com 1 frase de motivo
**COMBINA COM SEU PERFIL** — se encaixa no estilo ${profile?.style || "contemporâneo"} e objetivo ${profile?.goal || "presença"}
**COMO USAR** — 2 sugestões rápidas de como combinar
**ATENÇÃO** — 1 ponto de cuidado ou alternativa melhor
Máximo 150 palavras. Tom direto de stylist amigo.`,
        messages: [{ role:"user", content:"Devo comprar essa peça?" }],
        imageBase64: b64, imageType: imgType,
      });
      setResult(res);
      const entry = { id: uid(), thumbnail: image, result: res, date: new Date().toISOString() };
      const updated = [entry, ...history].slice(0, 20);
      setHistory(updated); LS.set(histKey, updated);
      toast("Consultoria salva ✦");
    } catch { setResult("Erro de conexão. Tente novamente."); }
    setLoading(false);
  };

  return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:24 }}>
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase" }}>Consultoria Rápida</div>
        <h2 style={{ fontSize:26, fontFamily:"'Syne',sans-serif", fontWeight:500, lineHeight:1.2 }}>Compra ou<br />passa?</h2>
        <p style={{ fontSize:13, color:"var(--text2)", marginTop:8, lineHeight:1.6 }}>Mande a foto da peça. Em segundos a IA diz se vale a compra para o seu perfil.</p>
      </div>

      {!canAdvise && (
        <div onClick={onPaywall} style={{ background:"var(--surface2)", borderRadius:14, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
          <Icon n="lock" size={16} color="var(--accent)" />
          <div><div style={{ fontSize:12, color:"#fff", fontWeight:500 }}>Limite gratuito atingido ({freeLimit} consultas)</div><div style={{ fontSize:11, color:"var(--text3)" }}>Assine para consultorias ilimitadas →</div></div>
        </div>
      )}

      {/* Upload zone */}
      <div onClick={() => canAdvise && !image && inputRef.current.click()}
        onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); processFile(e.dataTransfer.files[0]); }}
        style={{ border:`1.5px dashed ${image?"transparent":"#d0d0d0"}`, borderRadius:16, overflow:"hidden", background:"var(--surface)", cursor:canAdvise&&!image?"pointer":"default", marginBottom:16, minHeight:180, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
        {image ? (
          <>
            <img src={image} alt="" style={{ width:"100%", maxHeight:280, objectFit:"cover", display:"block" }} />
            <button onClick={e => { e.stopPropagation(); setImage(null); setB64(null); setResult(null); }}
              style={{ position:"absolute", top:10, right:10, background:"rgba(255,255,255,.9)", border:"none", borderRadius:20, padding:"4px 12px", fontSize:11, cursor:"pointer" }}>TROCAR</button>
          </>
        ) : (
          <div style={{ textAlign:"center", padding:32 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🛍️</div>
            <div style={{ fontSize:13, color:"var(--text2)" }}>Foto da peça ou look completo</div>
            <div style={{ fontSize:11, color:"var(--text3)", marginTop:4 }}>da loja, vitrine ou do provador</div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => processFile(e.target.files[0])} />
      </div>

      {image && !result && (
        <button onClick={analyze} disabled={loading} style={{ width:"100%", padding:"15px", background:loading?"#555":"#1a1a1a", color:"#fff", border:"none", borderRadius:12, fontSize:11, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {loading ? <><Dots color="#fff" /> Analisando…</> : <><Icon n="sparkle" size={14} color="#fff" /> Consultar agora</>}
        </button>
      )}

      {result && (() => {
        const isCompra = result.includes("COMPRA ✦") || result.toUpperCase().includes("COMPRA");
        return (
          <div style={{ animation:"fadeIn .4s ease" }}>
            {/* Veredito highlight */}
            <div style={{ background: isCompra ? "#f0fdf4" : "#fff5f5", border:`2px solid ${isCompra?"#86efac":"#fca5a5"}`, borderRadius:18, padding:"16px 20px", marginBottom:12, textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:4 }}>{isCompra ? "✦" : "✗"}</div>
              <div style={{ fontSize:18, fontFamily:"'Syne',sans-serif", fontWeight:600, color: isCompra?"#166534":"#991b1b" }}>
                {isCompra ? "COMPRA!" : "PASSA"}
              </div>
            </div>
            <div style={{ background:"var(--surface)", border:"1px solid #e8e8e8", borderRadius:16, overflow:"hidden" }}>
              {result.split(/\*\*([^*]+)\*\*/g).filter(Boolean).reduce((acc,s,i)=>{ if(i%2===0)acc.push({title:s});else acc[acc.length-1].body=s;return acc; },[])
                .filter(p=>p.title?.trim() !== "VEREDITO")
                .map((p,i,arr)=>(
                  <div key={i} style={{ padding:"14px 18px", borderBottom:i<arr.length-1?"1px solid #f0f0f0":"none" }}>
                    {p.title && <div style={{ fontSize:9, letterSpacing:3, color:"var(--text2)", marginBottom:5, textTransform:"uppercase" }}>{p.title.trim()}</div>}
                    <p style={{ fontSize:13, color:"var(--text)", lineHeight:1.6, margin:0 }}>{(p.body||"").trim()}</p>
                  </div>
                ))}
            </div>
            <button onClick={() => { setResult(null); setImage(null); setB64(null); }}
              style={{ width:"100%", marginTop:10, padding:"13px", background:"var(--surface2)", border:"none", borderRadius:12, fontSize:11, color:"var(--text2)", cursor:"pointer", letterSpacing:1, textTransform:"uppercase" }}>
              Nova consulta
            </button>
          </div>
        );
      })()}

      {/* History */}
      {history.length > 0 && !result && !image && (
        <div style={{ marginTop:20 }}>
          <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", textTransform:"uppercase", marginBottom:12 }}>Histórico</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {history.slice(0,5).map((h,i) => {
              const isC = h.result.includes("COMPRA ✦") || h.result.toUpperCase().includes("COMPRA");
              return (
                <div key={h.id} style={{ display:"flex", gap:12, alignItems:"center", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:"10px 14px" }}>
                  {h.thumbnail && <img src={h.thumbnail} alt="" style={{ width:50, height:50, borderRadius:10, objectFit:"cover", flexShrink:0 }} />}
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, fontWeight:600, color: isC?"#166534":"#991b1b", marginBottom:2 }}>{isC?"✦ Compra":"✗ Passa"}</div>
                    <div style={{ fontSize:10, color:"var(--text3)" }}>{new Date(h.date).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. AGENDA UNIFICADA
// ═══════════════════════════════════════════════════════════════════════════════

const EVENT_TYPES = {
  treino:      { label:"Treino",        emoji:"💪", color:"var(--orange)" },
  corte:       { label:"Corte/Barba",   emoji:"✂️", color:"var(--text)" },
  consultoria: { label:"Consultoria",   emoji:"👔", color:"var(--accent)" },
  personal:    { label:"Personal",      emoji:"🏋️", color:"var(--blue)" },
  compra:      { label:"Compra",        emoji:"🛍️", color:"#8b5cf6" },
  outro:       { label:"Outro",         emoji:"📌", color:"#6b7280" },
};


function EventCard({ event, onDelete }) {
  const cfg = EVENT_TYPES[event.type] || EVENT_TYPES.outro;
  const isPast = event.date < new Date().toISOString().slice(0,10);
  return (
    <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:14, padding:"12px 14px", display:"flex", gap:12, alignItems:"flex-start", opacity:isPast?0.5:1 }}>
      <div style={{ width:36, height:36, borderRadius:10, background:cfg.color+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{cfg.emoji}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:13, fontWeight:500, color:"var(--text)", marginBottom:2 }}>{event.title}</div>
        <div style={{ fontSize:11, color:"var(--text2)" }}>
          {new Date(event.date+"T12:00:00").toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"})}
          {event.time && ` · ${event.time}`}
          {event.location && ` · ${event.location}`}
        </div>
        {event.notes && <div style={{ fontSize:11, color:"var(--text3)", marginTop:3, fontStyle:"italic" }}>{event.notes}</div>}
      </div>
      <button onClick={() => onDelete(event.id)} style={{ background:"none",border:"none",cursor:"pointer",padding:"2px 0 0",flexShrink:0 }}>
        <Icon n="trash" size={13} color="#e0e0e0" />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DUPLAS DE EVOLUÇÃO
// ═══════════════════════════════════════════════════════════════════════════════


function DuplasTab({ user, profile, toast, push }) {
  return (
    <div style={{ padding:"40px 24px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:400, textAlign:"center" }}>
      <div style={{ fontSize:48, marginBottom:20 }}>👥</div>
      <h2 style={{ fontSize:24, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"var(--text)", marginBottom:10 }}>Em breve</h2>
      <p style={{ fontSize:14, color:"var(--text2)", lineHeight:1.7, maxWidth:280 }}>
        A função de duplas está chegando. Você vai poder se conectar com outra pessoa e evoluir junto — se cobrando toda semana.
      </p>
      <div style={{ marginTop:24, padding:"10px 20px", background:"rgba(201,169,110,.1)", border:"1px solid rgba(201,169,110,.2)", borderRadius:100, fontSize:12, color:"var(--accent)" }}>
        Novidade em breve ✦
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOME SCREEN — Central do dia
// ═══════════════════════════════════════════════════════════════════════════════

function HomeTab({ user, profile, isPremium, onPaywall, toast, push, onBadgeCheck, setActiveTab }) {
  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName  = user?.name?.split(" ")[0] || "você";
  const todayStr   = new Date().toDateString();

  // Context — what did user do (or not do) today
  const outfitDone  = LS.get(`presenca_outfit_today_${user.id}`, null)?.date === todayStr;
  const routineDone = LS.get(`presenca_routine_done_${user.id}`, null) === todayStr;
  const gymDone     = LS.get(`presenca_gym_${user.id}`, {}).lastCheckin === todayStr;
  const gymStreak   = LS.get(`presenca_gym_${user.id}`, {}).streak || 0;
  const plan        = LS.get(`presenca_plan_${user.id}`, null);
  const planProg    = LS.get(`presenca_plan_prog_${user.id}`, {});
  const analyses    = LS.get(`presenca_analyses_${user.id}`, []).length;

  // Pick the single most relevant action for this user right now
  const getPrimaryAction = () => {
    if (!outfitDone) return {
      id:"outfit", section:"outfit",
      label:"O que vestir hoje?",
      sub:"A IA monta 3 looks com o que você já tem",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>
    };
    if (!gymDone) return {
      id:"treino", section:"treino",
      label:"Treino de hoje",
      sub: gymStreak > 0 ? `Você está em ${gymStreak} dias seguidos — não quebre agora!` : "A IA monta o treino em segundos",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11M6.5 17.5h11M3 10h18M3 14h18"/><circle cx="6.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="6.5" r="1.5"/><circle cx="6.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/></svg>
    };
    if (!routineDone) return {
      id:"rotina", section:"rotina",
      label:"Rotina de 7 minutos",
      sub:"3 hábitos rápidos para fechar o dia bem",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    };
    return {
      id:"look", section:"validar",
      label:"Validar meu look",
      sub:"Tira uma foto — a IA diz se está ok",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
    };
  };

  const primary = getPrimaryAction();

  // Context line under greeting
  const getContextLine = () => {
    if (outfitDone && gymDone && routineDone) return "Você completou tudo hoje. Incrível! 🏆";
    const pending = [!outfitDone && "look", !gymDone && "treino", !routineDone && "rotina"].filter(Boolean);
    if (pending.length === 3) return "Nada feito ainda hoje. Vamos começar?";
    if (pending.length === 1) return `Só falta o ${pending[0]} para fechar o dia.`;
    return `Ainda faltam: ${pending.join(" e ")}.`;
  };

  const goTo = (tab, section) => {
    if (section) {
      window.__presencaEstiloSection = section;
      window[`__presencaBack_${section}`] = "Home";
    }
    setActiveTab(tab);
  };

  // Secondary actions (excluding primary)
  const secondaryActions = [
    { id:"outfit",  label:"O que vestir?",    section:"outfit",  tab:"MeuEstilo", done: outfitDone  },
    { id:"treino",  label:"Treino",            section:"treino",  tab:"MeuEstilo", done: gymDone     },
    { id:"look",    label:"Validar look",      section:"validar", tab:"MeuEstilo", done: false       },
    { id:"rotina",  label:"Rotina",            section:"rotina",  tab:"MeuEstilo", done: routineDone },
    { id:"ocasiao", label:"Ocasião especial ✦", section:"ocasiao", tab:"MeuEstilo", done: false      },
  ].filter(a => a.id !== primary.id);

  // Next plan task
  const nextTask = (() => {
    if (!plan) return null;
    const all = plan.semanas?.flatMap((s,wi) => s.dias?.map((d,di)=>({...d,wi,di}))) || [];
    return all.find(t => !planProg[`w${t.wi}d${t.di}`]?.done) || null;
  })();

  return (
    <div style={{ padding:"0 0 140px" }}>

      {/* ── Header pessoal ── */}
      <div style={{ padding:"36px 24px 28px" }}>
        <div style={{ fontSize:11, letterSpacing:3, color:"var(--text3)", textTransform:"uppercase", marginBottom:10, fontFamily:"'Syne',sans-serif" }}>
          {new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}
        </div>
        <h1 style={{ fontSize:32, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", lineHeight:1.1, marginBottom:10 }}>
          {greeting},<br />
          <span style={{ background:"linear-gradient(90deg,#c9a96e,#e8c98a)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            {firstName}.
          </span>
        </h1>
        <p style={{ fontSize:13, color:"var(--text3)", lineHeight:1.5 }}>{getContextLine()}</p>
      </div>

      {/* ── AÇÃO PRINCIPAL — destaque total ── */}
      <div style={{ padding:"0 20px 0" }}>
        <button onClick={() => goTo("MeuEstilo", primary.section)}
          style={{
            width:"100%", padding:"22px 22px", cursor:"pointer", textAlign:"left",
            background:"linear-gradient(135deg,rgba(201,169,110,.14),rgba(201,169,110,.06))",
            border:"1px solid rgba(201,169,110,.25)",
            borderRadius:20, display:"flex", alignItems:"center", gap:18,
            animation:"fadeIn .4s ease"
          }}>
          <div style={{
            width:52, height:52, borderRadius:14, flexShrink:0,
            background:"linear-gradient(135deg,var(--accent),var(--accent2))",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#000", boxShadow:"0 4px 16px rgba(201,169,110,.3)"
          }}>
            {primary.icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:700, color:"var(--text)", marginBottom:5, fontFamily:"'Syne',sans-serif", lineHeight:1.2 }}>
              {primary.label}
            </div>
            <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.4 }}>{primary.sub}</div>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {/* ── Ações secundárias — menores, discretas ── */}
      <div style={{ padding:"10px 20px 0", display:"flex", flexDirection:"column", gap:6 }}>
        {secondaryActions.map((a, i) => (
          <button key={a.id} onClick={() => goTo(a.tab, a.section)}
            style={{
              display:"flex", alignItems:"center", gap:14,
              background: a.done ? "rgba(62,207,142,.05)" : "transparent",
              border: `1px solid ${a.done ? "rgba(62,207,142,.15)" : "var(--border)"}`,
              borderRadius:12, padding:"12px 16px",
              cursor:"pointer", textAlign:"left", width:"100%",
              animation:`fadeIn .3s ease ${i*.06}s both`
            }}>
            <div style={{ width:6, height:6, borderRadius:3, flexShrink:0, background: a.done ? "var(--green)" : "var(--surface3)" }} />
            <div style={{ fontSize:13, color: a.done ? "var(--text3)" : "var(--text2)", textDecoration: a.done ? "line-through" : "none", flex:1 }}>
              {a.label}
            </div>
            {a.done
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            }
          </button>
        ))}
      </div>

      {/* ── Divisor ── */}
      <div style={{ height:1, background:"var(--border)", margin:"20px 20px" }} />

      {/* ── Pills secundários — bem discretos ── */}
      <div style={{ padding:"0 20px", display:"flex", gap:8 }}>
        {[
          { label:"Academia", tab:"Academia" },
          { label:"Barbearia", tab:"Barbearia" },
          { label:"Loja", tab:"Loja" },
        ].map(p => (
          <button key={p.tab} onClick={() => goTo(p.tab)}
            style={{
              flex:1, padding:"10px 6px",
              background:"transparent",
              border:"1px solid var(--border)",
              borderRadius:100, fontSize:11,
              color:"var(--text3)", cursor:"pointer",
              fontFamily:"'Inter',sans-serif", letterSpacing:.3
            }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Plano da semana — só se tiver tarefa pendente ── */}
      {nextTask && (
        <div onClick={() => goTo("Plano")}
          style={{
            margin:"16px 20px 0",
            background:"var(--surface)", border:"1px solid var(--border)",
            borderRadius:14, padding:"14px 18px", cursor:"pointer",
            display:"flex", alignItems:"center", gap:12,
            animation:"fadeIn .4s ease .2s both"
          }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, letterSpacing:2, color:"var(--accent)", textTransform:"uppercase", marginBottom:3, fontFamily:"'Syne',sans-serif" }}>Plano da semana</div>
            <div style={{ fontSize:13, color:"var(--text2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              Próximo: {nextTask.titulo}
            </div>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      )}

      {/* ── Stats discretos no rodapé ── */}
      {analyses > 0 && (
        <div style={{ margin:"14px 20px 0", display:"flex", gap:16 }}>
          {[
            { label:"análises feitas", value: analyses },
            { label:"dias de streak", value: gymStreak },
          ].filter(s => s.value > 0).map(s => (
            <div key={s.label} style={{ fontSize:11, color:"var(--text3)" }}>
              <span style={{ fontWeight:600, color:"var(--text2)", marginRight:4 }}>{s.value}</span>
              {s.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEU ESTILO — Hub com as 7 funcionalidades
// ═══════════════════════════════════════════════════════════════════════════════

function MeuEstiloTab({ user, profile, isPremium, onPaywall, toast, push, onBadgeCheck }) {
  const [section, setSection] = useState(() => {
    const s = window.__presencaEstiloSection;
    if (s) { delete window.__presencaEstiloSection; return s; }
    return "menu";
  });

  const Back = () => (
    <button onClick={() => setSection("menu")} style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:"var(--text2)", fontSize:12, letterSpacing:.5, marginBottom:20, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>
      ← Voltar
    </button>
  );

  // Cria Back button que volta para Home se veio de lá, senão volta pro menu
  const makeBack = (id) => {
    const key = `__presencaBack_${id}`;
    const fromHome = window[key];
    if (fromHome) delete window[key];
    return () => (
      <button onClick={() => fromHome ? window.__presencaSetTab?.("Home") : setSection("menu")}
        style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", cursor:"pointer", color:"var(--text2)", fontSize:12, letterSpacing:.5, marginBottom:20, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>
        ← Voltar
      </button>
    );
  };

  if (section === "outfit")      { const B = makeBack("outfit");      return <OutfitDoDia user={user} profile={profile} toast={toast} Back={B} />; }
  if (section === "guardaroupa") { const B = makeBack("guardaroupa");  return <GuardaRoupa user={user} toast={toast} Back={B} />; }
  if (section === "validar")     { const B = makeBack("validar");      return <ValidarLook user={user} profile={profile} isPremium={isPremium} onPaywall={onPaywall} toast={toast} Back={B} />; }
  if (section === "treino")      { const B = makeBack("treino");       return <TreinoIA user={user} profile={profile} toast={toast} push={push} Back={B} />; }
  if (section === "barbeiro")    { const B = makeBack("barbeiro");     return <BriefingBarbeiro user={user} toast={toast} Back={B} />; }
  if (section === "recomeço")    { const B = makeBack("recomeço");     return <Recalibracao user={user} profile={profile} toast={toast} Back={B} />; }
  if (section === "rotina")      { const B = makeBack("rotina");       return <Rotina7Min user={user} profile={profile} toast={toast} Back={B} />; }
  if (section === "ocasiao")     { const B = makeBack("ocasiao");      return <OcasiaoEspecial user={user} profile={profile} isPremium={isPremium} onPaywall={onPaywall} toast={toast} Back={B} />; }

  // Default menu
  return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:24 }}>
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>Meu Estilo</div>
        <h2 style={{ fontSize:26, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", lineHeight:1.2 }}>Conheça<br />seu estilo.</h2>
        <p style={{ fontSize:13, color:"var(--text2)", marginTop:6, lineHeight:1.5 }}>Ferramentas para entender e evoluir sua imagem.</p>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[
          { id:"ocasiao",     icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, label:"Ocasião especial", desc:"Casamento, entrevista, balada — look certo para cada evento", color:"rgba(201,169,110,.15)", border:"rgba(201,169,110,.3)", highlight:true },
          { id:"guardaroupa", icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="8" y1="3" x2="8" y2="21"/></svg>, label:"Meu guarda-roupa", desc:"Cadastre suas roupas — veja o que combina", color:"rgba(201,169,110,.1)", border:"rgba(201,169,110,.2)" },
          { id:"recomeço",    icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>, label:"Mudei de corpo, e agora?", desc:"Emagreci, engordei — o que muda no meu estilo", color:"rgba(167,139,250,.1)", border:"rgba(167,139,250,.2)" },
          { id:"outfit",      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>, label:"Outfit do dia", desc:"3 looks com o que você já tem em casa", color:"rgba(96,165,250,.1)", border:"rgba(96,165,250,.2)" },
          { id:"validar",     icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>, label:"Esse look está ok?", desc:"Tira uma foto — resposta honesta em segundos", color:"rgba(62,207,142,.1)", border:"rgba(62,207,142,.2)" },
        ].map((item, i) => (
          <button key={item.id} onClick={() => setSection(item.id)}
            style={{ display:"flex", alignItems:"center", gap:16, background:item.highlight?"linear-gradient(135deg,rgba(201,169,110,.12),rgba(201,169,110,.05))":"var(--surface)", border:`1px solid ${item.border||"var(--border)"}`, borderRadius:16, padding:"18px 20px", cursor:"pointer", textAlign:"left", width:"100%", animation:`fadeIn .3s ease ${i*.07}s both`, position:"relative" }}>
            {item.highlight && (
              <div style={{ position:"absolute", top:-8, right:14, background:"linear-gradient(135deg,var(--accent),var(--accent2))", borderRadius:100, padding:"2px 10px", fontSize:9, color:"#000", fontWeight:700, fontFamily:"'Syne',sans-serif", letterSpacing:.5 }}>NOVO</div>
            )}
            <div style={{ width:44, height:44, borderRadius:12, background:item.color, border:`1px solid ${item.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {item.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:item.highlight?"var(--accent)":"var(--text)", marginBottom:3, fontFamily:"'Syne',sans-serif" }}>{item.label}</div>
              <div style={{ fontSize:12, color:"var(--text2)" }}>{item.desc}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Ocasião Especial ──────────────────────────────────────────────────────────
function OcasiaoEspecial({ user, profile, isPremium, onPaywall, toast, Back, onBack }) {
  const histKey = `presenca_ocasiao_hist_${user.id}`;
  const [step, setStep]       = useState("form"); // form | result
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [history, setHistory] = useState(() => LS.get(histKey, []));
  const [form, setForm]       = useState({
    evento: "", tipo: "casamento", ambiente: "formal",
    orcamento: "livre", data: "", extras: ""
  });

  const EVENTOS = [
    { id:"casamento",   label:"Casamento",        emoji:"💍" },
    { id:"formatura",   label:"Formatura",         emoji:"🎓" },
    { id:"entrevista",  label:"Entrevista",        emoji:"💼" },
    { id:"encontro",    label:"Encontro/Date",     emoji:"❤️" },
    { id:"balada",      label:"Balada/Festa",      emoji:"🎉" },
    { id:"churrasco",   label:"Churrasco",         emoji:"🥩" },
    { id:"aniversario", label:"Aniversário",       emoji:"🎂" },
    { id:"jantar",      label:"Jantar especial",   emoji:"🍽️" },
    { id:"outro",       label:"Outro evento",      emoji:"📅" },
  ];

  const AMBIENTES = [
    { id:"formal",    label:"Formal" },
    { id:"semiformal",label:"Semiformal" },
    { id:"casual",    label:"Casual" },
    { id:"outdoor",   label:"Ao ar livre" },
    { id:"praia",     label:"Praia/Piscina" },
  ];

  const ORCAMENTOS = [
    { id:"livre",   label:"Sem limite" },
    { id:"alto",    label:"Até R$ 500" },
    { id:"medio",   label:"Até R$ 200" },
    { id:"baixo",   label:"Até R$ 80"  },
  ];

  const generate = async () => {
    setLoading(true); setResult(null);
    const eventoLabel = EVENTOS.find(e => e.id === form.tipo)?.label || form.tipo;
    try {
      const wardrobe = LS.get(`presenca_wardrobe_${user.id}`, []);
      const pieces = wardrobe.length > 0
        ? `Peças disponíveis no guarda-roupa: ${wardrobe.map(p=>`${p.name} (${p.category}, ${p.color})`).join(", ")}.`
        : "Não há peças cadastradas — sugira peças acessíveis e comuns.";

      const res = await callClaude({
        system: `Você é um stylist amigo que fala simples e entende de moda brasileira. Monte um look completo para uma ocasião especial. Responda com 4 seções:
**O LOOK PERFEITO** — descreva o look completo: cada peça, cor e por que funciona para esse evento. Seja específico.
**DETALHES QUE FAZEM DIFERENÇA** — 2-3 detalhes importantes: acessórios, calçado, cuidados com cabelo/barba
**QUANTO INVESTIR** — estimativa realista de preço para cada peça no Brasil. Total no final.
**DICA DE OURO** — 1 conselho valioso sobre como se portar/sentir bem nesse evento
Máximo 220 palavras. Linguagem de amigo, sem jargão. Seja prático e direto.`,
        messages:[{ role:"user", content:`Evento: ${eventoLabel}. Ambiente: ${form.ambiente}. Orçamento: ${ORCAMENTOS.find(o=>o.id===form.orcamento)?.label}. Data: ${form.data||"em breve"}. Extras: ${form.extras||"nenhum"}. Estilo pessoal: ${profile?.style||"contemporâneo"}. ${pieces}` }],
        maxTokens: 500,
      });
      setResult(res);
      const entry = { id:uid(), evento:eventoLabel, tipo:form.tipo, result:res, date:new Date().toISOString() };
      const updated = [entry, ...history].slice(0, 10);
      setHistory(updated); LS.set(histKey, updated);
      setStep("result");
      toast("Look gerado! ✦");
    } catch { toast("Erro de conexão. Tente novamente."); }
    setLoading(false);
  };

  const eventoAtual = EVENTOS.find(e => e.id === form.tipo);

  if (step === "result" && result) return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:20 }}>
        <Back />
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <span style={{ fontSize:24 }}>{eventoAtual?.emoji}</span>
          <div>
            <div style={{ fontSize:10, letterSpacing:3, color:"var(--accent)", textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>Look para</div>
            <h2 style={{ fontSize:22, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)" }}>{eventoAtual?.label}</h2>
          </div>
        </div>
      </div>

      <div style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:18, overflow:"hidden", animation:"fadeIn .4s ease" }}>
        {result.split(/\*\*([^*]+)\*\*/g).filter(Boolean).reduce((acc,s,i)=>{
          if(i%2===0)acc.push({title:s}); else acc[acc.length-1].body=s; return acc;
        },[]).map((p,i,arr) => (
          <div key={i} style={{ padding:"16px 20px", borderBottom:i<arr.length-1?"1px solid var(--border)":"none" }}>
            {p.title?.trim() && (
              <div style={{ fontSize:9, letterSpacing:3, color:"var(--accent)", marginBottom:8, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>
                {p.title.trim()}
              </div>
            )}
            <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.65, margin:0 }}>{(p.body||"").trim()}</p>
          </div>
        ))}
      </div>

      <ShareCard result={result} type="outfit" userName={user?.name} />

      <button onClick={() => { setStep("form"); setResult(null); }}
        style={{ width:"100%", marginTop:12, padding:"13px", background:"transparent", border:"1px solid var(--border)", borderRadius:100, fontSize:12, color:"var(--text2)", cursor:"pointer", fontFamily:"'Syne',sans-serif" }}>
        Gerar para outro evento
      </button>

      {history.length > 1 && (
        <div style={{ marginTop:20 }}>
          <div style={{ fontSize:10, letterSpacing:3, color:"var(--text3)", textTransform:"uppercase", marginBottom:12, fontFamily:"'Syne',sans-serif" }}>Histórico</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {history.slice(1,4).map((h,i) => {
              const ev = EVENTOS.find(e=>e.id===h.tipo);
              return (
                <div key={h.id} onClick={() => { setResult(h.result); setForm(f=>({...f,tipo:h.tipo})); setStep("result"); }}
                  style={{ display:"flex", alignItems:"center", gap:12, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:12, padding:"12px 16px", cursor:"pointer" }}>
                  <span style={{ fontSize:18 }}>{ev?.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:"var(--text)" }}>{h.evento}</div>
                    <div style={{ fontSize:10, color:"var(--text3)" }}>{new Date(h.date).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</div>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:24 }}>
        <Back />
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>Ocasião Especial</div>
        <h2 style={{ fontSize:26, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", lineHeight:1.2 }}>
          Look certo<br />
          <span style={{ background:"linear-gradient(90deg,var(--accent),var(--accent2))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            para cada evento.
          </span>
        </h2>
        <p style={{ fontSize:13, color:"var(--text2)", marginTop:6, lineHeight:1.5 }}>Diga onde vai — a IA monta o look ideal com orçamento e estilo.</p>
      </div>

      {/* Tipo de evento */}
      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:11, fontWeight:600, color:"var(--text2)", marginBottom:10 }}>Qual é o evento?</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {EVENTOS.map(e => (
            <button key={e.id} onClick={() => setForm(f=>({...f,tipo:e.id}))}
              style={{ padding:"12px 8px", background:form.tipo===e.id?"linear-gradient(135deg,rgba(201,169,110,.2),rgba(201,169,110,.08))":"var(--surface)", border:`1.5px solid ${form.tipo===e.id?"var(--accent)":"var(--border)"}`, borderRadius:14, cursor:"pointer", textAlign:"center", transition:"all .15s" }}>
              <div style={{ fontSize:20, marginBottom:5 }}>{e.emoji}</div>
              <div style={{ fontSize:10, color:form.tipo===e.id?"var(--accent)":"var(--text2)", fontWeight:form.tipo===e.id?600:400, lineHeight:1.2 }}>{e.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Ambiente */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>Ambiente</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {AMBIENTES.map(a => (
            <button key={a.id} onClick={() => setForm(f=>({...f,ambiente:a.id}))}
              style={{ padding:"7px 14px", background:form.ambiente===a.id?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface)", border:`1px solid ${form.ambiente===a.id?"var(--accent)":"var(--border)"}`, borderRadius:100, fontSize:12, color:form.ambiente===a.id?"#000":"var(--text2)", cursor:"pointer", fontWeight:form.ambiente===a.id?700:400 }}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orçamento */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:600, color:"var(--text2)", marginBottom:8 }}>Orçamento para o look</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {ORCAMENTOS.map(o => (
            <button key={o.id} onClick={() => setForm(f=>({...f,orcamento:o.id}))}
              style={{ padding:"7px 14px", background:form.orcamento===o.id?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface)", border:`1px solid ${form.orcamento===o.id?"var(--accent)":"var(--border)"}`, borderRadius:100, fontSize:12, color:form.orcamento===o.id?"#000":"var(--text2)", cursor:"pointer", fontWeight:form.orcamento===o.id?700:400 }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Data e extras */}
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
        <input value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))} type="date"
          style={{ width:"100%", padding:"13px 16px", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:12, fontSize:13, color:"var(--text)", outline:"none", fontFamily:"'Inter',sans-serif" }} />
        <input value={form.extras} onChange={e=>setForm(f=>({...f,extras:e.target.value}))} placeholder="Algum detalhe extra? (ex: praia à noite, evento ao ar livre em julho…)"
          style={{ width:"100%", padding:"13px 16px", background:"var(--surface2)", border:"1px solid var(--border2)", borderRadius:12, fontSize:13, color:"var(--text)", outline:"none", fontFamily:"'Inter',sans-serif" }} />
      </div>

      <button onClick={generate} disabled={loading}
        style={{ width:"100%", padding:"16px", background:"linear-gradient(135deg,#c9a96e,#b8943d)", border:"none", borderRadius:100, fontSize:13, color:"#000", fontWeight:800, cursor:"pointer", fontFamily:"'Syne',sans-serif", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 20px rgba(201,169,110,.25)" }}>
        {loading ? <><Dots color="#000" />Montando look…</> : <>✦ Montar look para {EVENTOS.find(e=>e.id===form.tipo)?.label}</>}
      </button>
    </div>
  );
}

// ── 1. Outfit do Dia ──────────────────────────────────────────────────────────
function OutfitDoDia({ user, profile, toast, Back }) {
  const todayKey = `presenca_outfit_today_${user.id}`;
  const [outfit, setOutfit]     = useState(() => {
    const s = LS.get(todayKey, null);
    return s?.date === new Date().toDateString() ? s : null;
  });
  const [loading, setLoading]   = useState(false);
  const [weather, setWeather]   = useState("");
  const [occasion, setOccasion] = useState("dia normal");
  const wardrobe = LS.get(`presenca_wardrobe_${user.id}`, []);

  const occasions = ["dia normal","trabalho","reunião importante","encontro","academia","evento social","final de semana casual"];

  const generate = async () => {
    setLoading(true);
    const pieces = wardrobe.length > 0
      ? `Peças disponíveis: ${wardrobe.map(p=>`${p.name} (${p.category}, ${p.color})`).join(", ")}.`
      : "O usuário não cadastrou peças ainda — sugira looks baseados em peças comuns que a maioria das pessoas tem.";
    try {
      const res = await callClaude({
        system:`Você é um amigo que entende de estilo e fala de forma simples. Sugira 3 looks diferentes para o dia. Responda SOMENTE em JSON:
{"looks":[{"numero":1,"nome":"string curto","pecas":["peça1","peça2","peça3"],"por_que":"1 frase simples explicando por que funciona","dica":"1 dica prática","emoji":"1 emoji que representa o look"}]}
Seja específico com cores e peças. Fale como um amigo, não como revista de moda. Sem jargão.`,
        messages:[{role:"user", content:`Ocasião: ${occasion}. Clima: ${weather||"não informado"}. Estilo: ${profile?.style||"contemporâneo"}. Objetivo: ${profile?.goal||"presença"}. ${pieces}`}],
        maxTokens: 800,
      });
      let data;
      try { data = JSON.parse(res.replace(/```json|```/g,"").trim()); } catch { data = null; }
      if (data?.looks) {
        const entry = { date: new Date().toDateString(), looks: data.looks, occasion };
        LS.set(todayKey, entry); setOutfit(entry);
        toast("Looks do dia prontos! ✦");
      } else { toast("Erro ao gerar. Tente novamente."); }
    } catch { toast("Erro de conexão."); }
    setLoading(false);
  };

  return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:24 }}>
        <Back />
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase" }}>Outfit do Dia</div>
        <h2 style={{ fontSize:26, fontFamily:"'Syne',sans-serif", fontWeight:500, lineHeight:1.2 }}>O que vestir<br />hoje?</h2>
        <p style={{ fontSize:13, color:"var(--text2)", marginTop:6, lineHeight:1.5 }}>A IA monta 3 opções pra você em segundos. Sem complicar.</p>
      </div>

      {!outfit ? (
        <>
          {wardrobe.length === 0 && (
            <div style={{ background:"rgba(217,119,6,.1)", border:"1px solid rgba(217,119,6,.3)", borderRadius:14, padding:"12px 16px", marginBottom:16, fontSize:12, color:"#d97706", lineHeight:1.5 }}>
              💡 Dica: cadastre suas peças em "Meu guarda-roupa" para sugestões mais certeiras. Por enquanto vou usar peças comuns.
            </div>
          )}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:500, color:"var(--text3)", marginBottom:10 }}>Qual é a ocasião hoje?</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {occasions.map(o => (
                <button key={o} onClick={() => setOccasion(o)}
                  style={{ padding:"7px 14px", background:occasion===o?"#1a1a1a":"#f5f5f5", border:"none", borderRadius:20, fontSize:12, color:occasion===o?"#fff":"#888", cursor:"pointer", transition:"all .15s", textTransform:"capitalize" }}>
                  {o}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:12, fontWeight:500, color:"var(--text3)", marginBottom:8 }}>Como está o clima? (opcional)</div>
            <input value={weather} onChange={e=>setWeather(e.target.value)} placeholder="Ex: quente, frio, nublado, chuva…"
              style={{ width:"100%", padding:"12px 16px", border:"1.5px solid var(--border2)", borderRadius:12, fontSize:13, outline:"none", fontFamily:"'Inter',sans-serif" }} />
          </div>
          <button onClick={generate} disabled={loading}
            style={{ width:"100%", padding:"15px", background:loading?"#555":"#1a1a1a", color:"#fff", border:"none", borderRadius:14, fontSize:12, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {loading ? <><Dots color="#fff" />Montando looks…</> : <>👔 Ver sugestões do dia</>}
          </button>
        </>
      ) : (
        <div style={{ animation:"fadeIn .4s ease" }}>
          <div style={{ fontSize:11, color:"var(--accent)", marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>
            ✦ Sugestões para: <strong>{outfit.occasion}</strong>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {outfit.looks?.map((look, i) => (
              <div key={i} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:18, padding:"18px", animation:`fadeIn .3s ease ${i*.1}s both` }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <span style={{ fontSize:28 }}>{look.emoji}</span>
                  <div>
                    <div style={{ fontSize:9, letterSpacing:2, color:"var(--text3)", textTransform:"uppercase" }}>Look {look.numero}</div>
                    <div style={{ fontSize:16, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"var(--text)" }}>{look.nome}</div>
                  </div>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                  {look.pecas?.map(p => (
                    <div key={p} style={{ padding:"5px 12px", background:"var(--surface2)", borderRadius:20, fontSize:11, color:"var(--text3)" }}>{p}</div>
                  ))}
                </div>
                <div style={{ fontSize:12, color:"var(--text2)", marginBottom:6, lineHeight:1.5 }}>💬 {look.por_que}</div>
                {look.dica && <div style={{ fontSize:11, color:"var(--accent)", fontStyle:"italic" }}>✦ {look.dica}</div>}
              </div>
            ))}
          </div>
          <button onClick={() => { LS.del(todayKey); setOutfit(null); }}
            style={{ width:"100%", marginTop:12, padding:"13px", background:"var(--surface2)", border:"none", borderRadius:14, fontSize:11, color:"var(--text2)", cursor:"pointer", letterSpacing:1, textTransform:"uppercase" }}>
            Gerar novos looks
          </button>
          <ShareCard result={outfit.looks?.map(l=>`${l.nome}: ${l.pecas?.join(', ')}`).join('\n')} type="outfit" userName={user?.name} />
        </div>
      )}
    </div>
  );
}

// ── 2. Guarda-Roupa ───────────────────────────────────────────────────────────
const WARDROBE_CATS = ["camiseta","camisa","calça","bermuda","bermudão","shorts","jaqueta","tênis","sapato","acessório","outro"];
const WARDROBE_COLORS = ["preto","branco","cinza","azul","azul marinho","verde","vermelho","laranja","amarelo","bege","marrom","roxo","rosa","estampado"];

function GuardaRoupa({ user, toast, Back }) {
  const key = `presenca_wardrobe_${user.id}`;
  const [pieces, setPieces] = useState(() => LS.get(key, []));
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter]  = useState("tudo");
  const [form, setForm]      = useState({ name:"", category:"camiseta", color:"preto", brand:"", notes:"" });
  const [unused, setUnused]  = useState([]);

  useEffect(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    setUnused(pieces.filter(p => !p.lastUsed || new Date(p.lastUsed).getTime() < thirtyDaysAgo));
  }, [pieces]);

  const addPiece = () => {
    if (!form.name) return;
    const entry = { ...form, id: uid(), addedAt: new Date().toISOString(), lastUsed: null };
    const updated = [entry, ...pieces];
    setPieces(updated); LS.set(key, updated);
    setShowAdd(false); setForm({ name:"", category:"camiseta", color:"preto", brand:"", notes:"" });
    toast("Peça adicionada ✦");
  };

  const markUsed = (id) => {
    const updated = pieces.map(p => p.id === id ? { ...p, lastUsed: new Date().toISOString() } : p);
    setPieces(updated); LS.set(key, updated);
    toast("Marcado como usado hoje ✦");
  };

  const removePiece = (id) => {
    const updated = pieces.filter(p => p.id !== id);
    setPieces(updated); LS.set(key, updated);
  };

  const filtered = filter === "tudo" ? pieces : pieces.filter(p => p.category === filter);

  return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:20 }}>
        <Back />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase" }}>Guarda-Roupa</div>
            <h2 style={{ fontSize:24, fontFamily:"'Syne',sans-serif", fontWeight:500, lineHeight:1.2 }}>
              {pieces.length} {pieces.length === 1 ? "peça" : "peças"} cadastradas
            </h2>
          </div>
          <button onClick={() => setShowAdd(true)}
            style={{ width:38, height:38, borderRadius:19, background:"var(--surface2)", border:"none", cursor:"pointer", fontSize:20, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center" }}>+</button>
        </div>
      </div>

      {unused.length > 0 && (
        <div style={{ background:"rgba(217,119,6,.1)", border:"1px solid rgba(217,119,6,.3)", borderRadius:14, padding:"12px 16px", marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:500, color:"#d97706", marginBottom:4 }}>⚠️ {unused.length} peça{unused.length>1?"s":""} parada{unused.length>1?"s":""} há mais de 30 dias</div>
          <div style={{ fontSize:11, color:"var(--orange)", lineHeight:1.4 }}>Considere usar, trocar ou doar. Guarda-roupa mais enxuto = mais fácil de se vestir.</div>
        </div>
      )}

      {pieces.length === 0 ? (
        <div style={{ textAlign:"center", paddingTop:40, paddingBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>👗</div>
          <div style={{ fontSize:15, fontFamily:"'Syne',sans-serif", color:"var(--text2)", marginBottom:8 }}>Guarda-roupa vazio</div>
          <p style={{ fontSize:12, color:"var(--text3)", lineHeight:1.6, maxWidth:260, margin:"0 auto 20px" }}>Cadastre suas peças e a IA vai sugerir looks certeiros com o que você já tem.</p>
          <button onClick={() => setShowAdd(true)}
            style={{ padding:"12px 24px", background:"var(--surface2)", border:"none", borderRadius:20, fontSize:12, color:"#fff", cursor:"pointer", letterSpacing:1 }}>
            + Adicionar primeira peça
          </button>
        </div>
      ) : (
        <>
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, marginBottom:14 }}>
            <button onClick={() => setFilter("tudo")} style={{ padding:"6px 14px", background:filter==="tudo"?"#1a1a1a":"#f0f0f0", border:"none", borderRadius:20, fontSize:11, color:filter==="tudo"?"#fff":"#888", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>Tudo ({pieces.length})</button>
            {[...new Set(pieces.map(p=>p.category))].map(cat => (
              <button key={cat} onClick={() => setFilter(cat)} style={{ padding:"6px 14px", background:filter===cat?"#1a1a1a":"#f0f0f0", border:"none", borderRadius:20, fontSize:11, color:filter===cat?"#fff":"#888", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, textTransform:"capitalize" }}>{cat}</button>
            ))}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {filtered.map((p,i) => {
              const isUnused = !p.lastUsed || new Date(p.lastUsed).getTime() < Date.now() - 30*24*60*60*1000;
              return (
                <div key={p.id} style={{ background:"var(--surface)", border:`1px solid ${isUnused?"#fde68a":"#f0f0f0"}`, borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", gap:12, animation:`fadeIn .3s ease ${i*.04}s both` }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:"var(--surface2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                    {p.category==="tênis"||p.category==="sapato"?"👟":p.category==="jaqueta"?"🧥":p.category==="acessório"?"💍":"👕"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:"var(--text)", marginBottom:2 }}>{p.name}</div>
                    <div style={{ fontSize:10, color:"var(--text3)" }}>{p.color} · {p.category}{p.brand ? ` · ${p.brand}` : ""}</div>
                    {isUnused && <div style={{ fontSize:9, color:"#f59e0b", marginTop:2 }}>⚠️ Não usada há 30+ dias</div>}
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                    <button onClick={() => markUsed(p.id)} style={{ padding:"5px 10px", background:"rgba(62,207,142,.1)", border:"1px solid rgba(62,207,142,.25)", borderRadius:20, fontSize:10, color:"var(--green)", cursor:"pointer" }}>Usei</button>
                    <button onClick={() => removePiece(p.id)} style={{ background:"none", border:"none", cursor:"pointer" }}><Icon n="trash" size={13} color="#e0e0e0" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add modal */}
      {showAdd && (
        <div style={{ position:"fixed", inset:0, zIndex:600, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"flex-end", backdropFilter:"blur(4px)" }}>
          <div style={{ background:"var(--surface)", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"28px 24px 48px", animation:"slideUp .3s ease", maxHeight:"85vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontSize:17, fontFamily:"'Syne',sans-serif", fontWeight:600 }}>Adicionar peça</div>
              <button onClick={() => setShowAdd(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><Icon n="close" size={18} color="#aaa"/></button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Nome da peça (ex: Camiseta branca básica) *"
                style={{ width:"100%", padding:"12px 16px", border:"1.5px solid var(--border2)", borderRadius:12, fontSize:13, outline:"none", fontFamily:"'Inter',sans-serif" }} />
              <div>
                <div style={{ fontSize:11, color:"var(--text2)", marginBottom:8 }}>Tipo</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {WARDROBE_CATS.map(c => (
                    <button key={c} onClick={() => setForm(f=>({...f,category:c}))}
                      style={{ padding:"6px 12px", background:form.category===c?"#1a1a1a":"#f5f5f5", border:"none", borderRadius:20, fontSize:11, color:form.category===c?"#fff":"#888", cursor:"pointer", textTransform:"capitalize" }}>{c}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:"var(--text2)", marginBottom:8 }}>Cor principal</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {WARDROBE_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f=>({...f,color:c}))}
                      style={{ padding:"6px 12px", background:form.color===c?"#1a1a1a":"#f5f5f5", border:"none", borderRadius:20, fontSize:11, color:form.color===c?"#fff":"#888", cursor:"pointer" }}>{c}</button>
                  ))}
                </div>
              </div>
              <input value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))} placeholder="Marca (opcional)"
                style={{ width:"100%", padding:"12px 16px", border:"1.5px solid var(--border2)", borderRadius:12, fontSize:13, outline:"none", fontFamily:"'Inter',sans-serif" }} />
            </div>
            <button onClick={addPiece} disabled={!form.name}
              style={{ width:"100%", marginTop:16, padding:"15px", background:form.name?"#1a1a1a":"#e0e0e0", color:form.name?"#fff":"#aaa", border:"none", borderRadius:14, fontSize:12, letterSpacing:2, textTransform:"uppercase", cursor:form.name?"pointer":"default" }}>
              Adicionar ao guarda-roupa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3. Validar Look ───────────────────────────────────────────────────────────
function ValidarLook({ user, profile, isPremium, onPaywall, toast, Back }) {
  const histKey = `presenca_validar_hist_${user.id}`;
  const [image, setImage]   = useState(null);
  const [b64, setB64]       = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [occasion, setOccasion] = useState("trabalho");
  const [history, setHistory]  = useState(() => LS.get(histKey, []));
  const [showShare, setShowShare] = useState(false);
  const inputRef = useRef();

  const occasions = ["trabalho","reunião importante","encontro","balada","academia","casual","evento social","entrevista"];

  const validate = async () => {
    if (!b64) return;
    setLoading(true); setResult(null);
    try {
      const res = await callClaude({
        system:`Você é um amigo honesto que entende de moda e fala simples. A pessoa vai sair e quer saber se o look está adequado. Responda em português com 3 seções curtas:
**VEREDITO** — APROVADO ✦ ou AJUSTAR ✗ — fala direta, 1 frase, como um amigo
**O QUE FUNCIONA** — 1-2 coisas que estão boas (seja específico)
**O QUE MUDAR** — se tiver algo, diga exatamente o que trocar. Se estiver ótimo, diga isso
Máximo 120 palavras. Fale simples. Sem jargão de moda. Seja honesto mas gentil.`,
        messages:[{role:"user", content:`Vou para: ${occasion}. Meu estilo: ${profile?.style||"contemporâneo"}. O look está ok?`}],
        imageBase64: b64, imageType:"image/jpeg",
      });
      setResult(res);
      const entry = { id:uid(), thumbnail:image, result:res, occasion, date:new Date().toISOString() };
      const updated = [entry,...history].slice(0,10);
      setHistory(updated); LS.set(histKey, updated);
      toast("Validação salva ✦");
    } catch { setResult("Erro. Tente de novo."); }
    setLoading(false);
  };

  const isApproved = result?.includes("APROVADO");

  return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:24 }}>
        <Back />
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase" }}>Validar Look</div>
        <h2 style={{ fontSize:26, fontFamily:"'Syne',sans-serif", fontWeight:500, lineHeight:1.2 }}>Esse look<br />está ok?</h2>
        <p style={{ fontSize:13, color:"var(--text2)", marginTop:6, lineHeight:1.5 }}>Manda foto antes de sair. Resposta honesta em segundos.</p>
      </div>

      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:500, color:"var(--text3)", marginBottom:8 }}>Para onde você vai?</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {occasions.map(o => (
            <button key={o} onClick={() => setOccasion(o)}
              style={{ padding:"7px 14px", background:occasion===o?"#1a1a1a":"#f5f5f5", border:"none", borderRadius:20, fontSize:12, color:occasion===o?"#fff":"#888", cursor:"pointer", transition:"all .15s", textTransform:"capitalize" }}>{o}</button>
          ))}
        </div>
      </div>

      <div onClick={() => !image && inputRef.current.click()}
        onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f?.type.startsWith("image/")){const r=new FileReader();r.onload=ev=>{setImage(ev.target.result);setB64(ev.target.result.split(",")[1]);};r.readAsDataURL(f);}}}
        style={{ border:`1.5px dashed ${image?"transparent":"#d0d0d0"}`, borderRadius:16, overflow:"hidden", background:"var(--surface)", cursor:!image?"pointer":"default", marginBottom:16, minHeight:180, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
        {image ? (
          <><img src={image} alt="" style={{ width:"100%", maxHeight:280, objectFit:"cover", display:"block" }} />
          <button onClick={e=>{e.stopPropagation();setImage(null);setB64(null);setResult(null);}} style={{ position:"absolute",top:10,right:10,background:"rgba(255,255,255,.9)",border:"none",borderRadius:20,padding:"4px 12px",fontSize:11,cursor:"pointer" }}>TROCAR</button></>
        ) : (
          <div style={{ textAlign:"center", padding:32 }}>
            <div style={{ fontSize:32, marginBottom:8 }}>🪞</div>
            <div style={{ fontSize:13, color:"var(--text2)" }}>Foto do seu look agora</div>
            <div style={{ fontSize:11, color:"var(--text3)", marginTop:4 }}>pode ser selfie ou foto inteira</div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>{setImage(ev.target.result);setB64(ev.target.result.split(",")[1]);};r.readAsDataURL(f);}}} />
      </div>

      {image && !result && (
        <button onClick={validate} disabled={loading}
          style={{ width:"100%", padding:"15px", background:loading?"#555":"#1a1a1a", color:"#fff", border:"none", borderRadius:14, fontSize:12, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {loading ? <><Dots color="#fff" />Avaliando…</> : <>🪞 Validar look</>}
        </button>
      )}

      {result && (
        <div style={{ animation:"fadeIn .4s ease" }}>
          <div style={{ background:isApproved?"#f0fdf4":"#fff5f5", border:`2px solid ${isApproved?"#86efac":"#fca5a5"}`, borderRadius:18, padding:"16px 20px", marginBottom:12, textAlign:"center" }}>
            <div style={{ fontSize:24, marginBottom:4 }}>{isApproved?"✦":"✗"}</div>
            <div style={{ fontSize:18, fontFamily:"'Syne',sans-serif", fontWeight:600, color:isApproved?"#166534":"#991b1b" }}>
              {isApproved ? "Aprovado! Pode ir." : "Tem coisa pra ajustar"}
            </div>
          </div>
          <div style={{ background:"var(--surface)", border:"1px solid #e8e8e8", borderRadius:16, overflow:"hidden" }}>
            {result.split(/\*\*([^*]+)\*\*/g).filter(Boolean).reduce((acc,s,i)=>{if(i%2===0)acc.push({title:s});else acc[acc.length-1].body=s;return acc;},[])
              .filter(p=>p.title?.trim()!=="VEREDITO")
              .map((p,i,arr)=>(
                <div key={i} style={{ padding:"14px 18px", borderBottom:i<arr.length-1?"1px solid #f0f0f0":"none" }}>
                  {p.title&&<div style={{ fontSize:9,letterSpacing:3,color:"var(--text2)",marginBottom:5,textTransform:"uppercase" }}>{p.title.trim()}</div>}
                  <p style={{ fontSize:13,color:"var(--text)",lineHeight:1.6,margin:0 }}>{(p.body||"").trim()}</p>
                </div>
              ))}
          </div>
          <button onClick={() => {setResult(null);setImage(null);setB64(null);}}
            style={{ width:"100%", marginTop:10, padding:"13px", background:"var(--surface2)", border:"none", borderRadius:12, fontSize:11, color:"var(--text2)", cursor:"pointer", letterSpacing:1, textTransform:"uppercase" }}>
            Validar outro look
          </button>
          <ShareCard result={result} type="validar" userName={user?.name} />
        </div>
      )}
    </div>
  );
}

// ── 4. Treino IA ──────────────────────────────────────────────────────────────
function TreinoIA({ user, profile, toast, push, Back }) {
  const todayKey = `presenca_treino_hoje_${user.id}`;
  const [treino, setTreino]     = useState(() => { const t=LS.get(todayKey,null); return t?.date===new Date().toDateString()?t:null; });
  const [loading, setLoading]   = useState(false);
  const [local, setLocal]       = useState("academia");
  const [duracao, setDuracao]   = useState("45min");
  const [foco, setFoco]         = useState("corpo todo");
  const gymData = LS.get(`presenca_gym_${user.id}`, {});

  const locais   = ["academia","em casa","sem equipamento","ao ar livre"];
  const duracoes = ["20min","30min","45min","1 hora"];
  const focos    = ["corpo todo","peito e tríceps","costas e bíceps","pernas","ombros","abdômen","cardio"];

  const generate = async () => {
    setLoading(true);
    try {
      const res = await callClaude({
        system:`Você é personal trainer que fala simples. Monte um treino completo para hoje. Responda SOMENTE em JSON:
{"nome":"string","aquecimento":["ex1","ex2"],"exercicios":[{"nome":"string","series":"string","reps":"string","descanso":"string","dica":"string curta"}],"volta_calma":["ex1","ex2"],"total_tempo":"string","motivacao":"1 frase de incentivo simples"}
Máximo 6 exercícios principais. Seja específico e prático. Sem jargão técnico.`,
        messages:[{role:"user", content:`Local: ${local}. Tempo disponível: ${duracao}. Foco: ${foco}. Tipo de corpo: ${gymData.biotype||"não informado"}. Objetivo: ${profile?.goal||"presença"}.`}],
        maxTokens:1000,
      });
      let data; try { data=JSON.parse(res.replace(/```json|```/g,"").trim()); } catch { data=null; }
      if (data) {
        const entry = { ...data, date:new Date().toDateString(), local, duracao, foco };
        LS.set(todayKey, entry); setTreino(entry);
        toast("Treino do dia pronto! ✦");
        push?.("analysis_ready","Treino montado!",`${duracao} de ${foco}. Bora!`);
      } else { toast("Erro ao gerar treino."); }
    } catch { toast("Erro de conexão."); }
    setLoading(false);
  };

  return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:24 }}>
        <Back />
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase" }}>Treino de Hoje</div>
        <h2 style={{ fontSize:26, fontFamily:"'Syne',sans-serif", fontWeight:500, lineHeight:1.2 }}>A IA monta<br />seu treino.</h2>
        <p style={{ fontSize:13, color:"var(--text2)", marginTop:6, lineHeight:1.5 }}>Diga onde e quanto tempo você tem. O resto é com a gente.</p>
      </div>

      {!treino ? (
        <>
          {[{label:"Onde você vai treinar?",opts:locais,val:local,set:setLocal},{label:"Quanto tempo tem?",opts:duracoes,val:duracao,set:setDuracao},{label:"Qual parte do corpo?",opts:focos,val:foco,set:setFoco}].map(({label,opts,val,set})=>(
            <div key={label} style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"var(--text3)", marginBottom:8 }}>{label}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {opts.map(o=>(
                  <button key={o} onClick={()=>set(o)} style={{ padding:"7px 14px", background:val===o?"#f97316":"#f5f5f5", border:"none", borderRadius:20, fontSize:12, color:val===o?"#fff":"#888", cursor:"pointer", transition:"all .15s" }}>{o}</button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={generate} disabled={loading}
            style={{ width:"100%", padding:"15px", background:loading?"#555":"#f97316", color:"#fff", border:"none", borderRadius:14, fontSize:12, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {loading?<><Dots color="#fff"/>Montando treino…</>:<>💪 Montar treino do dia</>}
          </button>
        </>
      ) : (
        <div style={{ animation:"fadeIn .4s ease" }}>
          <div style={{ background:"var(--orange)", borderRadius:18, padding:"18px 20px", marginBottom:14 }}>
            <div style={{ fontSize:18, fontFamily:"'Syne',sans-serif", color:"#fff", fontWeight:500, marginBottom:4 }}>{treino.nome}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.7)" }}>{treino.local} · {treino.duracao} · {treino.foco}</div>
            {treino.motivacao && <div style={{ fontSize:12, color:"rgba(255,255,255,.8)", marginTop:8, fontStyle:"italic" }}>"{treino.motivacao}"</div>}
          </div>

          {treino.aquecimento?.length>0 && (
            <div style={{ background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:"14px 16px",marginBottom:10 }}>
              <div style={{ fontSize:10,letterSpacing:2,color:"var(--text3)",textTransform:"uppercase",marginBottom:8 }}>Aquecimento</div>
              {treino.aquecimento.map((e,i)=><div key={i} style={{ fontSize:13,color:"var(--text3)",marginBottom:3 }}>• {e}</div>)}
            </div>
          )}

          <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:10 }}>
            {treino.exercicios?.map((ex,i)=>(
              <div key={i} style={{ background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:"14px 16px",animation:`fadeIn .3s ease ${i*.07}s both` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}>
                  <div style={{ fontSize:14,fontWeight:500,color:"var(--text)" }}>{ex.nome}</div>
                  <div style={{ fontSize:11,color:"var(--orange)",fontWeight:600,flexShrink:0,marginLeft:8 }}>{ex.series} × {ex.reps}</div>
                </div>
                {ex.dica&&<div style={{ fontSize:11,color:"var(--text2)",lineHeight:1.4 }}>💡 {ex.dica}</div>}
                {ex.descanso&&<div style={{ fontSize:10,color:"var(--text3)",marginTop:4 }}>Descanso: {ex.descanso}</div>}
              </div>
            ))}
          </div>

          {treino.volta_calma?.length>0 && (
            <div style={{ background:"rgba(62,207,142,.1)",border:"1px solid rgba(62,207,142,.25)",borderRadius:14,padding:"14px 16px",marginBottom:14 }}>
              <div style={{ fontSize:10,letterSpacing:2,color:"var(--green)",textTransform:"uppercase",marginBottom:8 }}>Volta à calma</div>
              {treino.volta_calma.map((e,i)=><div key={i} style={{ fontSize:13,color:"var(--green)",marginBottom:3 }}>• {e}</div>)}
            </div>
          )}
          <button onClick={()=>{LS.del(todayKey);setTreino(null);}}
            style={{ width:"100%",padding:"13px",background:"var(--surface2)",border:"none",borderRadius:14,fontSize:11,color:"var(--text2)",cursor:"pointer",letterSpacing:1,textTransform:"uppercase" }}>
            Gerar outro treino
          </button>
        </div>
      )}
    </div>
  );
}

// ── 5. O que pedir ao barbeiro ──────────────────────────────────────────────────────
function BriefingBarbeiro({ user, toast, Back }) {
  const [answers, setAnswers] = useState({ comprimento:"médio", estilo:"clássico", barba:"sem barba", problema:"nenhum" });
  const [briefing, setBriefing] = useState(() => LS.get(`presenca_briefing_${user.id}`, null));
  const [loading, setLoading]  = useState(false);
  const [copied, setCopied]    = useState(false);

  const opts = {
    comprimento:["bem curto","curto","médio","comprido"],
    estilo:["clássico e limpo","moderno e despojado","fade/degradê","texturizado","undercut","não sei, quero sugestão"],
    barba:["sem barba","fazer a barba","aparar a barba","barba desenhada","deixar crescer organizado"],
    problema:["nenhum","cabelo muito liso","cabelo muito crespo","calvície","crescimento irregular","costeletas grossas"],
  };

  const generate = async () => {
    setLoading(true);
    try {
      const res = await callClaude({
        system:"Você cria briefings para barbearia em português simples. Gere um texto CURTO (máx 4 linhas) que o cliente mostra ao barbeiro. Seja específico com termos técnicos que barbeiro entende. Comece com 'Quero...' ou 'Preciso...'. Adicione 1 referência de comprimento com número (ex: máquina 2 na lateral).",
        messages:[{role:"user", content:`Comprimento desejado: ${answers.comprimento}. Estilo: ${answers.estilo}. Barba: ${answers.barba}. Problema: ${answers.problema}.`}],
        maxTokens:200,
      });
      LS.set(`presenca_briefing_${user.id}`, res);
      setBriefing(res);
      toast("Briefing criado! Mostre ao barbeiro. ✦");
    } catch { toast("Erro. Tente novamente."); }
    setLoading(false);
  };

  const copy = () => { navigator.clipboard.writeText(briefing).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); }); };

  return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:24 }}>
        <Back />
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase" }}>O que pedir ao barbeiro</div>
        <h2 style={{ fontSize:26, fontFamily:"'Syne',sans-serif", fontWeight:500, lineHeight:1.2 }}>O que pedir<br />ao barbeiro?</h2>
        <p style={{ fontSize:13, color:"var(--text2)", marginTop:6, lineHeight:1.5 }}>Responda 4 perguntas e a IA cria o texto pra você mostrar direto no celular.</p>
      </div>

      {!briefing ? (
        <>
          {Object.entries(opts).map(([key, values])=>(
            <div key={key} style={{ marginBottom:16 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"var(--text3)", marginBottom:8, textTransform:"capitalize" }}>
                {key==="comprimento"?"Comprimento que quer":key==="estilo"?"Estilo do corte":key==="barba"?"E a barba?":"Tem algum problema?"}
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {values.map(v=>(
                  <button key={v} onClick={()=>setAnswers(a=>({...a,[key]:v}))}
                    style={{ padding:"7px 14px", background:answers[key]===v?"#1a1a1a":"#f5f5f5", border:"none", borderRadius:20, fontSize:12, color:answers[key]===v?"#fff":"#888", cursor:"pointer", transition:"all .15s" }}>{v}</button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={generate} disabled={loading}
            style={{ width:"100%", padding:"15px", background:loading?"#555":"#1a1a1a", color:"#fff", border:"none", borderRadius:14, fontSize:12, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            {loading?<><Dots color="#fff"/>Criando briefing…</>:<>✂️ Criar briefing</>}
          </button>
        </>
      ) : (
        <div style={{ animation:"fadeIn .4s ease" }}>
          <div style={{ background:"var(--surface2)", borderRadius:20, padding:"24px 20px", marginBottom:16 }}>
            <div style={{ fontSize:9, letterSpacing:3, color:"var(--text3)", textTransform:"uppercase", marginBottom:12 }}>📱 Mostre isso ao barbeiro</div>
            <p style={{ fontSize:16, fontFamily:"'Syne',sans-serif", color:"#e8e4de", lineHeight:1.7, margin:0 }}>{briefing}</p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={copy}
              style={{ flex:1, padding:"14px", background:copied?"#4ade80":"#f5f5f5", border:"none", borderRadius:14, fontSize:11, color:copied?"#fff":"#555", cursor:"pointer", letterSpacing:1, transition:"all .2s" }}>
              {copied?"✓ Copiado!":"Copiar texto"}
            </button>
            <button onClick={()=>{LS.del(`presenca_briefing_${user.id}`);setBriefing(null);}}
              style={{ flex:1, padding:"14px", background:"var(--surface2)", border:"none", borderRadius:14, fontSize:11, color:"var(--text2)", cursor:"pointer", letterSpacing:1 }}>
              Refazer
            </button>
          </div>
          <div style={{ marginTop:12, padding:"12px 16px", background:"rgba(96,165,250,.1)", borderRadius:12, fontSize:11, color:"var(--blue)", lineHeight:1.5 }}>
            💡 Salve o texto ou tire print para mostrar na barbearia sem precisar de internet.
          </div>
        </div>
      )}
    </div>
  );
}

// ── 6. Mudei de corpo, e agora? ────────────────────────────────────────
function Recalibracao({ user, profile, toast, Back }) {
  const [step, setStep]     = useState("form"); // form | result
  const [answers, setAnswers] = useState({ mudanca:"emagreci", quanto:"5-10kg", sentimento:"perdido", tempo:"recente" });
  const [result, setResult] = useState(() => LS.get(`presenca_recomeço_${user.id}`, null));
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await callClaude({
        system:`Você é stylist amigo ajudando alguém que passou por transformação corporal. Fale simples, com empatia. Responda com 4 seções:
**O QUE MUDOU** — reconheça a transformação de forma positiva
**O QUE AINDA FUNCIONA** — peças do guarda-roupa que provavelmente ainda servem
**O QUE PRECISA MUDAR** — tipos de peça para priorizar agora
**POR ONDE COMEÇAR** — 3 passos práticos, do mais simples ao mais elaborado
Máximo 200 palavras. Seja encorajador e prático. Fale como um amigo, não como revista.`,
        messages:[{role:"user", content:`Mudança: ${answers.mudanca} ${answers.quanto}. Sentimento: ${answers.sentimento}. Tempo: ${answers.tempo}. Estilo anterior: ${profile?.style||"não informado"}.`}],
      });
      LS.set(`presenca_recomeço_${user.id}`, res);
      setResult(res); setStep("result");
      toast("Análise pronta ✦");
    } catch { toast("Erro de conexão."); }
    setLoading(false);
  };

  const opts = {
    mudanca:    ["emagreci","engordei","fiz musculação","tive filho/filha","envelheci","cortei o cabelo radicalmente"],
    quanto:     ["pouco (1-4kg)","médio (5-10kg)","bastante (10kg+)","não foi peso, foi composição"],
    sentimento: ["perdido(a)","animado(a) pra recomeçar","com vergonha do guarda-roupa","sem saber o que combina"],
    tempo:      ["recente (menos de 1 mês)","faz alguns meses","já faz mais de 1 ano"],
  };

  const labelMap = { mudanca:"O que mudou?", quanto:"Quanto mudou?", sentimento:"Como você está se sentindo?", tempo:"Quando aconteceu?" };

  if (step === "result" && result) return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:20 }}>
        <Back />
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase" }}>Mudança de corpo</div>
        <h2 style={{ fontSize:24, fontFamily:"'Syne',sans-serif", fontWeight:500, lineHeight:1.2 }}>Seu novo ponto<br />de partida.</h2>
      </div>
      <div style={{ background:"var(--surface)", border:"1px solid #e8e8e8", borderRadius:16, overflow:"hidden", animation:"fadeIn .4s ease", marginBottom:12 }}>
        {result.split(/\*\*([^*]+)\*\*/g).filter(Boolean).reduce((acc,s,i)=>{if(i%2===0)acc.push({title:s});else acc[acc.length-1].body=s;return acc;},[])
          .map((p,i,arr)=>(
            <div key={i} style={{ padding:"16px 18px", borderBottom:i<arr.length-1?"1px solid #f0f0f0":"none" }}>
              {p.title&&<div style={{ fontSize:9,letterSpacing:3,color:"var(--text2)",marginBottom:6,textTransform:"uppercase" }}>{p.title.trim()}</div>}
              <p style={{ fontSize:13,color:"var(--text)",lineHeight:1.65,margin:0 }}>{(p.body||"").trim()}</p>
            </div>
          ))}
      </div>
      <button onClick={()=>{LS.del(`presenca_recomeço_${user.id}`);setResult(null);setStep("form");}}
        style={{ width:"100%",padding:"13px",background:"var(--surface2)",border:"none",borderRadius:14,fontSize:11,color:"var(--text2)",cursor:"pointer",letterSpacing:1,textTransform:"uppercase" }}>
        Refazer análise
      </button>
    </div>
  );

  return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:24 }}>
        <Back />
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase" }}>Mudança de corpo</div>
        <h2 style={{ fontSize:26, fontFamily:"'Syne',sans-serif", fontWeight:500, lineHeight:1.2 }}>Meu estilo<br />mudou.</h2>
        <p style={{ fontSize:13, color:"var(--text2)", marginTop:6, lineHeight:1.5 }}>Corpo mudou, guarda-roupa não acompanhou? A IA te ajuda a recomeçar sem precisar de tudo novo.</p>
      </div>
      {Object.entries(opts).map(([key, values])=>(
        <div key={key} style={{ marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:500, color:"var(--text3)", marginBottom:8 }}>{labelMap[key]}</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {values.map(v=>(
              <button key={v} onClick={()=>setAnswers(a=>({...a,[key]:v}))}
                style={{ padding:"7px 14px", background:answers[key]===v?"#1a1a1a":"#f5f5f5", border:"none", borderRadius:20, fontSize:12, color:answers[key]===v?"#fff":"#888", cursor:"pointer", transition:"all .15s" }}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      <button onClick={generate} disabled={loading}
        style={{ width:"100%", padding:"15px", background:loading?"#555":"#1a1a1a", color:"#fff", border:"none", borderRadius:14, fontSize:12, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        {loading?<><Dots color="#fff"/>Analisando…</>:<>🔄 Recomeçar do zero</>}
      </button>
    </div>
  );
}

// ── 7. Rotina de 7 Minutos ────────────────────────────────────────────────────
function Rotina7Min({ user, profile, toast, Back }) {
  const todayKey = `presenca_routine_done_${user.id}`;
  const doneToday = LS.get(todayKey, null) === new Date().toDateString();
  const [checkedItems, setCheckedItems] = useState(() => LS.get(`presenca_routine_items_${user.id}`, {}));
  const [routine, setRoutine] = useState(() => LS.get(`presenca_routine_7min_${user.id}`, null));
  const [loading, setLoading] = useState(false);

  const genRoutine = async () => {
    setLoading(true);
    try {
      const res = await callClaude({
        system:`Você é um amigo que ajuda pessoas a se cuidarem em pouco tempo. Crie uma rotina de exatamente 7 minutos para hoje. Responda SOMENTE em JSON:
{"saudacao":"string curta motivadora","acoes":[{"id":"1","emoji":"emoji","titulo":"string","descricao":"instrução simples (1 frase)","tempo":"X min","categoria":"rosto|cabelo|roupa|corpo|mental"}]}
Máximo 4 ações simples. Total = 7 min. Fale como amigo. Sem produto caro, sem técnica complicada.`,
        messages:[{role:"user", content:`Perfil: ${profile?.style||"contemporâneo"}, ${profile?.goal||"presença"}. Manhã rápida de autocuidado.`}],
        maxTokens:500,
      });
      let data; try { data=JSON.parse(res.replace(/```json|```/g,"").trim()); } catch { data=null; }
      if (data) { LS.set(`presenca_routine_7min_${user.id}`, data); setRoutine(data); }
      else { toast("Erro ao gerar. Tente novamente."); }
    } catch { toast("Erro de conexão."); }
    setLoading(false);
  };

  const toggleItem = (id) => {
    const updated = { ...checkedItems, [id]: !checkedItems[id] };
    setCheckedItems(updated);
    LS.set(`presenca_routine_items_${user.id}`, updated);
    const allDone = routine?.acoes?.every(a => updated[a.id]);
    if (allDone) { LS.set(todayKey, new Date().toDateString()); toast("Rotina de 7 minutos concluída! ✦"); }
  };

  const catColor = { rosto:"#f472b6", cabelo:"var(--accent)", roupa:"#818cf8", corpo:"#f97316", mental:"#34d399" };

  return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:24 }}>
        <Back />
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:8, textTransform:"uppercase" }}>Rotina Rápida</div>
        <h2 style={{ fontSize:26, fontFamily:"'Syne',sans-serif", fontWeight:500, lineHeight:1.2 }}>7 minutos<br />de cuidado.</h2>
        <p style={{ fontSize:13, color:"var(--text2)", marginTop:6, lineHeight:1.5 }}>3 a 4 ações simples pra você sair de casa se sentindo bem. Nada complicado.</p>
      </div>

      {doneToday && (
        <div style={{ background:"rgba(62,207,142,.1)", border:"1px solid rgba(62,207,142,.25)", borderRadius:16, padding:"14px 18px", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:24 }}>✅</span>
          <div>
            <div style={{ fontSize:13, fontWeight:500, color:"var(--green)" }}>Rotina feita hoje!</div>
            <div style={{ fontSize:11, color:"var(--green)" }}>Ótimo hábito. Volte amanhã.</div>
          </div>
        </div>
      )}

      {!routine ? (
        <button onClick={genRoutine} disabled={loading}
          style={{ width:"100%", padding:"15px", background:loading?"#555":"#f472b6", color:"#fff", border:"none", borderRadius:14, fontSize:12, letterSpacing:2, textTransform:"uppercase", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {loading?<><Dots color="#fff"/>Montando rotina…</>:<>⏱️ Montar rotina do dia</>}
        </button>
      ) : (
        <div style={{ animation:"fadeIn .4s ease" }}>
          {routine.saudacao && (
            <div style={{ fontSize:14, color:"var(--text3)", fontStyle:"italic", marginBottom:16, lineHeight:1.5 }}>"{routine.saudacao}"</div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:14 }}>
            {routine.acoes?.map((a,i)=>{
              const done = checkedItems[a.id];
              return (
                <div key={a.id} onClick={() => toggleItem(a.id)}
                  style={{ background:done?"#f0fdf4":"#fff", border:`1.5px solid ${done?"#bbf7d0":"#f0f0f0"}`, borderRadius:16, padding:"14px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, transition:"all .2s", animation:`fadeIn .3s ease ${i*.08}s both` }}>
                  <div style={{ width:38, height:38, borderRadius:19, background:done?"#4ade80":catColor[a.categoria]+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, transition:"background .2s" }}>
                    {done?"✓":a.emoji}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color:done?"#166534":"#1a1a1a", textDecoration:done?"line-through":"none", marginBottom:2 }}>{a.titulo}</div>
                    <div style={{ fontSize:11, color:done?"#4ade80":"#aaa", lineHeight:1.4 }}>{a.descricao}</div>
                  </div>
                  <div style={{ fontSize:10, color:"var(--text3)", flexShrink:0 }}>{a.tempo}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={()=>{LS.del(`presenca_routine_7min_${user.id}`);setRoutine(null);setCheckedItems({});LS.set(`presenca_routine_items_${user.id}`,{});}}
              style={{ flex:1, padding:"13px", background:"var(--surface2)", border:"none", borderRadius:14, fontSize:11, color:"var(--text2)", cursor:"pointer", letterSpacing:1, textTransform:"uppercase" }}>Nova rotina</button>
            <button onClick={()=>{ routine.acoes?.forEach(a=>toggleItem(a.id)); }}
              style={{ flex:2, padding:"13px", background:"var(--green)", border:"none", borderRadius:14, fontSize:11, color:"#fff", cursor:"pointer", letterSpacing:1, fontWeight:600 }}>✓ Marcar tudo feito</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loja Hub ─────────────────────────────────────────────────────────────────
function LojaHub({ user, profile, isPremium, onPaywall, toast, push, onBadgeCheck }) {
  const [section, setSection] = useState("menu");

  // Sub-sections
  if (section === "consultoria") return (
    <OutfitAdvisorTab user={user} profile={profile} isPremium={isPremium} onPaywall={onPaywall} toast={toast}
      Back={() => setSection("menu")} />
  );
  if (section === "lookbooks") return <LojaLookbooks toast={toast} onBack={() => setSection("menu")} />;
  if (section === "consultores") return <LojaConsultores user={user} toast={toast} onBack={() => setSection("menu")} />;
  if (section === "acessorios") return <LojaAcessorios toast={toast} onBack={() => setSection("menu")} />;

  return (
    <div style={{ padding:"0 24px 140px" }}>
      {/* Header */}
      <div style={{ paddingTop:32, marginBottom:28 }}>
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:10, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>Loja</div>
        <h2 style={{ fontSize:30, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", lineHeight:1.15, marginBottom:6 }}>
          Compre<br />
          <span style={{ background:"linear-gradient(90deg,var(--accent),var(--accent2))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            melhor.
          </span>
        </h2>
        <p style={{ fontSize:13, color:"var(--text2)", lineHeight:1.5 }}>Ferramentas para você nunca errar uma compra.</p>
      </div>

      {/* DESTAQUE — Consultoria de compra */}
      <button onClick={() => setSection("consultoria")} style={{
        width:"100%", padding:"22px", cursor:"pointer", textAlign:"left",
        background:"linear-gradient(135deg,rgba(201,169,110,.14),rgba(201,169,110,.06))",
        border:"1px solid rgba(201,169,110,.25)",
        borderRadius:20, marginBottom:14,
        display:"flex", flexDirection:"column", gap:14,
        animation:"fadeIn .4s ease"
      }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div style={{ padding:"6px 12px", background:"rgba(201,169,110,.15)", border:"1px solid rgba(201,169,110,.25)", borderRadius:100 }}>
            <span style={{ fontSize:10, color:"var(--accent)", fontWeight:600, letterSpacing:1.5, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>Mais usado</span>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
        <div>
          <div style={{ fontSize:20, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", marginBottom:6 }}>Devo comprar essa peça?</div>
          <div style={{ fontSize:13, color:"var(--text2)", lineHeight:1.5 }}>Manda a foto da peça ou do look no provador. A IA decide em segundos se vale a compra para o seu estilo.</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:4, background:"var(--green)" }} />
          <span style={{ fontSize:11, color:"var(--green)" }}>Resposta em menos de 30 segundos</span>
        </div>
      </button>

      {/* Seções secundárias */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {[
          {
            id:"lookbooks",
            icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
            label:"Guias de Looks",
            desc:"Lookbooks de estilistas verificados",
            color:"rgba(96,165,250,.1)", border:"rgba(96,165,250,.2)"
          },
          {
            id:"consultores",
            icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--purple)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
            label:"Consultores de Estilo",
            desc:"Agende 1h com um especialista",
            color:"rgba(167,139,250,.1)", border:"rgba(167,139,250,.2)"
          },
          {
            id:"acessorios",
            icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
            label:"Acessórios",
            desc:"Peças exclusivas para completar o look",
            color:"rgba(62,207,142,.1)", border:"rgba(62,207,142,.2)"
          },
        ].map((item, i) => (
          <button key={item.id} onClick={() => setSection(item.id)}
            style={{ display:"flex", alignItems:"center", gap:16, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"16px 18px", cursor:"pointer", textAlign:"left", width:"100%", animation:`fadeIn .3s ease ${i*.07}s both` }}>
            <div style={{ width:44, height:44, borderRadius:12, background:item.color, border:`1px solid ${item.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {item.icon}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"var(--text)", marginBottom:3, fontFamily:"'Syne',sans-serif" }}>{item.label}</div>
              <div style={{ fontSize:12, color:"var(--text2)" }}>{item.desc}</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Loja sub-sections ─────────────────────────────────────────────────────────
function LojaLookbooks({ toast, onBack }) {
  return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
        <button onClick={onBack} style={{ background:"none",border:"none",cursor:"pointer",padding:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style={{ fontSize:20, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"var(--text)" }}>Guias de Looks</h2>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {LOOKBOOKS.map((lb,i) => (
          <div key={lb.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, overflow:"hidden", animation:`fadeIn .35s ease ${i*.06}s both` }}>
            <img src={lb.img} alt="" style={{ width:"100%", height:120, objectFit:"cover", display:"block" }} onError={e=>e.target.style.background="var(--surface2)"} />
            <div style={{ padding:"10px 12px" }}>
              <div style={{ fontSize:9, letterSpacing:1.5, color:"var(--accent)", textTransform:"uppercase", marginBottom:3 }}>{lb.stylist}</div>
              <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", lineHeight:1.3, marginBottom:6 }}>{lb.title}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--text)" }}>{lb.price}</div>
                <button onClick={()=>toast("Abrindo guia… ✦")} style={{ padding:"5px 12px", background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", borderRadius:100, fontSize:9, color:"#000", cursor:"pointer", fontWeight:700 }}>Ver</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LojaConsultores({ user, toast, onBack }) {
  const [booking, setBooking] = useState(null);
  const [date, setDate] = useState("");
  return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
        <button onClick={onBack} style={{ background:"none",border:"none",cursor:"pointer",padding:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style={{ fontSize:20, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"var(--text)" }}>Consultores de Estilo</h2>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {STYLIST_PROFILES.map((s,i) => (
          <div key={s.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:18, padding:"18px", animation:`fadeIn .35s ease ${i*.07}s both` }}>
            <div style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:12 }}>
              <div style={{ position:"relative" }}>
                <div style={{ width:48,height:48,borderRadius:24,background:"linear-gradient(135deg,var(--surface2),var(--surface3))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"var(--text2)" }}>{s.avatar}</div>
                {s.online && <div style={{ position:"absolute",bottom:1,right:1,width:11,height:11,borderRadius:6,background:"var(--green)",border:"2px solid var(--surface)" }}/>}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                  <div style={{ fontSize:14,fontWeight:600,color:"var(--text)",fontFamily:"'Syne',sans-serif" }}>{s.name}</div>
                  {s.verified && <span style={{ fontSize:9,background:"rgba(62,207,142,.15)",color:"var(--green)",padding:"2px 7px",borderRadius:100 }}>✓</span>}
                </div>
                <div style={{ fontSize:11,color:"var(--text2)",marginBottom:3 }}>{s.title}</div>
                <div style={{ fontSize:11,color:"var(--text3)" }}>⭐ {s.rating} · {s.reviews} avaliações</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:14,fontWeight:700,color:"var(--accent)" }}>{s.price_consult}</div>
                <div style={{ fontSize:9,color:"var(--text3)" }}>por hora</div>
              </div>
            </div>
            <button onClick={() => setBooking(s)}
              style={{ width:"100%",padding:"12px",background:"linear-gradient(135deg,var(--accent),var(--accent2))",border:"none",borderRadius:100,fontSize:11,color:"#000",cursor:"pointer",fontWeight:700,fontFamily:"'Syne',sans-serif" }}>
              Agendar consulta
            </button>
          </div>
        ))}
      </div>
      {booking && (
        <div style={{ position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"flex-end",backdropFilter:"blur(6px)" }}>
          <div style={{ background:"var(--surface)",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,margin:"0 auto",padding:"28px 24px 44px",animation:"slideUp .3s ease" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <div>
                <div style={{ fontSize:10,letterSpacing:3,color:"var(--text3)",textTransform:"uppercase",marginBottom:3 }}>Agendar consulta</div>
                <div style={{ fontSize:17,fontFamily:"'Syne',sans-serif",fontWeight:600,color:"var(--text)" }}>{booking.name}</div>
              </div>
              <button onClick={()=>setBooking(null)} style={{ background:"none",border:"none",cursor:"pointer" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <input value={date} onChange={e=>setDate(e.target.value)} type="date"
              style={{ width:"100%",padding:"13px 16px",background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:12,fontSize:13,color:"var(--text)",outline:"none",fontFamily:"'Inter',sans-serif",marginBottom:14 }} />
            <button onClick={()=>{ toast(`Consulta agendada com ${booking.name} ✦`); setBooking(null); setDate(""); }} disabled={!date}
              style={{ width:"100%",padding:"15px",background:date?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface3)",color:date?"#000":"var(--text3)",border:"none",borderRadius:100,fontSize:12,fontWeight:700,cursor:date?"pointer":"default",fontFamily:"'Syne',sans-serif" }}>
              Confirmar agendamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LojaAcessorios({ toast, onBack }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? ACCESSORIES : ACCESSORIES.filter(a => a.category === filter);
  return (
    <div style={{ padding:"0 24px 140px" }}>
      <div style={{ paddingTop:32, marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
        <button onClick={onBack} style={{ background:"none",border:"none",cursor:"pointer",padding:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 style={{ fontSize:20, fontFamily:"'Syne',sans-serif", fontWeight:600, color:"var(--text)" }}>Acessórios</h2>
      </div>
      <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:4, marginBottom:16 }}>
        {["all","lenços","cintos","óculos","bolsas","joias"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:"6px 14px", background:filter===f?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface)", border:`1px solid ${filter===f?"var(--accent)":"var(--border)"}`, borderRadius:100, fontSize:11, color:filter===f?"#000":"var(--text2)", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, fontWeight:filter===f?600:400 }}>
            {f === "all" ? "Todos" : f}
          </button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {filtered.map((acc,i) => (
          <div key={acc.id} style={{ background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, overflow:"hidden", animation:`fadeIn .35s ease ${i*.06}s both` }}>
            <img src={acc.img} alt="" style={{ width:"100%", height:130, objectFit:"cover", display:"block" }} onError={e=>e.target.style.background="var(--surface2)"} />
            <div style={{ padding:"10px 12px" }}>
              <div style={{ fontSize:9, letterSpacing:1.5, color:"var(--text3)", textTransform:"uppercase", marginBottom:2 }}>{acc.brand}</div>
              <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", lineHeight:1.3, marginBottom:6 }}>{acc.name}</div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"var(--text)" }}>{acc.price}</div>
                <button onClick={()=>toast("Abrindo produto… ✦")} style={{ padding:"5px 12px", background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", borderRadius:100, fontSize:9, color:"#000", cursor:"pointer", fontWeight:700 }}>Ver</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Brechó ───────────────────────────────────────────────────────────────────

const BRECHO_CATS = ["camiseta","camisa","calça","jaqueta","vestido","saia","bermuda","tênis","sapato","acessório","bolsa","relógio","mochila","perfume","óculos","eletrônico","livro","outro"];
const BRECHO_SIZES = ["PP","P","M","G","GG","XG","34","36","38","40","42","44","46","48","único"];
const BRECHO_CONDITIONS = [
  { id:"novo",      label:"Novo com etiqueta",  emoji:"✨", color:"var(--green)" },
  { id:"otimo",     label:"Ótimo estado",       emoji:"⭐", color:"var(--accent)" },
  { id:"bom",       label:"Bom estado",         emoji:"👍", color:"#60a5fa" },
  { id:"usado",     label:"Usado (com marcas)", emoji:"🔄", color:"#f59e0b" },
];

const DISCLAIMER = "O Presença apenas conecta compradores e vendedores. Toda negociação, pagamento e entrega é de responsabilidade exclusiva dos usuários. O app não se responsabiliza por transações, produtos ou qualquer problema decorrente das negociações.";

// Seed listings for demo
const SEED_LISTINGS = [
  { id:"sl1", title:"Jaqueta Jeans Oversized", category:"jaqueta", size:"M", price:"R$ 85", condition:"otimo", brand:"Zara", description:"Usada poucas vezes, sem marcas. Cor azul médio clássico.", city:"São Paulo - SP", whatsapp:"5511999990001", sellerName:"Ana C.", createdAt: new Date(Date.now()-86400000*2).toISOString() },
  { id:"sl2", title:"Tênis New Balance 574",   category:"tênis",   size:"40", price:"R$ 180",condition:"bom",  brand:"New Balance", description:"Comprei e ficou grande. Usado 3 vezes. Sem caixa.", city:"Curitiba - PR", whatsapp:"5541999990002", sellerName:"Pedro M.", createdAt: new Date(Date.now()-86400000*5).toISOString() },
  { id:"sl3", title:"Blazer Preto Slim",       category:"camisa",  size:"G",  price:"R$ 120",condition:"otimo",brand:"Renner", description:"Blazer masculino preto, corte slim. Usado 2x. Impecável.", city:"Porto Alegre - RS", whatsapp:"5551999990003", sellerName:"Lucas F.", createdAt: new Date(Date.now()-86400000*1).toISOString() },
  { id:"sl4", title:"Bolsa Estruturada Caramelo",category:"bolsa", size:"único",price:"R$ 95",condition:"bom", brand:"sem marca", description:"Bolsa feminina caramelo, alça dupla. Pequeno arranhão na base.", city:"Belo Horizonte - MG", whatsapp:"5531999990004", sellerName:"Julia R.", createdAt: new Date(Date.now()-86400000*3).toISOString() },
  { id:"sl5", title:"Camiseta Básica Branca",  category:"camiseta",size:"M",  price:"R$ 25", condition:"otimo",brand:"Hering",  description:"Pacote com 2 camisetas brancas básicas. Lavadas, sem uso.", city:"Taquara - RS", whatsapp:"5551999990005", sellerName:"Carlos B.", createdAt: new Date(Date.now()-86400000*7).toISOString() },
  { id:"sl6", title:"Calça Alfaiataria Bege",  category:"calça",   size:"38",  price:"R$ 140",condition:"novo",  brand:"Farm",   description:"Comprei na promoção e não serviu. Nova com etiqueta.", city:"Rio de Janeiro - RJ", whatsapp:"5521999990006", sellerName:"Mariana S.", createdAt: new Date(Date.now()-86400000*4).toISOString() },
];

function BrechoTab({ user, toast }) {
  const key = `presenca_brecho_${user.id}`;
  const [listings, setListings]     = useState(() => {
    const mine = LS.get(key, []);
    return [...SEED_LISTINGS, ...mine];
  });
  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState("tudo");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ title:"", category:"camiseta", size:"M", price:"", condition:"otimo", brand:"", description:"", city:"", whatsapp:"" });
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const photoInputRef = useRef();

  const myListings = LS.get(key, []);

  const addListing = () => {
    if (!form.title || !form.price || !form.city || !form.whatsapp) return;
    const entry = { ...form, photo: photoDataUrl || null, id: uid(), sellerName: user.name?.split(" ")[0] || "Você", createdAt: new Date().toISOString(), userId: user.id };
    const updated = [entry, ...myListings];
    LS.set(key, updated);
    setListings([entry, ...listings]);
    setShowAddModal(false);
    setForm({ title:"", category:"camiseta", size:"M", price:"", condition:"otimo", brand:"", description:"", city:"", whatsapp:"" });
    setPhotoDataUrl(null);
    toast("Anúncio publicado! ✦");
  };

  const openWhatsApp = (item) => {
    const msg = encodeURIComponent(`Olá ${item.sellerName}! Vi seu anúncio no Presença: "${item.title}" por ${item.price}. Ainda disponível? 🤝`);
    window.open(`https://wa.me/${item.whatsapp}?text=${msg}`, "_blank");
  };

  const condLabel = { novo:"Novo", otimo:"Ótimo estado", bom:"Bom estado", usado:"Usado" };
  const condColor = { novo:"var(--green)", otimo:"var(--accent)", bom:"var(--blue)", usado:"var(--text3)" };

  const filtered = listings.filter(l => {
    const matchCat    = filter === "tudo" || l.category === filter;
    const matchSearch = !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.brand?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const fmt = (d) => {
    const diff = Math.floor((Date.now() - new Date(d)) / 86400000);
    return diff === 0 ? "hoje" : diff === 1 ? "ontem" : `${diff}d atrás`;
  };

  const cats = ["tudo", ...BRECHO_CATS.slice(0,7)];

  return (
    <div style={{ padding:"0 0 140px" }}>
      {/* Header */}
      <div style={{ padding:"32px 24px 20px" }}>
        <div style={{ fontSize:10, letterSpacing:3, color:"var(--text2)", marginBottom:10, textTransform:"uppercase", fontFamily:"'Syne',sans-serif" }}>Brechó</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
          <h2 style={{ fontSize:28, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", lineHeight:1.15 }}>
            Compre e venda<br />
            <span style={{ background:"linear-gradient(90deg,var(--accent),var(--accent2))", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              entre pessoas.
            </span>
          </h2>
          <button onClick={() => setShowAddModal(true)} style={{ padding:"10px 18px", background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", borderRadius:100, fontSize:12, color:"#000", cursor:"pointer", fontWeight:700, fontFamily:"'Syne',sans-serif", flexShrink:0, marginLeft:12 }}>
            + Vender
          </button>
        </div>
      </div>

      {/* Busca */}
      <div style={{ padding:"0 24px", marginBottom:14 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:100, padding:"11px 18px" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar peça ou marca…"
            style={{ flex:1, border:"none", outline:"none", fontSize:13, background:"transparent", color:"var(--text)", fontFamily:"'Inter',sans-serif" }} />
          {search && <button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"var(--text3)",fontSize:16,lineHeight:1 }}>×</button>}
        </div>
      </div>

      {/* Filtro de categoria — scroll horizontal */}
      <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"0 24px 14px", scrollbarWidth:"none" }}>
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)} style={{
            padding:"7px 16px", background:filter===c?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface)",
            border:`1px solid ${filter===c?"var(--accent)":"var(--border)"}`,
            borderRadius:100, fontSize:11, color:filter===c?"#000":"var(--text2)",
            cursor:"pointer", whiteSpace:"nowrap", flexShrink:0,
            fontWeight:filter===c?700:400, transition:"all .15s",
            fontFamily:"'Syne',sans-serif"
          }}>
            {c === "tudo" ? `Tudo (${listings.length})` : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
      </div>

      {/* Grid de anúncios */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:"center", paddingTop:48, color:"var(--text3)" }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
          <div style={{ fontSize:14, color:"var(--text2)", marginBottom:6 }}>Nenhum anúncio encontrado</div>
          <div style={{ fontSize:12, color:"var(--text3)" }}>Seja o primeiro a vender aqui!</div>
          <button onClick={() => setShowAddModal(true)} style={{ marginTop:16, padding:"11px 24px", background:"linear-gradient(135deg,var(--accent),var(--accent2))", border:"none", borderRadius:100, fontSize:12, color:"#000", cursor:"pointer", fontWeight:700 }}>
            + Publicar anúncio
          </button>
        </div>
      ) : (
        <div style={{ padding:"0 20px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {filtered.map((item, i) => {
            const ismine = item.userId === user.id;
            return (
              <div key={item.id} onClick={() => setSelectedItem(item)}
                style={{ background:"var(--surface)", border:`1px solid ${ismine?"rgba(201,169,110,.2)":"var(--border)"}`, borderRadius:16, overflow:"hidden", cursor:"pointer", animation:`fadeIn .3s ease ${i*.04}s both`, position:"relative" }}>
                {/* Condition dot */}
                <div style={{ position:"absolute", top:8, left:8, zIndex:2, display:"flex", alignItems:"center", gap:4, background:"rgba(10,10,10,.75)", backdropFilter:"blur(8px)", borderRadius:100, padding:"3px 8px" }}>
                  <div style={{ width:5, height:5, borderRadius:3, background:condColor[item.condition], flexShrink:0 }} />
                  <span style={{ fontSize:9, color:"var(--text)", fontWeight:500 }}>{condLabel[item.condition]}</span>
                </div>
                {ismine && <div style={{ position:"absolute", top:8, right:8, zIndex:2, background:"rgba(201,169,110,.9)", borderRadius:100, padding:"2px 8px", fontSize:8, color:"#000", fontWeight:700, fontFamily:"'Syne',sans-serif" }}>Seu</div>}

                {/* Image */}
                {item.photo ? (
                  <img src={item.photo} alt={item.title} style={{ width:"100%", height:130, objectFit:"cover", display:"block" }} />
                ) : (
                  <div style={{ height:130, background:"var(--surface2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--surface3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>
                  </div>
                )}

                <div style={{ padding:"10px 12px" }}>
                  <div style={{ fontSize:9, letterSpacing:1, color:"var(--text3)", textTransform:"uppercase", marginBottom:2 }}>{item.category} · {item.size}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:"var(--text)", lineHeight:1.3, marginBottom:6, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{item.title}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontSize:14, fontWeight:700, color:"var(--accent)" }}>{item.price}</div>
                    <div style={{ fontSize:9, color:"var(--text3)" }}>{fmt(item.createdAt)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <div style={{ position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"flex-end",backdropFilter:"blur(8px)" }}>
          <div style={{ background:"var(--surface)",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,margin:"0 auto",padding:"0 0 44px",animation:"slideUp .3s ease",maxHeight:"90vh",overflowY:"auto" }}>
            {/* Photo */}
            {selectedItem.photo ? (
              <img src={selectedItem.photo} alt="" style={{ width:"100%", maxHeight:260, objectFit:"cover", display:"block", borderRadius:"24px 24px 0 0" }} />
            ) : (
              <div style={{ height:160, background:"var(--surface2)", borderRadius:"24px 24px 0 0", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--surface3)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>
              </div>
            )}

            <div style={{ padding:"20px 24px 0" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ flex:1, paddingRight:12 }}>
                  <div style={{ fontSize:10,letterSpacing:2,color:"var(--text3)",textTransform:"uppercase",marginBottom:4 }}>{selectedItem.category} · Tam. {selectedItem.size}</div>
                  <div style={{ fontSize:20,fontFamily:"'Syne',sans-serif",fontWeight:700,color:"var(--text)",lineHeight:1.2 }}>{selectedItem.title}</div>
                </div>
                <button onClick={() => setSelectedItem(null)} style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:100,padding:"6px 10px",cursor:"pointer" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                <div style={{ fontSize:26,fontWeight:700,color:"var(--accent)",fontFamily:"'Syne',sans-serif" }}>{selectedItem.price}</div>
                <div style={{ padding:"4px 10px",background:`${condColor[selectedItem.condition]}18`,border:`1px solid ${condColor[selectedItem.condition]}33`,borderRadius:100 }}>
                  <span style={{ fontSize:11,color:condColor[selectedItem.condition],fontWeight:600 }}>{condLabel[selectedItem.condition]}</span>
                </div>
              </div>

              {selectedItem.description && <p style={{ fontSize:13,color:"var(--text2)",lineHeight:1.6,marginBottom:14 }}>{selectedItem.description}</p>}

              <div style={{ display:"flex", gap:14, fontSize:12, color:"var(--text3)", marginBottom:20, flexWrap:"wrap" }}>
                {selectedItem.brand && <span>🏷️ {selectedItem.brand}</span>}
                <span>📍 {selectedItem.city}</span>
                <span>👤 {selectedItem.sellerName}</span>
              </div>

              <button onClick={() => openWhatsApp(selectedItem)}
                style={{ width:"100%",padding:"15px",background:"#25d366",border:"none",borderRadius:100,fontSize:13,color:"#fff",cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:"'Syne',sans-serif" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Falar com {selectedItem.sellerName} no WhatsApp
              </button>

              <p style={{ fontSize:10,color:"var(--text3)",textAlign:"center",marginTop:12,lineHeight:1.5 }}>
                O Presença conecta. Negociação, pagamento e entrega são responsabilidade dos usuários.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div style={{ position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,.8)",display:"flex",alignItems:"flex-end",backdropFilter:"blur(8px)" }}>
          <div style={{ background:"var(--surface)",borderRadius:"24px 24px 0 0",width:"100%",maxWidth:480,margin:"0 auto",padding:"28px 24px 48px",animation:"slideUp .3s ease",maxHeight:"92vh",overflowY:"auto" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <div>
                <div style={{ fontSize:10,letterSpacing:3,color:"var(--accent)",textTransform:"uppercase",marginBottom:3,fontFamily:"'Syne',sans-serif" }}>Brechó</div>
                <div style={{ fontSize:18,fontFamily:"'Syne',sans-serif",fontWeight:700,color:"var(--text)" }}>Anunciar peça</div>
              </div>
              <button onClick={()=>{setShowAddModal(false);setPhotoDataUrl(null);}} style={{ background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:100,padding:"6px 10px",cursor:"pointer" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Legal — compacto */}
            <div style={{ background:"rgba(201,169,110,.08)",border:"1px solid rgba(201,169,110,.2)",borderRadius:12,padding:"10px 14px",marginBottom:18,fontSize:11,color:"rgba(201,169,110,.8)",lineHeight:1.5 }}>
              ⚠️ O Presença apenas conecta compradores e vendedores. Toda negociação é responsabilidade dos usuários.
            </div>

            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              {/* Foto */}
              <div>
                <div style={{ fontSize:11,color:"var(--text2)",marginBottom:7,fontWeight:500 }}>Foto da peça</div>
                <input ref={photoInputRef} type="file" accept="image/*" style={{ display:"none" }}
                  onChange={e=>{ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>setPhotoDataUrl(ev.target.result); r.readAsDataURL(f); }} />
                {!photoDataUrl ? (
                  <div onClick={()=>photoInputRef.current.click()} style={{ border:"1.5px dashed var(--border2)",borderRadius:14,padding:"24px",textAlign:"center",cursor:"pointer",background:"var(--surface2)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin:"0 auto 8px",display:"block" }}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <div style={{ fontSize:13,color:"var(--text3)" }}>Toque para adicionar foto</div>
                    <div style={{ fontSize:11,color:"var(--text3)",opacity:.6,marginTop:3 }}>Quem vê foto compra mais rápido</div>
                  </div>
                ) : (
                  <div style={{ position:"relative",borderRadius:14,overflow:"hidden" }}>
                    <img src={photoDataUrl} alt="" style={{ width:"100%",maxHeight:200,objectFit:"cover",display:"block" }} />
                    <button onClick={()=>setPhotoDataUrl(null)} style={{ position:"absolute",top:8,right:8,background:"rgba(0,0,0,.7)",border:"none",borderRadius:100,padding:"4px 12px",fontSize:11,color:"#fff",cursor:"pointer" }}>Trocar</button>
                  </div>
                )}
              </div>

              <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Título do anúncio * (ex: Tênis Nike 42 branco)"
                style={{ width:"100%",padding:"13px 16px",background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:12,fontSize:13,color:"var(--text)",outline:"none",fontFamily:"'Inter',sans-serif" }} />

              {/* Categoria */}
              <div>
                <div style={{ fontSize:11,color:"var(--text2)",marginBottom:7,fontWeight:500 }}>Tipo</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6 }}>
                  {BRECHO_CATS.slice(0,10).map(c=>(
                    <button key={c} onClick={()=>setForm(f=>({...f,category:c}))}
                      style={{ padding:"6px 12px",background:form.category===c?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface2)",border:`1px solid ${form.category===c?"var(--accent)":"var(--border)"}`,borderRadius:100,fontSize:11,color:form.category===c?"#000":"var(--text2)",cursor:"pointer",fontWeight:form.category===c?600:400 }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estado */}
              <div>
                <div style={{ fontSize:11,color:"var(--text2)",marginBottom:7,fontWeight:500 }}>Estado</div>
                <div style={{ display:"flex",gap:8 }}>
                  {[["novo","Novo"],["otimo","Ótimo"],["bom","Bom"],["usado","Usado"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setForm(f=>({...f,condition:v}))}
                      style={{ flex:1,padding:"9px 4px",background:form.condition===v?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface2)",border:`1px solid ${form.condition===v?"var(--accent)":"var(--border)"}`,borderRadius:100,fontSize:11,color:form.condition===v?"#000":"var(--text2)",cursor:"pointer",fontWeight:form.condition===v?600:400 }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:"flex",gap:10 }}>
                <input value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} placeholder="Preço * (ex: R$ 80)"
                  style={{ flex:1,padding:"13px 16px",background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:12,fontSize:13,color:"var(--text)",outline:"none",fontFamily:"'Inter',sans-serif" }} />
                <input value={form.size} onChange={e=>setForm(f=>({...f,size:e.target.value}))} placeholder="Tam."
                  style={{ width:80,padding:"13px 14px",background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:12,fontSize:13,color:"var(--text)",outline:"none",fontFamily:"'Inter',sans-serif" }} />
              </div>

              <input value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))} placeholder="Marca (opcional)"
                style={{ width:"100%",padding:"13px 16px",background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:12,fontSize:13,color:"var(--text)",outline:"none",fontFamily:"'Inter',sans-serif" }} />
              <input value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} placeholder="Cidade * (ex: São Paulo - SP)"
                style={{ width:"100%",padding:"13px 16px",background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:12,fontSize:13,color:"var(--text)",outline:"none",fontFamily:"'Inter',sans-serif" }} />
              <input value={form.whatsapp} onChange={e=>setForm(f=>({...f,whatsapp:e.target.value}))} placeholder="WhatsApp * (ex: 5511999999999)"
                style={{ width:"100%",padding:"13px 16px",background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:12,fontSize:13,color:"var(--text)",outline:"none",fontFamily:"'Inter',sans-serif" }} />
              <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Descrição (opcional)" rows={2}
                style={{ width:"100%",padding:"13px 16px",background:"var(--surface2)",border:"1px solid var(--border2)",borderRadius:12,fontSize:13,color:"var(--text)",outline:"none",fontFamily:"'Inter',sans-serif",resize:"none" }} />
            </div>

            <button onClick={addListing} disabled={!form.title||!form.price||!form.city||!form.whatsapp}
              style={{ width:"100%",marginTop:18,padding:"15px",background:form.title&&form.price&&form.city&&form.whatsapp?"linear-gradient(135deg,var(--accent),var(--accent2))":"var(--surface3)",color:form.title&&form.price&&form.city&&form.whatsapp?"#000":"var(--text3)",border:"none",borderRadius:100,fontSize:13,cursor:form.title&&form.price&&form.city&&form.whatsapp?"pointer":"default",fontWeight:700,fontFamily:"'Syne',sans-serif" }}>
              Publicar anúncio
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUSCA & DESCOBERTA — encontrar qualquer feature rapidamente
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_FEATURES = [
  { id:"outfit",      label:"O que vestir hoje",        desc:"Sugestão de look do dia",          tab:"MeuEstilo", emoji:"👔" },
  { id:"guardaroupa", label:"Meu guarda-roupa",         desc:"Cadastrar e organizar peças",      tab:"MeuEstilo", emoji:"👗" },
  { id:"validar",     label:"Validar look",             desc:"Esse look está ok para sair?",     tab:"MeuEstilo", emoji:"🪞" },
  { id:"treino",      label:"Treino de hoje",           desc:"Treino gerado por IA",             tab:"MeuEstilo", emoji:"💪" },
  { id:"barbeiro",    label:"O que pedir ao barbeiro",  desc:"Briefing pronto para barbearia",   tab:"MeuEstilo", emoji:"✂️" },
  { id:"recomeço",     label:"Meu estilo mudou",         desc:"Emagreci, engordei, e agora?",     tab:"MeuEstilo", emoji:"🔄" },
  { id:"rotina",      label:"Rotina de 7 minutos",      desc:"Cuidado rápido do dia",            tab:"MeuEstilo", emoji:"⏱️" },
  { id:"stylist",     label:"Análise de presença",      desc:"Análise de imagem por IA",         tab:"Stylist",   emoji:"✦"  },
  { id:"chat",        label:"Coach pessoal",            desc:"Conversa com seu coach IA",        tab:"Chat",      emoji:"💬" },
  { id:"plano",       label:"Plano de 30 dias",         desc:"Seu plano personalizado",          tab:"Plano",     emoji:"📋" },
  { id:"agenda",      label:"Agenda",                   desc:"Seus compromissos",                tab:"Agenda",    emoji:"📅" },
  { id:"duplas",      label:"Dupla de evolução",        desc:"Parceiro de evolução",             tab:"Duplas",    emoji:"👥" },
  { id:"trilhas",     label:"Desafios temáticos",       desc:"Trilhas de moda e estilo",         tab:"Trilhas",   emoji:"⚡" },
  { id:"academia",    label:"Academia",                 desc:"Treino, tipo de corpo, academias",       tab:"Academia",  emoji:"🏋️" },
  { id:"barbearia",   label:"Barbearia",                desc:"Barbeiros e formato de rosto",     tab:"Barbearia", emoji:"✂️" },
  { id:"mercado",     label:"Marketplace",              desc:"Guia de Lookss e consultoria",          tab:"Mercado",   emoji:"🛍️" },
  { id:"loja",        label:"Loja afiliada",            desc:"Produtos com comissão",            tab:"Loja",      emoji:"🔗" },
  { id:"desejos",     label:"Lista de desejos",         desc:"Produtos salvos",                  tab:"Desejos",   emoji:"🤍" },
  { id:"ranking",     label:"Leaderboard",              desc:"Ranking de evolução",              tab:"Ranking",   emoji:"🏆" },
  { id:"stats",       label:"Analytics",                desc:"Seus dados de evolução",           tab:"Stats",     emoji:"📊" },
  { id:"indicar",     label:"Indicações",               desc:"Programa de referral",             tab:"Indicar",   emoji:"✉️" },
];


// ═══════════════════════════════════════════════════════════════════════════════
// PAYWALL (was missing the function definition)
// ═══════════════════════════════════════════════════════════════════════════════

function Paywall({ onClose, onUpgrade }) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState("yearly");
  const upgrade = () => { setLoading(true); setTimeout(() => { onUpgrade(); setLoading(false); }, 1800); };

  const features = [
    "Análises de presença ilimitadas",
    "Coach IA com memória",
    "Outfit do dia ilimitado",
    "Validações de look ilimitadas",
    "Consultoria de compra ilimitada",
    "Rotina personalizada semanal",
    "Relatório de evolução semanal",
    "Treinos ilimitados gerados por IA",
    "Trilhas e desafios desbloqueados",
    "Sem anúncios",
  ];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,.65)", display:"flex", alignItems:"flex-end", backdropFilter:"blur(5px)" }}>
      <div style={{ background:"var(--surface)", borderRadius:"28px 28px 0 0", width:"100%", maxWidth:480, margin:"0 auto", padding:"28px 28px 48px", animation:"slideUp .35s ease", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Icon n="crown" size={20} color="var(--accent)" />
            <span style={{ fontSize:18, fontFamily:"'Syne',sans-serif", fontWeight:600 }}>Presença Premium</span>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer" }}><Icon n="close" size={18} color="#ccc" /></button>
        </div>
        <p style={{ fontSize:13, color:"var(--text2)", marginBottom:20, lineHeight:1.5 }}>Tudo que você precisa para evoluir de verdade — sem limite.</p>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:20 }}>
          {features.map(f => (
            <div key={f} style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:12, color:"var(--text3)" }}>
              <Icon n="check" size={13} color="var(--accent)" />
              <span style={{ lineHeight:1.4 }}>{f}</span>
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          {[
            { id:"yearly",  label:"Anual",  price:"R$ 19,90/mês", sub:"Economize 40% · R$ 238/ano", highlight:true },
            { id:"monthly", label:"Mensal", price:"R$ 34,90/mês", sub:"Cancele quando quiser",      highlight:false },
          ].map(p => (
            <button key={p.id} onClick={() => setPlan(p.id)}
              style={{ flex:1, padding:"14px 10px", border:`1.5px solid ${plan===p.id?"#1a1a1a":"#ebebeb"}`, borderRadius:16, background:plan===p.id?"#1a1a1a":"#fff", cursor:"pointer", transition:"all .15s" }}>
              <div style={{ fontSize:10, letterSpacing:1, textTransform:"uppercase", color:plan===p.id?"var(--accent)":"#aaa", marginBottom:4 }}>{p.label}</div>
              <div style={{ fontSize:15, fontWeight:700, color:plan===p.id?"#fff":"#1a1a1a" }}>{p.price}</div>
              <div style={{ fontSize:9, color:plan===p.id?"#666":"#ccc", marginTop:3 }}>{p.sub}</div>
            </button>
          ))}
        </div>

        <button onClick={upgrade} disabled={loading}
          style={{ width:"100%", padding:"16px", background:"var(--surface2)", color:"#fff", border:"none", borderRadius:16, fontSize:13, fontWeight:600, letterSpacing:1, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {loading ? <><Dots color="#fff" /> Processando…</> : "✦ Assinar agora"}
        </button>
        <p style={{ fontSize:10, color:"var(--text3)", textAlign:"center", marginTop:10 }}>Simulação · sem cobrança real · cancele quando quiser</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING MELHORADO — linguagem de amigo, sem jargão
// ═══════════════════════════════════════════════════════════════════════════════

const OB_STEPS_V2 = [
  {
    key:"style",
    emoji:"👕",
    title:"Como você se veste hoje?",
    subtitle:"Sem julgamento — queremos entender de onde você está partindo.",
    options:[
      { value:"simples e limpo",    label:"Simples e básico",      desc:"Prefiro não chamar atenção. Menos é mais." },
      { value:"classico",       label:"Clássico e arrumado",   desc:"Gosto de algo mais formal e elegante." },
      { value:"contemporaneo",  label:"Moderno e variado",     desc:"Misturo estilos, gosto de novidades." },
      { value:"ousado",         label:"Chamativo e diferente", desc:"Gosto de me destacar com o visual." },
    ],
  },
  {
    key:"goal",
    emoji:"🎯",
    title:"O que você quer melhorar?",
    subtitle:"Escolha o que mais incomoda você hoje.",
    options:[
      { value:"presenca",          label:"Causar boa impressão",      desc:"Quero que as pessoas me vejam com respeito." },
      { value:"autoconhecimento",  label:"Me conhecer melhor",        desc:"Não sei bem qual é o meu estilo ainda." },
      { value:"estilo",            label:"Montar looks melhores",     desc:"Tenho roupas mas não sei combinar." },
      { value:"habitos",           label:"Criar hábitos de cuidado",  desc:"Quero me cuidar mais no dia a dia." },
    ],
  },
  {
    key:"tone",
    emoji:"🗣️",
    title:"Como prefere ser orientado?",
    subtitle:"Isso define como o coach vai falar com você.",
    options:[
      { value:"direto",      label:"Vai direto ao ponto",     desc:"Sem rodeios. Me diz o que fazer." },
      { value:"filosofico",  label:"Me faz pensar",           desc:"Gosto de refletir e entender o porquê." },
      { value:"motivador",   label:"Me anima e incentiva",    desc:"Preciso de energia e encorajamento." },
      { value:"analitico",   label:"Explica com lógica",      desc:"Quero entender os dados e o processo." },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRESS INDICATOR no Header (mostra o quanto o usuário fez hoje)
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// SHARE CARD — Viral sharing after analysis
// ═══════════════════════════════════════════════════════════════════════════════
function ShareCard({ result, type, userName }) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef();

  const isApproved = type === "validar" && result && (result.includes("APROVADO") || result.includes("aprovado"));
  
  const shareText = {
    validar: isApproved
      ? `✦ APROVADO pelo Presença!\n\nMeu look foi validado pela IA em segundos.\n\n@presenca.app #presença #estilo #look`
      : `Validei meu look no Presença e aprendi o que melhorar 🪞\n\n@presenca.app #presença #estilo`,
    outfit: `A IA do Presença montou 3 looks pra mim com o que já tenho em casa 👔✦\n\n@presenca.app #presença #outfit #moda`,
  }[type] || `Usando o Presença para evoluir meu estilo ✦\n\n@presenca.app`;

  const copyAndShare = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title:"Presença ✦", text:shareText });
        return;
      } catch {}
    }
    copyAndShare();
  };

  return (
    <div style={{ marginTop:14, background:"var(--surface)", border:"1px solid var(--border)", borderRadius:16, padding:"16px 18px", animation:"fadeIn .4s ease .2s both" }}>
      <div style={{ fontSize:10, letterSpacing:3, color:"var(--text3)", textTransform:"uppercase", marginBottom:10, fontFamily:"'Syne',sans-serif" }}>
        Compartilhar resultado
      </div>

      {/* Preview card */}
      <div style={{ background:"linear-gradient(135deg,#0a0a0a,#1a1a1a)", border:"1px solid rgba(201,169,110,.2)", borderRadius:14, padding:"16px", marginBottom:12 }}>
        <div style={{ fontSize:9, letterSpacing:4, color:"var(--accent)", textTransform:"uppercase", marginBottom:10, fontFamily:"'Syne',sans-serif" }}>✦ PRESENÇA</div>
        {type === "validar" ? (
          <>
            <div style={{ fontSize:22, fontFamily:"'Syne',sans-serif", fontWeight:800, color:isApproved?"var(--green)":"var(--red)", marginBottom:6 }}>
              {isApproved ? "APROVADO ✦" : "TEM COMO MELHORAR"}
            </div>
            <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.5 }}>Look validado pela IA · {new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize:18, fontFamily:"'Syne',sans-serif", fontWeight:700, color:"var(--text)", marginBottom:6 }}>3 looks montados ✦</div>
            <div style={{ fontSize:12, color:"var(--text2)", lineHeight:1.5 }}>Com as roupas que já tenho em casa</div>
          </>
        )}
        <div style={{ marginTop:10, fontSize:10, color:"var(--text3)" }}>@presenca.app</div>
      </div>

      {/* Hashtags */}
      <div style={{ fontSize:11, color:"var(--accent)", marginBottom:12, lineHeight:1.6, background:"rgba(201,169,110,.06)", borderRadius:10, padding:"8px 12px" }}>
        {shareText.split("\n").filter(l=>l.startsWith("#")||l.includes("@")).join(" ")}
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={copyAndShare} style={{
          flex:1, padding:"12px", background:"var(--surface2)",
          border:"1px solid var(--border)", borderRadius:100,
          fontSize:12, color:copied?"var(--green)":"var(--text2)",
          cursor:"pointer", fontWeight:500, transition:"color .2s",
          display:"flex", alignItems:"center", justifyContent:"center", gap:6
        }}>
          {copied ? (
            <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copiado!</>
          ) : (
            <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copiar</>
          )}
        </button>
        <button onClick={share} style={{
          flex:2, padding:"12px",
          background:"linear-gradient(135deg,var(--accent),var(--accent2))",
          border:"none", borderRadius:100,
          fontSize:12, color:"#000", cursor:"pointer", fontWeight:700,
          display:"flex", alignItems:"center", justifyContent:"center", gap:6,
          fontFamily:"'Syne',sans-serif"
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Compartilhar
        </button>
      </div>
    </div>
  );
}

function BottomNav({ active, setActive }) {
  const tabs = [
    { id:"Home",     icon:"sparkle", label:"Início"   },
    { id:"Loja",     icon:"shop",    label:"Loja"     },
    { id:"Brecho",   icon:"heart",   label:"Brechó"   },
    { id:"Academia", icon:"zap",     label:"Academia" },
    { id:"Eu",       icon:"user",    label:"Eu"       },
  ];
  return (
    <div style={{
      position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
      width:"100%", maxWidth:480, zIndex:100,
      padding:"0 12px 20px",
      background:"linear-gradient(to top, #0a0a0a 60%, transparent)"
    }}>
      <div style={{
        background:"rgba(18,18,18,.92)",
        backdropFilter:"blur(24px)",
        border:"1px solid rgba(255,255,255,.08)",
        borderRadius:100,
        padding:"8px 6px",
        display:"flex",
        boxShadow:"0 4px 40px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04) inset"
      }}>
        {tabs.map(t => {
          const isActive = active === t.id;
          return (
            <button key={t.id} onClick={() => setActive(t.id)} style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center",
              gap:4, padding:"8px 4px", background:"none", border:"none",
              cursor:"pointer", borderRadius:100, position:"relative",
              transition:"all .2s ease"
            }}>
              {isActive && (
                <div style={{
                  position:"absolute", inset:0, borderRadius:100,
                  background:"linear-gradient(135deg,rgba(201,169,110,.18),rgba(201,169,110,.08))",
                  border:"1px solid rgba(201,169,110,.2)"
                }} />
              )}
              <Icon n={t.icon} size={18} color={isActive ? "#c9a96e" : "#404040"} />
              <span style={{
                fontSize:9, letterSpacing:.5, textTransform:"uppercase",
                fontWeight:isActive ? 600 : 400,
                color: isActive ? "#c9a96e" : "#404040",
                fontFamily:"'Syne', sans-serif",
                position:"relative"
              }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap');

  :root {
    --bg:        #0a0a0a;
    --surface:   #111111;
    --surface2:  #1a1a1a;
    --surface3:  #242424;
    --border:    rgba(255,255,255,0.08);
    --border2:   rgba(255,255,255,0.14);
    --text:      #f0ece6;
    --text2:     #888;
    --text3:     #555;
    --accent:    #c9a96e;
    --accent2:   #e8c98a;
    --green:     #3ecf8e;
    --red:       #f87171;
    --blue:      #60a5fa;
    --purple:    #a78bfa;
    --orange:    #fb923c;
    --radius-sm: 10px;
    --radius:    16px;
    --radius-lg: 24px;
    --radius-xl: 32px;
  }

  *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }

  html,body {
    height:100%;
    background: var(--bg);
    font-family: 'Inter', sans-serif;
    color: var(--text);
    overflow-x: hidden;
  }

  textarea, input, button, select {
    font-family: 'Inter', sans-serif;
  }

  input::placeholder, textarea::placeholder {
    color: var(--text3);
  }

  input, textarea {
    background: var(--surface2) !important;
    color: var(--text) !important;
    border-color: var(--border2) !important;
  }

  input:focus, textarea:focus {
    border-color: var(--accent) !important;
    outline: none !important;
  }

  ::-webkit-scrollbar { width:0; height:0; }

  @keyframes fadeIn    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeInFast{ from{opacity:0} to{opacity:1} }
  @keyframes slideUp   { from{opacity:0;transform:translateY(50px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideDown { from{opacity:0;transform:translateY(-12px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
  @keyframes pulse     { 0%,100%{opacity:.25;transform:scale(.7)} 50%{opacity:1;transform:scale(1)} }
  @keyframes badgePop  { 0%{opacity:0;transform:translateX(-50%) scale(.5)} 70%{transform:translateX(-50%) scale(1.05)} 100%{opacity:1;transform:translateX(-50%) scale(1)} }
  @keyframes countPop  { 0%{opacity:0;transform:scale(.3)} 70%{transform:scale(1.12)} 100%{opacity:1;transform:scale(1)} }
  @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes glow      { 0%,100%{box-shadow:0 0 20px rgba(201,169,110,.15)} 50%{box-shadow:0 0 40px rgba(201,169,110,.35)} }
`;

export default function App() {
  const [user, setUser] = useState(()=>LS.get("presenca_user",null));
  const [profile, setProfile] = useState(()=>{ const u=LS.get("presenca_user",null); return u?LS.get(`presenca_profile_${u.id}`,null):null; });
  const [isPremium, setIsPremium] = useState(()=>{ const u=LS.get("presenca_user",null); return u?LS.get(`presenca_premium_${u.id}`,false):false; });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
    const [showSearch, setShowSearch]   = useState(false);
  const [activeTab, setActiveTab] = useState("Home");
  const [toastMsg, setToastMsg] = useState(null);
  const [tabVisible, setTabVisible] = useState(true);
  const [tabKey, setTabKey] = useState(0);

  const [badgeToast, setBadgeToast] = useState(null);
  // Inject global CSS
  useEffect(() => {
    let el = document.getElementById('presenca-styles');
    if (!el) { el = document.createElement('style'); el.id = 'presenca-styles'; document.head.appendChild(el); }
    el.textContent = STYLES;
  }, []);

  const { push, requestPermission } = usePushNotifications(user?.id||"guest");

  const checkBadgesAfterAction = useCallback((userId) => {
    const newBadges = checkNewBadges(userId);
    if (newBadges.length > 0) {
      setBadgeToast(newBadges[0]);
      const next = getNextBadge(userId);
      if (next && next.pct >= 0.7) {
        setTimeout(() => push("analysis_ready", `Quase lá! Badge "${next.name}"`, `${Math.round(next.pct*100)}% concluído — continue!`), 1500);
      }
    }
  }, [push]);

  const notifCount = user ? LS.get(`presenca_notifs_${user.id}`,[]).filter(n=>!n.read).length : 0;

  const toast = useCallback((msg) => setToastMsg(msg), []);

  const changeTab = useCallback((tab)=>{
    setTabVisible(false); setTimeout(()=>{ setActiveTab(tab); setTabKey(k=>k+1); setTabVisible(true); },200);
  },[]);

  // Global tab setter for cross-tab navigation
  useEffect(() => { window.__presencaSetTab = changeTab; return () => { delete window.__presencaSetTab; }; }, [changeTab]);

  const handleLogin = useCallback(async (u) => {
    setUser(u);
    const p = LS.get(`presenca_profile_${u.id}`,null);
    const prem = LS.get(`presenca_premium_${u.id}`,false);
    setProfile(p); setIsPremium(prem);
    if (!p) setShowOnboarding(true);
    // Streak
    const last = LS.get(`presenca_last_active_${u.id}`,null);
    const todayS = new Date().toDateString();
    if (last!==todayS) {
      const yest = new Date(); yest.setDate(yest.getDate()-1);
      const streak = LS.get(`presenca_streak_${u.id}`,0);
      const ns = last===yest.toDateString()?streak+1:1;
      LS.set(`presenca_streak_${u.id}`,ns); LS.set(`presenca_last_active_${u.id}`,todayS);
      if (ns>1) setTimeout(()=>push("streak","Sequência ativa!",`${ns} dias consecutivos! Continue assim.`),2000);
    }
    // Request push permission
    setTimeout(()=>requestPermission(),3000);
    // Simulate daily insight notif
    setTimeout(()=>push("daily_insight","Insight do dia","Seu insight personalizado está esperando por você."),5000);
  },[push,requestPermission]);

  const handleOnboardingDone = useCallback((answers)=>{ setProfile(answers); setShowOnboarding(false); },[]);
  const handleUpgrade = useCallback(()=>{ LS.set(`presenca_premium_${user.id}`,true); setIsPremium(true); setShowPaywall(false); toast("Bem-vindo ao Premium ✦"); },[user]);
  const handleLogout = useCallback(()=>{ LS.del("presenca_user"); setUser(null); setProfile(null); setIsPremium(false); setActiveTab("Home"); },[]);

  useEffect(()=>{ document.title="Presença ✦"; },[]);

  const tabProps = { user, profile, isPremium, onPaywall:()=>setShowPaywall(true), toast, push };

  if (!user) return (
    <>
      <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh" }}><AuthScreen onLogin={handleLogin} /></div>
    </>
  );

  if (showOnboarding) return (
    <>
      <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh" }}><Onboarding user={user} onDone={handleOnboardingDone} /></div>
    </>
  );

  return (
    <>
      {toastMsg && <Toast msg={toastMsg} onDone={()=>setToastMsg(null)} />}
      {badgeToast && <BadgeToast badge={badgeToast} onDone={()=>setBadgeToast(null)} />}
      {showPaywall && <Paywall onClose={()=>setShowPaywall(false)} onUpgrade={handleUpgrade} />}

      {showSearch && <SearchModal onClose={()=>setShowSearch(false)} setActiveTab={changeTab} />}

      <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", background:"var(--bg)" }}>
        {/* Header */}
        <div style={{
          position:"sticky", top:0, zIndex:50,
          background:"rgba(10,10,10,0.85)",
          backdropFilter:"blur(20px)",
          padding:"14px 20px 12px",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          borderBottom:"1px solid rgba(255,255,255,.05)"
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{
              fontSize:13, letterSpacing:4, fontWeight:700,
              textTransform:"uppercase", fontFamily:"'Syne', sans-serif",
              background:"linear-gradient(90deg,#c9a96e,#e8c98a)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"
            }}>Presença</span>
            {(() => {
              const todayStr = new Date().toDateString();
              const checks = [
                LS.get(`presenca_checkin_${user.id}`, null)?.date === todayStr,
                LS.get(`presenca_outfit_today_${user.id}`, null)?.date === todayStr,
                LS.get(`presenca_routine_done_${user.id}`, null) === todayStr,
                LS.get(`presenca_gym_${user.id}`, {}).lastCheckin === todayStr,
              ];
              const done = checks.filter(Boolean).length;
              if (done === 0) return null;
              return (
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  {checks.map((c, i) => (
                    <div key={i} style={{ width:6, height:6, borderRadius:3, background:c?"var(--green)":"rgba(255,255,255,.12)", transition:"background .3s" }} />
                  ))}
                </div>
              );
            })()}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <button onClick={() => setShowSearch(true)} style={{
              width:34, height:34, borderRadius:17,
              background:"rgba(255,255,255,.06)",
              border:"1px solid rgba(255,255,255,.08)",
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"
            }}>
              <Icon n="sparkle" size={14} color="#888" />
            </button>
            {isPremium
              ? <div style={{
                  display:"flex", alignItems:"center", gap:5,
                  background:"rgba(201,169,110,.12)",
                  border:"1px solid rgba(201,169,110,.25)",
                  padding:"4px 10px", borderRadius:100
                }}>
                  <Icon n="crown" size={10} color="#c9a96e" />
                  <span style={{ fontSize:9, color:"var(--accent)", letterSpacing:1.5, textTransform:"uppercase", fontWeight:600, fontFamily:"'Syne',sans-serif" }}>Premium</span>
                </div>
              : <button onClick={()=>setShowPaywall(true)} style={{
                  fontSize:9, letterSpacing:1.5, color:"var(--accent)",
                  background:"rgba(201,169,110,.1)",
                  border:"1px solid rgba(201,169,110,.2)",
                  borderRadius:100, padding:"5px 12px", cursor:"pointer",
                  textTransform:"uppercase", fontWeight:600, fontFamily:"'Syne',sans-serif"
                }}>Assinar</button>
            }
          </div>
        </div>

        {/* Tab content */}
        <div key={tabKey} style={{ opacity:tabVisible?1:0,transform:tabVisible?"none":"translateY(6px)",transition:"opacity .2s ease,transform .2s ease" }}>
          {activeTab==="Home"      && <HomeTab user={user} profile={profile} isPremium={isPremium} onPaywall={()=>setShowPaywall(true)} toast={toast} push={push} onBadgeCheck={()=>checkBadgesAfterAction(user.id)} setActiveTab={changeTab} />}
          {activeTab==="MeuEstilo" && <MeuEstiloTab {...tabProps} onBadgeCheck={()=>checkBadgesAfterAction(user.id)} />}
          {activeTab==="Loja"      && <LojaHub user={user} isPremium={isPremium} onPaywall={()=>setShowPaywall(true)} toast={toast} setTab={changeTab} />}
          {activeTab==="Brecho"    && <BrechoTab user={user} toast={toast} />}
          {activeTab==="Academia"  && <AcademiaTab {...tabProps} onBadgeCheck={()=>checkBadgesAfterAction(user.id)} />}
          {activeTab==="Barbearia" && <BarbeariaTab {...tabProps} onBadgeCheck={()=>checkBadgesAfterAction(user.id)} />}
          {activeTab==="Eu"        && <ProfileTab {...tabProps} setProfile={setProfile} onLogout={handleLogout} push={push} />}
        </div>

        <BottomNav active={activeTab} setActive={changeTab} notifCount={notifCount} />
      </div>
    </>
  );
}

