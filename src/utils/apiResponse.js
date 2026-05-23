'use strict';

/**
 * Standardised API response helpers
 */

function success(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

function created(res, data, message = 'Created successfully') {
  return success(res, data, message, 201);
}

function paginated(res, data, pagination, message = 'Success') {
  return res.status(200).json({ success: true, message, data, pagination });
}

function error(res, message = 'An error occurred', statusCode = 500, errors = []) {
  return res.status(statusCode).json({ success: false, message, errors });
}

module.exports = { success, created, paginated, error };
