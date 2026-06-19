/**
 * Shared validation logic for passwords
 */

/**
 * Validates a password against several security rules
 * @param {string} password - The password string to validate
 * @returns {object} - Object containing boolean flags for each rule
 */
export const validatePassword = (password) => {
    return {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
}

/**
 * Checks if all password rules are satisfied
 * @param {object} validationResults - The result from validatePassword
 * @returns {boolean}
 */
export const isPasswordStrong = (validationResults) => {
    return Object.values(validationResults).every(v => v === true)
}
