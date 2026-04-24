export const getTypeColors = (type: string) => {
  const t = type.toLowerCase();
  
  // Specific Rehearsals
  if (t.includes('assaig cambra')) return { text: '#6366f1', bg: '#6366f115', border: '#6366f130', dark: '#4f46e5' };
  if (t.includes('assaig colleta')) return { text: '#0ea5e9', bg: '#0ea5e915', border: '#0ea5e930', dark: '#0284c7' };
  if (t.includes('assaig general')) return { text: '#06b6d4', bg: '#06b6d415', border: '#06b6d430', dark: '#0891b2' };
  if (t.includes('assaig extra')) return { text: '#8b5cf6', bg: '#8b5cf615', border: '#8b5cf630', dark: '#7c3aed' };
  
  // Generic Rehearsal fallback
  if (t.includes('assaig')) return { text: '#3b82f6', bg: '#3b82f615', border: '#3b82f630', dark: '#2563eb' };
  
  // Performance types
  if (t.includes('concert')) return { text: '#a855f7', bg: '#a855f715', border: '#a855f730', dark: '#9333ea' };
  if (t.includes('intercanvi')) return { text: '#f43f5e', bg: '#f43f5e15', border: '#f43f5e30', dark: '#e11d48' };
  if (t.includes('boda')) return { text: '#ec4899', bg: '#ec489915', border: '#ec489930', dark: '#db2777' };
  if (t.includes('cercavila')) return { text: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b30', dark: '#d97706' };
  if (t.includes('proces')) return { text: '#64748b', bg: '#64748b15', border: '#64748b30', dark: '#475569' };
  
  // Admin / Meetings
  if (t.includes('reunio') || t.includes('junta')) return { text: '#10b981', bg: '#10b98115', border: '#10b98130', dark: '#059669' };
  
  // Default for Actuació or unknown
  return { text: '#d44211', bg: '#d4421105', border: '#d4421110', dark: '#d44211' };
};
