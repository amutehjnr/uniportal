/**
 * UniPortal – Global Client-Side Utilities
 * This file is loaded globally for non-EJS pages or shared logic
 */

// Format currency
window.formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
};

// Format relative time
window.timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  const intervals = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [label, secs] of intervals) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count} ${label}${count !== 1 ? 's' : ''} ago`;
  }
  return 'just now';
};

// Truncate text
window.truncate = (str, n) => str.length > n ? str.slice(0, n - 1) + '…' : str;

// Status color mapping
window.getStatusColor = (status) => {
  const map = {
    draft: 'gray', submitted: 'blue', under_review: 'yellow',
    documents_requested: 'yellow', interview_scheduled: 'blue',
    offer_extended: 'purple', accepted: 'green', rejected: 'red',
    withdrawn: 'gray', enrolled: 'green', waitlisted: 'yellow',
    pending: 'yellow', verified: 'green', active: 'green', inactive: 'gray',
  };
  return map[status] || 'gray';
};

console.log('[UniPortal] App JS loaded');
