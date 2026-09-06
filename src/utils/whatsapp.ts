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
 * Launches the native WhatsApp application using the custom protocol scheme.
 * Strictly triggers the native application (iOS, Android, macOS, Windows)
 * without secondary automatic redirects to WhatsApp Web in the browser.
 */
export const launchWhatsApp = (phone: string, message: string = ''): void => {
  const { appUrl } = getWhatsAppUrls(phone, message);

  try {
    // Dispatch protocol navigation via a clean element dispatch
    const link = document.createElement('a');
    link.href = appUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch {
    // Fallback to direct location assignment if element dispatch fails
    window.location.href = appUrl;
  }
};

/**
 * Optional explicit launcher for browser-based WhatsApp (wa.me)
 * only invoked when the user deliberately requests web access.
 */
export const openWhatsAppWeb = (phone: string, message: string = ''): void => {
  const { webUrl } = getWhatsAppUrls(phone, message);
  window.open(webUrl, '_blank', 'noopener,noreferrer');
};
