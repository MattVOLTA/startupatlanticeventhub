// Google Tag Manager utility functions

// Define the window dataLayer
declare global {
  interface Window {
    dataLayer: any[];
  }
}

/**
 * Initialize the dataLayer array if it doesn't exist
 */
export const initDataLayer = (): void => {
  window.dataLayer = window.dataLayer || [];
};

/**
 * Push an event to the dataLayer
 * @param event - The event object to push to the dataLayer
 */
export const pushEvent = (event: Record<string, any>): void => {
  initDataLayer();
  window.dataLayer.push(event);
};

/**
 * Track a page view
 * @param pageTitle - The title of the page
 * @param pagePath - The path of the page (defaults to current path)
 */
export const trackPageView = (pageTitle: string, pagePath: string = window.location.pathname): void => {
  pushEvent({
    event: 'pageview',
    page: {
      title: pageTitle,
      path: pagePath
    }
  });
};

/**
 * Track a custom event
 * @param eventName - The name of the event
 * @param eventParams - Additional parameters for the event
 */
export const trackEvent = (eventName: string, eventParams: Record<string, any> = {}): void => {
  pushEvent({
    event: eventName,
    ...eventParams
  });
}; 