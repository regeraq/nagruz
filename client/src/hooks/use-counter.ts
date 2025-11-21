import { useEffect } from 'react';

export function useCounter() {
  useEffect(() => {
    const counters = document.querySelectorAll('.counter');
    
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target') || '0');
      let current = 0;
      const increment = target / 60;
      
      const updateCount = () => {
        current += increment;
        if (current < target) {
          counter.textContent = Math.floor(current).toString();
          requestAnimationFrame(updateCount);
        } else {
          counter.textContent = target.toString();
        }
      };
      
      updateCount();
    });
  }, []);
}
