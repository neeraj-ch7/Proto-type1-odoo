const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;
const PASSWORD_MSG = 'Password must be more than 8 characters with an uppercase letter, a lowercase letter and a special character';
module.exports = { PASSWORD_REGEX, PASSWORD_MSG };
