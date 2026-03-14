'use client';
import { useMemo } from 'react';

var COLORS = ['#1D9BF0','#00BA7C','#E0245E','#F4212E','#794BC4','#FF6B35','#0096FF','#9B59B6','#1ABC9C','#E67E22'];

function colorFromName(name) {
  if (!name) return COLORS[0];
  var n = 0;
  for (var i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return COLORS[n % COLORS.length];
}

export default function Avatar({ name, size, color }) {
  var bg = color || colorFromName(name);
  var letter = (name||'?')[0].toUpperCase();
  var fs = Math.round((size||36) * 0.42);
  return (
    <div style={{ width:size||36, height:size||36, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:800, fontSize:fs, color:'#fff', userSelect:'none' }}>
      {letter}
    </div>
  );
}
