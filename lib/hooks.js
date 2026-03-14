'use client';
import { useState, useEffect } from 'react';

export function useIsMobile() {
  var [mobile, setMobile] = useState(false);
  useEffect(function() {
    function check() { setMobile(window.innerWidth < 720); }
    check();
    window.addEventListener('resize', check);
    return function() { window.removeEventListener('resize', check); };
  }, []);
  return mobile;
}
