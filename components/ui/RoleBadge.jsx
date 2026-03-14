'use client';
// Shows a Discord-style role badge beside a name
// profile: { badge_name, badge_color, badge_hidden, role }
export default function RoleBadge({ profile, small }) {
  if (!profile) return null;
  var hidden = profile.badge_hidden;
  var name = profile.badge_name;
  var color = profile.badge_color || '#1D9BF0';

  // System role fallback
  if (!name && !hidden) {
    if (profile.role === 'superadmin') { name = '⚡ Super Admin'; color = '#7C3AED'; }
    else if (profile.role === 'admin')  { name = '🛡️ Admin';      color = '#1D9BF0'; }
  }

  if (!name) return null;
  var fs = small ? 9 : 10;
  var px = small ? 5 : 7;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', padding:`1px ${px}px`, borderRadius:99, fontSize:fs, fontWeight:800, background:color+'20', color:color, verticalAlign:'middle', letterSpacing:0.3, flexShrink:0 }}>
      {name}
    </span>
  );
}
