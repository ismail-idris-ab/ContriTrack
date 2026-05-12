export const AVATAR_COLORS = [
  ['#4f46e5', '#7c3aed'],
  ['#059669', '#0d9488'],
  ['#d97706', '#b45309'],
  ['#e11d48', '#be123c'],
  ['#0ea5e9', '#0284c7'],
];

export const getAvatarGradient = (name = '') => {
  const i = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return `linear-gradient(135deg, ${AVATAR_COLORS[i][0]}, ${AVATAR_COLORS[i][1]})`;
};

export const getInitials = (name = '') =>
  name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
