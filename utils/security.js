const secureUtils = {
  filterSensitiveFields: (data, allowedFields) => {
    const filtered = {};
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  },

  filterBlockedFields: (data, blockedFields) => {
    const filtered = {};
    for (const [key, value] of Object.entries(data)) {
      if (!blockedFields.includes(key)) {
        filtered[key] = value;
      }
    }
    return filtered;
  },

  USER_PROFILE_ALLOWED: ['username', 'email', 'bio', 'avatar'],
  USER_SETTINGS_ALLOWED: ['theme', 'primaryColor', 'cardView'],
  USER_INVENTORY_ALLOWED: ['quantity', 'value', 'isFavorite', 'notes', 'acquisitionSource', 'acquisitionPrice', 'acquisitionDate'],
  GROUP_CHAT_ALLOWED: ['name', 'description', 'icon', 'isPublic', 'maxMembers', 'settings'],

  SENSITIVE_USER_FIELDS: ['password', 'role', 'level', 'exp', 'points', 'totalCheckIns', 'lastCheckInDate', 'createdAt', 'updatedAt']
};

module.exports = secureUtils;
