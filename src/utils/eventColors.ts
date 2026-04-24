export const getTypeColors = (type: string) => {
  const t = type.toLowerCase();
  
  // Assaig Extra
  if (t.includes('assaig extra')) return { text: '#6366f1', bg: '#6366f115', border: '#6366f130', dark: '#4f46e5' };
  
  // Assaig General
  if (t.includes('assaig general')) return { text: '#06b6d4', bg: '#06b6d415', border: '#06b6d430', dark: '#0891b2' };
  
  // Assaig (Generic)
  if (t.includes('assaig')) return { text: '#3b82f6', bg: '#3b82f615', border: '#3b82f630', dark: '#2563eb' };
  
  // Concert
  if (t.includes('concert')) return { text: '#a855f7', bg: '#a855f715', border: '#a855f730', dark: '#9333ea' };
  
  // Boda
  if (t.includes('boda')) return { text: '#f43f5e', bg: '#f43f5e15', border: '#f43f5e30', dark: '#e11d48' };
  
  // Cercavila
  if (t.includes('cercavila')) return { text: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b30', dark: '#d97706' };
  
  // Processó / Actes religiosos
  if (t.includes('proces')) return { text: '#64748b', bg: '#64748b15', border: '#64748b30', dark: '#475569' };
  
  // Altres / Reunió
  if (t.includes('altres') || t.includes('reunio')) return { text: '#10b981', bg: '#10b98115', border: '#10b98130', dark: '#059669' };
  
  // Default for Actuació or unknown
  return { text: '#d44211', bg: '#d4421105', border: '#d4421110', dark: '#d44211' };
};
