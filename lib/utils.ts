// lib/utils.ts

/**
 * Helper function for currency formatting
 * @param value - The numeric value to format
 * @param currency - The currency symbol (e.g., '$')
 * @returns Formatted currency string
 */
const formatCurrency = (value: number, currency: string = '$'): string => {
    return `${currency}${value.toFixed(2)}`;
};

/**
 * Helper function for date formatting
 * @param date - The date object to format
 * @returns Formatted date string (YYYY-MM-DD)
 */
const formatDate = (date: Date): string => {
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-based
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

/**
 * Helper function to display task status
 * @param status - The status of the task (e.g., 'completed', 'in-progress')
 * @returns Formatted status message
 */
const displayTaskStatus = (status: string): string => {
    switch (status) {
        case 'completed':
            return '✅ Task is completed';
        case 'in-progress':
            return '🔄 Task is in progress';
        case 'pending':
            return '⏳ Task is pending';
        default:
            return '❓ Unknown status';
    }
};

/**
 * Helper function for conditional class name handling
 * @param condition - Boolean value to determine class name
 * @param className - The class name to use if condition is true
 * @returns Final class name string
 */
const className = (condition: boolean, className: string): string => {
    return condition ? className : '';
};

export { formatCurrency, formatDate, displayTaskStatus, className };