/**
 * WhatsApp Native App Launcher with Browser Fallback
 * Prioritizes launching the installed WhatsApp application on mobile (iOS/Android) 
 * and desktop (macOS/Windows). If the app is not installed, it gracefully falls back.
 */

export interface WhatsAppUrls {
  appUrl: string;
  webUrl: string;
  cleanPhone: string;
}

export const getWhatsAppUrls = (phone: string, message: string = ''): WhatsAppUrls => {
  const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
  const encoded = encodeURIComponent(message || '');
  
  // Native WhatsApp app protocol (directly launches WhatsApp app on mobile and desktop)
  const appUrl = cleanPhone 
    ? `whatsapp://send?phone=${cleanPhone}${encoded ? `&text=${encoded}` : ''}`
    : `whatsapp://send?text=${encoded}`;
  
  // Universal browser fallback (wa.me)
  const webUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}${encoded ? `?text=${encoded}` : ''}`
    : `https://wa.me/?text=${encoded}`;

  return { appUrl, webUrl, cleanPhone };
};

/**
 * Launches the native WhatsApp application.
 * If no app is installed on the user's system, falls back to the web link.
 */
export const launchWhatsApp = (phone: string, message: string = ''): void => {
  const { appUrl, webUrl } = getWhatsAppUrls(phone, message);

  // Check if mobile device
  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // On mobile devices, triggering the app protocol opens the native WhatsApp app directly
    window.location.href = appUrl;
    return;
  }

  // On desktop, try the native WhatsApp application protocol
  let appHandled = false;
  const onBlur = () => {
    appHandled = true;
  };

  window.addEventListener('blur', onBlur, { once: true });

  // Direct protocol navigation
  window.location.href = appUrl;

  // If the browser stays focused and no native app launched after 1.2s, open fallback
  setTimeout(() => {
    window.removeEventListener('blur', onBlur);
    if (!appHandled && document.hasFocus()) {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }
  }, 1200);
};
